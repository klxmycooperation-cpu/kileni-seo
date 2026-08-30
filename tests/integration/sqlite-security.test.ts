import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type Database from "better-sqlite3";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { migrationSql } from "../../src/db/migrations";

type CreateAuditRecord = typeof import("../../src/db/queries")["createAuditRecord"];
type FailStaleAudits = typeof import("../../src/db/queries")["failStaleAudits"];
type RateLimit = typeof import("../../src/lib/security/rate-limit")["consumeRateLimit"];
type PurgeRateLimits = typeof import("../../src/lib/security/rate-limit")["purgeExpiredRateLimits"];

let sqlite: Database.Database;
let closeDatabaseConnections: typeof import("../../src/db/client")["closeDatabaseConnections"];
let createAuditRecord: CreateAuditRecord;
let failStaleAudits: FailStaleAudits;
let consumeRateLimit: RateLimit;
let purgeExpiredRateLimits: PurgeRateLimits;
let temporaryDirectory: string;
let previousDatabasePath: string | undefined;

beforeAll(async () => {
  temporaryDirectory = mkdtempSync(join(tmpdir(), "kileni-sqlite-test-"));
  previousDatabasePath = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = join(temporaryDirectory, "kileni.sqlite");
  vi.resetModules();

  ({ sqlite, closeDatabaseConnections } = await import("../../src/db/client"));
  sqlite.exec(migrationSql);
  ({ createAuditRecord, failStaleAudits } = await import("../../src/db/queries"));
  ({ consumeRateLimit, purgeExpiredRateLimits } = await import("../../src/lib/security/rate-limit"));
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
