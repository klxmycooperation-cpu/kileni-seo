import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type Database from "better-sqlite3";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { migrationSql } from "../../src/db/migrations";

type CreateAuditRecord = typeof import("../../src/db/queries")["createAuditRecord"];
type CompleteAuditRecord = typeof import("../../src/db/queries")["completeAuditRecord"];
type FailStaleAudits = typeof import("../../src/db/queries")["failStaleAudits"];
type RateLimit = typeof import("../../src/lib/security/rate-limit")["consumeRateLimit"];
type PurgeRateLimits = typeof import("../../src/lib/security/rate-limit")["purgeExpiredRateLimits"];
type ClearRateLimits = typeof import("../../src/lib/security/rate-limit")["clearRateLimits"];
type ReadAdminEntityMetadata = typeof import("../../src/db/admin-entity-metadata")["readAdminEntityMetadata"];
type UpdateAdminEntityMetadata = typeof import("../../src/db/admin-entity-metadata")["updateAdminEntityMetadata"];
type AdminAuditList = typeof import("../../app/admin/_lib/data")["adminAuditList"];
type AdminLeadList = typeof import("../../app/admin/_lib/data")["adminLeadList"];
type AdminBriefList = typeof import("../../app/admin/_lib/data")["adminBriefList"];

let sqlite: Database.Database;
let closeDatabaseConnections: typeof import("../../src/db/client")["closeDatabaseConnections"];
let createAuditRecord: CreateAuditRecord;
let completeAuditRecord: CompleteAuditRecord;
let failStaleAudits: FailStaleAudits;
let consumeRateLimit: RateLimit;
let purgeExpiredRateLimits: PurgeRateLimits;
let clearRateLimits: ClearRateLimits;
let readAdminEntityMetadata: ReadAdminEntityMetadata;
let updateAdminEntityMetadata: UpdateAdminEntityMetadata;
let adminAuditList: AdminAuditList;
let adminLeadList: AdminLeadList;
let adminBriefList: AdminBriefList;
let temporaryDirectory: string;
let previousDatabasePath: string | undefined;

beforeAll(async () => {
  temporaryDirectory = mkdtempSync(join(tmpdir(), "kileni-sqlite-test-"));
  previousDatabasePath = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = join(temporaryDirectory, "kileni.sqlite");
  vi.resetModules();

  ({ sqlite, closeDatabaseConnections } = await import("../../src/db/client"));
  sqlite.exec(migrationSql);
  ({ createAuditRecord, completeAuditRecord, failStaleAudits } = await import("../../src/db/queries"));
  ({ readAdminEntityMetadata, updateAdminEntityMetadata } = await import("../../src/db/admin-entity-metadata"));
  ({ adminAuditList, adminLeadList, adminBriefList } = await import("../../app/admin/_lib/data"));
  ({ consumeRateLimit, purgeExpiredRateLimits, clearRateLimits } = await import("../../src/lib/security/rate-limit"));
});

