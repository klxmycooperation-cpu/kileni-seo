import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const delivery = vi.hoisted(() => ({ email: vi.fn(), telegram: vi.fn() }));
vi.mock("../../src/lib/notifications/email", () => ({ sendEmail: delivery.email }));
vi.mock("../../src/lib/notifications/telegram", () => ({ notifyTelegram: delivery.telegram }));

let previous: NodeJS.ProcessEnv;
let db: typeof import("../../src/db/client");
let notify: typeof import("../../src/lib/notifications/submission");
let route: typeof import("../../app/api/admin/notifications/route");

beforeAll(async () => {
  previous = { ...process.env };
  const directory = mkdtempSync(join(tmpdir(), "kileni-admin-mail-"));
  Object.assign(process.env, {
    DATABASE_PATH: join(directory, "test.sqlite"), TURSO_DATABASE_URL: "", TURSO_AUTH_TOKEN: "", VERCEL: "",
    ADMIN_NOTIFICATION_EMAIL: "owner@example.test", ADMIN_LOGIN: "notification-test-admin",
    ADMIN_SESSION_SECRET: "notification-test-secret-with-at-least-32-characters",
  });
  vi.resetModules();
  db = await import("../../src/db/client");
  notify = await import("../../src/lib/notifications/submission");
  route = await import("../../app/api/admin/notifications/route");
});

beforeEach(() => {
  delivery.email.mockReset().mockResolvedValue({ sent: true });
  delivery.telegram.mockReset().mockResolvedValue({ sent: false, reason: "not_configured" });
});

afterAll(async () => {
  await db?.closeDatabaseConnections();
  process.env = previous;
});

describe("письмо владельцу о новом обращении", () => {
  it("передаёт письмо указанному получателю и сохраняет отдельный результат отправки", async () => {
    await notify.notifySubmission({ entityType: "lead", entityId: "mail-lead", text: "Новая заявка\nУслуга: SEO-аудит\nAdmin: /admin/leads/mail-lead" });
    expect(delivery.email.mock.calls[0][0]).toMatchObject({ to: "owner@example.test", subject: "KILENI: Новая заявка" });
    const result = await db.database.execute("SELECT channel,status FROM notification_events WHERE entity_id='mail-lead'");
    expect(result.rows).toEqual([expect.objectContaining({ channel: "admin_email", status: "sent" })]);
  });

  it("отправляет письмо даже при сбое Telegram и регистрирует отказ SMTP", async () => {
    delivery.telegram.mockRejectedValue(new Error("telegram_failed"));
    delivery.email.mockResolvedValue({ sent: false, reason: "smtp_EAUTH_535" });
    await expect(notify.notifySubmission({ entityType: "brief", entityId: "mail-brief", text: "Новый бриф" })).resolves.toBeUndefined();
    const result = await db.database.execute("SELECT channel,status,error FROM notification_events WHERE entity_id='mail-brief'");
    expect(result.rows).toEqual([expect.objectContaining({ channel: "admin_email", status: "failed", error: "smtp_EAUTH_535" })]);
  });

  it("не отправляет письмо, когда получатель отсутствует или задан некорректно", async () => {
    for (const value of ["", "owner@example.test,other@example.test", "owner@example.test\nBcc: other@example.test"]) {
      process.env.ADMIN_NOTIFICATION_EMAIL = value;
      await notify.notifySubmission({ entityType: "audit", entityId: "mail-audit", text: "Новый SEO-аудит" });
    }
    expect(delivery.email).not.toHaveBeenCalled();
    process.env.ADMIN_NOTIFICATION_EMAIL = "owner@example.test";
  });

  it("не отдаёт сводку без входа администратора", async () => {
    const response = await route.GET(new Request("http://localhost:3107/api/admin/notifications"));
    expect(response.status).toBe(401);
    expect(await response.json()).not.toHaveProperty("latest");
  });

  it("отдаёт сводку с запретом кеширования после входа администратора", async () => {
    const { createAdminSession, adminCookieName } = await import("../../src/lib/security/session");
    const response = await route.GET(new Request("http://localhost:3107/api/admin/notifications", {
      headers: { cookie: `${adminCookieName}=${createAdminSession("notification-test-admin")}` },
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toMatchObject({ newCount: 0, latest: [] });
  });
});
