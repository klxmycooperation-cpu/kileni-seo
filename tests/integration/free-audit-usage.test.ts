import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type AppDatabase = typeof import("../../src/db/client")["database"];
type UsageMetric = typeof import("../../src/db/public-metrics")["getFreeAuditUsageCount"];
type RateLimit = typeof import("../../src/lib/security/rate-limit")["consumeRateLimit"];

let database: AppDatabase;
let closeDatabaseConnections: typeof import("../../src/db/client")["closeDatabaseConnections"];
let getFreeAuditUsageCount: UsageMetric;
let consumeRateLimit: RateLimit;
let temporaryDirectory: string;
let previousDatabasePath: string | undefined;

beforeEach(async () => {
  temporaryDirectory = mkdtempSync(join(tmpdir(), "kileni-free-audit-usage-"));
  previousDatabasePath = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = join(temporaryDirectory, "kileni.sqlite");
  delete process.env.TURSO_DATABASE_URL;
  delete process.env.TURSO_AUTH_TOKEN;
  vi.resetModules();

  ({ database, closeDatabaseConnections } = await import("../../src/db/client"));
  ({ getFreeAuditUsageCount } = await import("../../src/db/public-metrics"));
  ({ consumeRateLimit } = await import("../../src/lib/security/rate-limit"));
});

afterEach(async () => {
  await closeDatabaseConnections();
  if (previousDatabasePath === undefined) delete process.env.DATABASE_PATH;
  else process.env.DATABASE_PATH = previousDatabasePath;
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe("free audit usage metric", () => {
  it("starts with no pages above the configured public baseline", async () => {
    expect(await getFreeAuditUsageCount()).toBe(0);
  });

  it("adds the checked page count once for every completed job and caps it at ten", async () => {
    await insertAudit({ id: "queued", domain: "queued.example", status: "queued", pagesChecked: 0 });
    await insertAudit({ id: "partial", domain: "partial.example", status: "partial", pagesChecked: 7 });
    await insertAudit({ id: "completed-a", domain: "shop.example", status: "completed", pagesChecked: 4 });
    await insertAudit({ id: "completed-a-repeat", domain: "shop.example", status: "completed", pagesChecked: 8 });
    await insertAudit({ id: "completed-b", domain: "catalog.example", status: "completed", pagesChecked: 14 });

    expect(await getFreeAuditUsageCount()).toBe(29);
  });

  it("excludes fixture and automated test audits from the public page count", async () => {
    await insertAudit({ id: "real", domain: "real-business.example", status: "completed", pagesChecked: 3 });
    await insertAudit({ id: "playwright", domain: "browser-check.example", status: "completed", pagesChecked: 3, source: "playwright" });
    await insertAudit({ id: "integration", domain: "integration.example", status: "completed", pagesChecked: 3, source: "integration-test" });
    await insertAudit({ id: "reserved", domain: "fixture.test", status: "completed", pagesChecked: 3 });

    expect(await getFreeAuditUsageCount()).toBe(3);
  });

  it("does not move when rate-limit attempts are consumed or rejected", async () => {
    const before = await getFreeAuditUsageCount();
    const rule = { windowMs: 60_000, limit: 1 };

    expect((await consumeRateLimit("audit:test", rule, 1_000)).allowed).toBe(true);
    expect((await consumeRateLimit("audit:test", rule, 1_001)).allowed).toBe(false);

    expect(await getFreeAuditUsageCount()).toBe(before);
  });

  it("records a job when an audit transitions to completed only once", async () => {
    await insertAudit({ id: "transition", domain: "transition.example", status: "queued", pagesChecked: 0 });

    await database.execute({
      sql: "UPDATE audits SET status='completed', completed_at=?, pages_checked=3, pages_discovered=3, updated_at=? WHERE id='transition'",
      args: [Date.now(), Date.now()],
    });
    expect(await getFreeAuditUsageCount()).toBe(3);

    await database.execute({
      sql: "UPDATE audits SET status='completed', completed_at=?, pages_checked=8, pages_discovered=8, updated_at=? WHERE id='transition'",
      args: [Date.now(), Date.now()],
    });
    expect(await getFreeAuditUsageCount()).toBe(3);
  });

  it("keeps the historical page total after audit retention cleanup", async () => {
    await insertAudit({ id: "retained", domain: "retained.example", status: "completed", pagesChecked: 2 });
    expect(await getFreeAuditUsageCount()).toBe(2);

    await database.execute({ sql: "DELETE FROM audits WHERE id='retained'" });

    expect(await getFreeAuditUsageCount()).toBe(2);
  });
});

async function insertAudit(input: {
  id: string;
  domain: string;
  status: "queued" | "partial" | "completed";
  pagesChecked: number;
  source?: string;
}): Promise<void> {
  const now = Date.now();
  await database.execute({
    sql: `INSERT INTO audits(
      id, public_token, original_url, normalized_domain, locale, name, contact, contact_type, status,
      created_at, completed_at, pages_discovered, pages_checked, page_limit, partial, ip_hash, user_agent_hash, source,
      consent_version, updated_at
    ) VALUES (?, ?, ?, ?, 'ru', 'Тест', 'test@example.com', 'email', ?, ?, ?, ?, ?, 100, ?, 'ip', 'ua', ?, 'test-v1', ?)`,
    args: [
      input.id,
      `token-${input.id}`,
      `https://${input.domain}/`,
      input.domain,
      input.status,
      now,
      input.status === "queued" ? null : now,
      input.pagesChecked,
      input.pagesChecked,
      input.status === "partial" ? 1 : 0,
      input.source ?? "free-audit-page",
      now,
    ],
  });
}
