import Database from "better-sqlite3";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { migrationSql } from "../../src/db/migrations";
import { consumeRateLimit } from "../../src/lib/security/rate-limit";

let database: Database.Database;
let databasePath: string;
let temporaryDirectory: string;

beforeEach(() => {
  temporaryDirectory = mkdtempSync(join(tmpdir(), "kileni-free-audit-usage-"));
  databasePath = join(temporaryDirectory, "kileni.sqlite");
  database = new Database(databasePath);
  database.pragma("journal_mode = WAL");
  database.pragma("busy_timeout = 5000");
  database.exec(migrationSql);
});

afterEach(() => {
  database.close();
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe("free audit usage metric", () => {
  it("starts at zero instead of presenting a fixed baseline", async () => {
    const { getFreeAuditUsageCount } = await import("../../src/db/public-metrics");
    expect(getFreeAuditUsageCount(database)).toBe(0);
  });

  it("counts unique normalized domains only after a successful completed audit", async () => {
    const { getFreeAuditUsageCount } = await import("../../src/db/public-metrics");
    insertAudit(database, { id: "queued", domain: "queued.example", status: "queued", pagesChecked: 0 });
    insertAudit(database, { id: "partial", domain: "partial.example", status: "partial", pagesChecked: 7 });
    insertAudit(database, { id: "completed-a", domain: "shop.example", status: "completed", pagesChecked: 4 });
    insertAudit(database, { id: "completed-a-repeat", domain: "shop.example", status: "completed", pagesChecked: 8 });
    insertAudit(database, { id: "completed-b", domain: "catalog.example", status: "completed", pagesChecked: 1 });

    expect(getFreeAuditUsageCount(database)).toBe(2);
  });

  it("excludes fixture and automated test audits from the public count", async () => {
    const { getFreeAuditUsageCount } = await import("../../src/db/public-metrics");
    insertAudit(database, { id: "real", domain: "real-business.example", status: "completed", pagesChecked: 3 });
    insertAudit(database, { id: "playwright", domain: "browser-check.example", status: "completed", pagesChecked: 3, source: "playwright" });
    insertAudit(database, { id: "integration", domain: "integration.example", status: "completed", pagesChecked: 3, source: "integration-test" });
    insertAudit(database, { id: "reserved", domain: "fixture.test", status: "completed", pagesChecked: 3 });

    expect(getFreeAuditUsageCount(database)).toBe(1);
  });

  it("does not move when rate-limit attempts are consumed or rejected", async () => {
    const { getFreeAuditUsageCount } = await import("../../src/db/public-metrics");
    const before = getFreeAuditUsageCount(database);
    const rule = { windowMs: 60_000, limit: 1 };

    expect(consumeRateLimit(database, "audit:test", rule, 1_000).allowed).toBe(true);
    expect(consumeRateLimit(database, "audit:test", rule, 1_001).allowed).toBe(false);

    expect(getFreeAuditUsageCount(database)).toBe(before);
  });

  it("records a domain when an audit transitions to completed", async () => {
    const { getFreeAuditUsageCount } = await import("../../src/db/public-metrics");
    insertAudit(database, { id: "transition", domain: "transition.example", status: "queued", pagesChecked: 0 });

    database.prepare(`UPDATE audits
      SET status='completed', completed_at=?, pages_checked=3, pages_discovered=3, updated_at=?
      WHERE id='transition'`).run(Date.now(), Date.now());

    expect(getFreeAuditUsageCount(database)).toBe(1);
  });

  it("keeps the historical unique-domain total after audit retention cleanup", async () => {
    const { getFreeAuditUsageCount } = await import("../../src/db/public-metrics");
    insertAudit(database, { id: "retained", domain: "retained.example", status: "completed", pagesChecked: 2 });
    expect(getFreeAuditUsageCount(database)).toBe(1);

    database.prepare("DELETE FROM audits WHERE id='retained'").run();

    expect(getFreeAuditUsageCount(database)).toBe(1);
  });
});

function insertAudit(connection: Database.Database, input: {
  id: string;
  domain: string;
  status: "queued" | "partial" | "completed";
  pagesChecked: number;
  source?: string;
}): void {
  const now = Date.now();
  connection.prepare(`INSERT INTO audits(
    id, public_token, original_url, normalized_domain, locale, name, contact, contact_type, status,
    created_at, completed_at, pages_discovered, pages_checked, page_limit, partial, ip_hash, user_agent_hash, source,
    consent_version, updated_at
  ) VALUES (?, ?, ?, ?, 'ru', 'Тест', 'test@example.com', 'email', ?, ?, ?, ?, ?, 100, ?, 'ip', 'ua', ?, 'test-v1', ?)`)
    .run(
      input.id,
      `token-${input.id}`,
      `https://${input.domain}/`,
      input.domain,
      input.status,
      now,
      input.status === "completed" ? now : null,
      input.pagesChecked,
      input.pagesChecked,
      input.status === "partial" ? 1 : 0,
      input.source ?? "free-audit-page",
      now,
    );
}
