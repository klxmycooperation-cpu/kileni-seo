import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type Database from "better-sqlite3";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { migrationSql } from "../../src/db/migrations";
import { consumeRateLimit } from "../../src/lib/security/rate-limit";

type CreateAuditRecord = typeof import("../../src/db/queries")["createAuditRecord"];

let sqlite: Database.Database;
let createAuditRecord: CreateAuditRecord;
let temporaryDirectory: string;
let previousDatabasePath: string | undefined;

beforeAll(async () => {
  temporaryDirectory = mkdtempSync(join(tmpdir(), "kileni-sqlite-test-"));
  previousDatabasePath = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = join(temporaryDirectory, "kileni.sqlite");
  vi.resetModules();

  ({ sqlite } = await import("../../src/db/client"));
  sqlite.exec(migrationSql);
  ({ createAuditRecord } = await import("../../src/db/queries"));
});

afterAll(() => {
  sqlite.close();
  delete (globalThis as typeof globalThis & { __kileniSqlite?: Database.Database }).__kileniSqlite;
  if (previousDatabasePath === undefined) delete process.env.DATABASE_PATH;
  else process.env.DATABASE_PATH = previousDatabasePath;
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe("public audit tokens", () => {
  it("creates unique URL-safe tokens carrying 32 bytes of entropy", () => {
    const tokens = Array.from({ length: 64 }, (_, index) => createAuditRecord({
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
    }).publicToken);

    expect(new Set(tokens)).toHaveLength(tokens.length);
    for (const token of tokens) {
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/u);
      expect(Buffer.from(token, "base64url")).toHaveLength(32);
    }
  });
});

describe("SQLite rate limiting", () => {
  it("counts within a fixed window, blocks at the limit and resets on the boundary", () => {
    const rule = { windowMs: 1_000, limit: 3 };

    expect(consumeRateLimit(sqlite, "lead:198.51.100.7", rule, 1_000)).toEqual({
      allowed: true,
      remaining: 2,
      retryAfterMs: 0,
    });
    expect(consumeRateLimit(sqlite, "lead:198.51.100.7", rule, 1_050).remaining).toBe(1);
    expect(consumeRateLimit(sqlite, "lead:198.51.100.7", rule, 1_100).remaining).toBe(0);
    expect(consumeRateLimit(sqlite, "lead:198.51.100.7", rule, 1_100)).toEqual({
      allowed: false,
      remaining: 0,
      retryAfterMs: 900,
    });
    expect(consumeRateLimit(sqlite, "lead:198.51.100.7", rule, 2_000)).toEqual({
      allowed: true,
      remaining: 2,
      retryAfterMs: 0,
    });
  });

  it("keeps independent counters for distinct keys", () => {
    const rule = { windowMs: 1_000, limit: 1 };

    expect(consumeRateLimit(sqlite, "audit:first", rule, 5_000).allowed).toBe(true);
    expect(consumeRateLimit(sqlite, "audit:first", rule, 5_001).allowed).toBe(false);
    expect(consumeRateLimit(sqlite, "audit:second", rule, 5_001).allowed).toBe(true);
  });
});