afterAll(async () => {
  await closeDatabaseConnections();
  if (previousDatabasePath === undefined) delete process.env.DATABASE_PATH;
  else process.env.DATABASE_PATH = previousDatabasePath;
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe("public audit tokens", () => {
  it("creates unique URL-safe tokens carrying 32 bytes of entropy", async () => {
    const tokens: string[] = [];
    for (let index = 0; index < 64; index += 1) {
      const audit = await createAuditRecord({
        originalUrl: `https://site-${index}.example/`,
        normalizedDomain: `site-${index}.example`,
        locale: "ru",
        name: "Тест",
        contact: "test@example.com",
        contactType: "email",
        ipHash: "ip",
        userAgentHash: "ua",
        source: "test",
        consentVersion: "test-v1",
      });
      tokens.push(audit.publicToken);
    }

    expect(new Set(tokens)).toHaveLength(tokens.length);
    for (const token of tokens) {
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/u);
      expect(Buffer.from(token, "base64url")).toHaveLength(32);
    }
  });
});

describe("SQLite rate limiting", () => {
  it("counts within a fixed window, blocks at the limit and resets on the boundary", async () => {
    const rule = { windowMs: 1_000, limit: 3 };

    expect(await consumeRateLimit("lead:198.51.100.7", rule, 1_000)).toEqual({
      allowed: true,
      remaining: 2,
      retryAfterMs: 0,
    });
    expect((await consumeRateLimit("lead:198.51.100.7", rule, 1_050)).remaining).toBe(1);
    expect((await consumeRateLimit("lead:198.51.100.7", rule, 1_100)).remaining).toBe(0);
    expect(await consumeRateLimit("lead:198.51.100.7", rule, 1_100)).toEqual({
      allowed: false,
      remaining: 0,
      retryAfterMs: 900,
    });
    expect(await consumeRateLimit("lead:198.51.100.7", rule, 2_000)).toEqual({
      allowed: true,
      remaining: 2,
      retryAfterMs: 0,
    });
  });

  it("keeps independent counters for distinct keys", async () => {
    const rule = { windowMs: 1_000, limit: 1 };

    expect((await consumeRateLimit("audit:first", rule, 5_000)).allowed).toBe(true);
    expect((await consumeRateLimit("audit:first", rule, 5_001)).allowed).toBe(false);
    expect((await consumeRateLimit("audit:second", rule, 5_001)).allowed).toBe(true);
  });

  it("purges obsolete counters without affecting a fresh request", async () => {
    await consumeRateLimit("obsolete:test", { windowMs: 1_000, limit: 1 }, 10);
    expect(await purgeExpiredRateLimits(24 * 60 * 60 * 1_000, 2 * 24 * 60 * 60 * 1_000)).toBeGreaterThan(0);
    expect((await consumeRateLimit("obsolete:test", { windowMs: 1_000, limit: 1 }, 2 * 24 * 60 * 60 * 1_000)).allowed).toBe(true);
  });

  it("clears all failed-login windows for one successful identity", async () => {
    const prefix = "admin-login:test-ip";
    await consumeRateLimit(`${prefix}:15m`, { windowMs: 1_000, limit: 1 }, 10);
    await consumeRateLimit(`${prefix}:day`, { windowMs: 10_000, limit: 1 }, 10);
    expect((await consumeRateLimit(`${prefix}:15m`, { windowMs: 1_000, limit: 1 }, 11)).allowed).toBe(false);

    expect(await clearRateLimits([`${prefix}:15m`, `${prefix}:day`])).toBe(2);
    expect((await consumeRateLimit(`${prefix}:15m`, { windowMs: 1_000, limit: 1 }, 12)).allowed).toBe(true);
    expect((await consumeRateLimit(`${prefix}:day`, { windowMs: 10_000, limit: 1 }, 12)).allowed).toBe(true);
  });
});

describe("stale audit recovery", () => {
  it("fails abandoned work and releases its domain lock", async () => {
    const audit = await createAuditRecord({
      originalUrl: "https://stale.example/",
      normalizedDomain: "stale.example",
      locale: "ru",
      name: "Тест",
      contact: "test@example.com",
      contactType: "email",
      ipHash: "ip",
      userAgentHash: "ua",
      source: "integration-test",
      consentVersion: "test-v1",
    });
    sqlite.prepare("UPDATE audits SET status='crawling_pages', updated_at=1 WHERE id=?").run(audit.id);
    sqlite.prepare("INSERT INTO audit_domain_locks(normalized_domain,audit_id,created_at) VALUES (?,?,1)").run("stale.example", audit.id);

    expect(await failStaleAudits(5 * 60 * 1_000, 1_000_000)).toBe(1);
    expect(sqlite.prepare("SELECT status FROM audits WHERE id=?").get(audit.id)).toMatchObject({ status: "failed" });
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM audit_domain_locks WHERE audit_id=?").get(audit.id)).toMatchObject({ count: 0 });
  });
});

describe("admin entity metadata", () => {
  it("stores an explicit QA label and a real offer snapshot without changing legacy audit columns", async () => {
    const audit = await createAuditRecord({
      originalUrl: "https://qa-labelled.example/",
      normalizedDomain: "qa-labelled.example",
      locale: "ru",
      name: "QA",
      contact: "qa@example.com",
      contactType: "email",
      ipHash: "ip",
      userAgentHash: "ua",
      source: "playwright-fixture",
      consentVersion: "test-v1",
      qaLabel: "Playwright · полный путь брифа",
      offerSnapshot: {
        id: "seo-audit-200",
        title: "Полный SEO-аудит",
        price: "39 900 ₽",
      },
    });

    expect(await readAdminEntityMetadata("audit", audit.id)).toMatchObject({
      qaLabel: "Playwright · полный путь брифа",
      archivedAt: null,
      offerSnapshot: {
        id: "seo-audit-200",
        title: "Полный SEO-аудит",
        price: "39 900 ₽",
      },
    });
    expect(sqlite.prepare("PRAGMA table_info(audits)").all().map((column) => (column as { name: string }).name)).not.toContain("qa_label");
  });

  it("archives records softly and filters archived and QA audits independently", async () => {
    const productionAudit = await createAuditRecord({
      originalUrl: "https://customer.example/",
      normalizedDomain: "customer.example",
      locale: "ru",
      name: "Клиент",
      contact: "client@example.com",
      contactType: "email",
      ipHash: "ip",
      userAgentHash: "ua",
      source: "free-audit",
      consentVersion: "test-v1",
    });
    const qaAudit = await createAuditRecord({
      originalUrl: "https://qa-filter.example/",
      normalizedDomain: "qa-filter.example",
      locale: "ru",
      name: "QA",
      contact: "qa@example.com",
      contactType: "email",
      ipHash: "ip",
      userAgentHash: "ua",
      source: "playwright-fixture",
      consentVersion: "test-v1",
      qaLabel: "Playwright · фильтр",
    });

    await updateAdminEntityMetadata("audit", productionAudit.id, { archived: true });

    expect((await adminAuditList(undefined, undefined, undefined, undefined, "active", "qa")).map((row) => row.id)).toContain(qaAudit.id);
    expect((await adminAuditList(undefined, undefined, undefined, undefined, "active", "real")).map((row) => row.id)).not.toContain(productionAudit.id);
    expect((await adminAuditList(undefined, undefined, undefined, undefined, "archived", "real")).map((row) => row.id)).toContain(productionAudit.id);
    expect(await readAdminEntityMetadata("audit", productionAudit.id)).toMatchObject({ qaLabel: null, archivedAt: expect.any(Number) });
  });

  it("filters QA and archived leads and briefs without changing their legacy rows", async () => {
    const leadId = randomUUID();
    const briefId = randomUUID();
    const now = Date.now();
    sqlite.prepare(`INSERT INTO leads(id,name,contact,contact_type,target,service,comment,status,locale,source,page_url,utm_json,consent_version,ip_hash,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      leadId, "QA lead", "qa-lead@example.com", "email", "Проект", "seo", null, "new", "ru", "integration-test", "/contacts", "{}", "test-v1", "ip", now,
    );
    sqlite.prepare(`INSERT INTO brief_submissions(id,name,contact,locale,service,answers_json,status,consent_version,ip_hash,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
      briefId, "QA brief", "qa-brief@example.com", "ru", "seo", "{}", "new", "test-v1", "ip", now,
    );

    await updateAdminEntityMetadata("lead", leadId, { qaLabel: "Playwright · заявка" });
    await updateAdminEntityMetadata("brief", briefId, { qaLabel: "Playwright · бриф", archived: true });

    expect((await adminLeadList(undefined, undefined, "active", "qa")).map((row) => row.id)).toContain(leadId);
    expect((await adminLeadList(undefined, undefined, "active", "real")).map((row) => row.id)).not.toContain(leadId);
    expect((await adminBriefList(undefined, undefined, "active", "qa")).map((row) => row.id)).not.toContain(briefId);
    expect((await adminBriefList(undefined, undefined, "archived", "qa")).map((row) => row.id)).toContain(briefId);
    expect(sqlite.prepare("SELECT name,status FROM leads WHERE id=?").get(leadId)).toMatchObject({ name: "QA lead", status: "new" });
    expect(sqlite.prepare("SELECT name,status FROM brief_submissions WHERE id=?").get(briefId)).toMatchObject({ name: "QA brief", status: "new" });
  });

  it("does not add explicitly marked QA audits to public usage counters", async () => {
    const audit = await createAuditRecord({
      originalUrl: "https://qa-metrics.example/",
      normalizedDomain: "qa-metrics.example",
      locale: "ru",
      name: "QA",
      contact: "qa@example.com",
      contactType: "email",
      ipHash: "ip",
      userAgentHash: "ua",
      source: "free-audit",
      consentVersion: "test-v1",
      qaLabel: "Ручная проверка полного пути",
    });
    const before = sqlite.prepare("SELECT value FROM public_metrics WHERE name='free_audit_pages'").get() as { value: number };

    await completeAuditRecord(audit.id, {
      publicResult: {},
      fullResult: {},
      score: 100,
      grade: "A",
      partial: false,
      pagesDiscovered: 10,
      pagesChecked: 10,
    });

    expect(sqlite.prepare("SELECT value FROM public_metrics WHERE name='free_audit_pages'").get()).toMatchObject({ value: before.value });
    expect(sqlite.prepare("SELECT normalized_domain FROM completed_audit_domains WHERE normalized_domain=?").get("qa-metrics.example")).toBeUndefined();
  });
});
