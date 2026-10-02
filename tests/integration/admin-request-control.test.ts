import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let temporaryDirectory = "";
let previousDatabasePath: string | undefined;
let db: typeof import("../../src/db/client");
let admin: typeof import("../../app/admin/_lib/data");

beforeAll(async () => {
  temporaryDirectory = mkdtempSync(join(tmpdir(), "kileni-admin-requests-"));
  previousDatabasePath = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = join(temporaryDirectory, "kileni.sqlite");
  process.env.TURSO_DATABASE_URL = "";
  process.env.TURSO_AUTH_TOKEN = "";
  process.env.VERCEL = "";
  vi.resetModules();
  db = await import("../../src/db/client");
  admin = await import("../../app/admin/_lib/data");

  db.sqlite.prepare(`INSERT INTO leads(id,name,contact,contact_type,target,service,comment,status,locale,source,page_url,utm_json,consent_version,ip_hash,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    "lead-new", "Анна", "anna@example.test", "email", "anna.example", "seo", "", "new", "ru", "service-form", "/seo", null, "v1", "hash", 3_000,
  );
  db.sqlite.prepare(`INSERT INTO brief_submissions(id,name,contact,locale,service,answers_json,status,consent_version,ip_hash,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
    "brief-closed", "Илья", "+79990000000", "ru", "web-development", "{}", "won", "v1", "hash", 2_000,
  );
  db.sqlite.prepare(`INSERT INTO audits(id,public_token,original_url,normalized_domain,locale,name,contact,contact_type,status,created_at,pages_discovered,pages_checked,page_limit,partial,ip_hash,user_agent_hash,source,consent_version,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    "audit-new", "audit-public-token", "https://audit.example", "audit.example", "ru", "Олег", "oleg@example.test", "email", "queued", 1_000, 0, 0, 10, 0, "hash", "agent", "free-audit", "v1", 1_000,
  );
  db.sqlite.prepare(`INSERT INTO leads(id,name,contact,contact_type,target,service,comment,status,locale,source,page_url,utm_json,consent_version,ip_hash,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    "lead-qa", "QA", "qa@example.test", "email", "qa.example", "seo", "", "new", "ru", "service-form", "/seo", null, "v1", "hash", 4_000,
  );
  db.sqlite.prepare("INSERT INTO admin_entity_metadata(entity_type,entity_id,qa_label,updated_at) VALUES (?,?,?,?)")
    .run("lead", "lead-qa", "Автотест", 4_000);
  db.sqlite.prepare(`INSERT INTO notification_events(id,entity_type,entity_id,channel,status,error,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?)`).run("notify-lead", "lead", "lead-new", "telegram", "sent", null, 3_100, 3_100);
  db.sqlite.prepare(`INSERT INTO notification_events(id,entity_type,entity_id,channel,status,error,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?)`).run("notify-brief", "brief", "brief-closed", "telegram", "failed", "telegram_failed", 2_100, 2_100);
});

afterAll(async () => {
  await db?.closeDatabaseConnections();
  if (previousDatabasePath === undefined) delete process.env.DATABASE_PATH;
  else process.env.DATABASE_PATH = previousDatabasePath;
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe("единый контроль обращений", () => {
  it("объединяет реальные записи, сортирует их и показывает состояние уведомления", async () => {
    const result = await admin.adminRequestCenter({});

    expect(result.map((item) => `${item.entityType}:${item.id}`)).toEqual([
      "lead:lead-new",
      "brief:brief-closed",
      "audit:audit-new",
    ]);
    expect(result[0]).toMatchObject({ name: "Анна", notificationChannel: "telegram", notificationStatus: "sent" });
    expect(result[1]).toMatchObject({ notificationStatus: "failed", notificationError: "telegram_failed" });
  });

  it("фильтрует обращения по типу и рабочему состоянию", async () => {
    await expect(admin.adminRequestCenter({ entityType: "brief" })).resolves.toEqual([
      expect.objectContaining({ id: "brief-closed", entityType: "brief" }),
    ]);
    await expect(admin.adminRequestCenter({ state: "new" })).resolves.toEqual([
      expect.objectContaining({ id: "lead-new" }),
      expect.objectContaining({ id: "audit-new" }),
    ]);
    await expect(admin.adminRequestCenter({ state: "notification_failed" })).resolves.toEqual([
      expect.objectContaining({ id: "brief-closed" }),
    ]);
  });

  it("возвращает отдельные счётчики новых обращений и ошибок уведомлений", async () => {
    await expect(admin.adminAttentionSummary()).resolves.toEqual({
      newCount: 2,
      failedNotificationCount: 1,
      attentionCount: 3,
    });
  });

  it("не скрывает ошибку письма KILENI после успешного уведомления в другом канале", async () => {
    db.sqlite.prepare(`INSERT INTO notification_events(id,entity_type,entity_id,channel,status,error,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?)`).run("notify-admin-email", "lead", "lead-new", "admin_email", "failed", "smtp_failed", 3_050, 3_050);

    const failed = await admin.adminRequestCenter({ state: "notification_failed" });
    expect(failed.map((item) => item.id)).toContain("lead-new");
    expect(await admin.adminAttentionSummary()).toMatchObject({ failedNotificationCount: 2, attentionCount: 3 });
  });

  it("считает обращение с несколькими ошибками один раз и убирает исправленную ошибку", async () => {
    db.sqlite.prepare(`INSERT INTO notification_events(id,entity_type,entity_id,channel,status,error,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?)`).run("notify-admin-email-retry", "lead", "lead-new", "admin_email", "sent", null, 3_200, 3_200);
    expect(await admin.adminAttentionSummary()).toMatchObject({ newCount: 2, failedNotificationCount: 1, attentionCount: 3 });
  });

  it("возвращает безопасную сводку для живых оповещений без контактов клиентов", async () => {
    const snapshot = await admin.adminNotificationSnapshot();
    expect(snapshot).toMatchObject({ newCount: 2, failedNotificationCount: 1 });
    expect(snapshot.latest).toEqual([
      { id: "lead-new", entityType: "lead", createdAt: 3_000 },
      { id: "brief-closed", entityType: "brief", createdAt: 2_000 },
      { id: "audit-new", entityType: "audit", createdAt: 1_000 },
    ]);
    expect(JSON.stringify(snapshot)).not.toContain("anna@example.test");
  });
});
