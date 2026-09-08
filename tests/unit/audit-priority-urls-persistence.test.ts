import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

const originalDatabasePath = process.env.DATABASE_PATH;
const originalTursoUrl = process.env.TURSO_DATABASE_URL;
const originalTursoToken = process.env.TURSO_AUTH_TOKEN;
const temporaryDirectories: string[] = [];

afterEach(async () => {
  try {
    const client = await import("../../src/db/client");
    await client.closeDatabaseConnections();
  } catch {
    // A deliberately invalid configuration can make the module reject before exporting cleanup.
  }
  restoreEnvironment("DATABASE_PATH", originalDatabasePath);
  restoreEnvironment("TURSO_DATABASE_URL", originalTursoUrl);
  restoreEnvironment("TURSO_AUTH_TOKEN", originalTursoToken);
  vi.resetModules();
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe.sequential("audit priority URL persistence", () => {
  it("stores at most three validated URLs outside utm_json", async () => {
    const databasePath = useTemporaryLocalDatabase();
    const { createAuditRecord, parseAuditPriorityUrls } = await import("../../src/db/queries");

    const audit = await createAuditRecord({
      originalUrl: "https://example.com/",
      normalizedDomain: "example.com",
      locale: "ru",
      name: "Test",
      contact: "test@example.com",
      contactType: "email",
      ipHash: "ip",
      userAgentHash: "ua",
      source: "test",
      consentVersion: "test-v1",
      utm: { source: "unit" },
      priorityUrls: [
        "https://example.com/services/",
        "https://example.com/catalog/",
        "https://example.com/contacts/",
        "https://example.com/ignored/",
      ],
    });

    expect(parseAuditPriorityUrls(audit.priorityUrlsJson)).toEqual([
      "https://example.com/services/",
      "https://example.com/catalog/",
      "https://example.com/contacts/",
    ]);

    const Database = (await import("better-sqlite3")).default;
    const database = new Database(databasePath, { readonly: true });
    try {
      const row = database.prepare("SELECT priority_urls_json AS priorityUrlsJson, utm_json AS utmJson FROM audits WHERE id=?").get(audit.id) as {
        priorityUrlsJson: string;
        utmJson: string;
      };
      expect(JSON.parse(row.priorityUrlsJson)).toHaveLength(3);
      expect(JSON.parse(row.utmJson)).toEqual({ source: "unit" });
    } finally {
      database.close();
    }
  });

  it("bounds and filters malformed stored JSON before the worker consumes it", async () => {
    useTemporaryLocalDatabase();
    const { parseAuditPriorityUrls } = await import("../../src/db/queries");

    expect(parseAuditPriorityUrls(JSON.stringify([
      "https://example.com/one",
      "javascript:alert(1)",
      42,
      "https://example.com/two",
      "https://example.com/three",
      "https://example.com/four",
    ]))).toEqual([
      "https://example.com/one",
      "https://example.com/two",
      "https://example.com/three",
    ]);
    expect(parseAuditPriorityUrls("not-json")).toEqual([]);
  });

  it("does not create a local SQLite file for a complete Turso configuration", async () => {
    const directory = mkdtempSync(join(tmpdir(), "kileni-turso-import-"));
    temporaryDirectories.push(directory);
    const databasePath = join(directory, "must-not-exist.sqlite");
    process.env.DATABASE_PATH = databasePath;
    process.env.TURSO_DATABASE_URL = "libsql://unit-test.invalid";
    process.env.TURSO_AUTH_TOKEN = "unit-test-token";
    vi.resetModules();

    await import("../../src/db/client");

    expect(existsSync(databasePath)).toBe(false);
  });

  it("revalidates a cached local connection after a module reload", async () => {
    useTemporaryLocalDatabase();
    const firstClient = await import("../../src/db/client");
    firstClient.sqlite.exec("DROP INDEX page_view_daily_updated_idx");
    vi.resetModules();
    const reloadedClient = await import("../../src/db/client");

    expect(() => reloadedClient.sqlite.prepare("SELECT 1")).toThrowError(/SCHEMA_DRIFT/u);
  });

  it("rebinds a reused v4 result to the new public token and timestamp", async () => {
    useTemporaryLocalDatabase();
    const { completeAuditRecord, createAuditRecord, createDomainAudit, getAuditByToken } = await import("../../src/db/queries");
    const original = await createAuditRecord(auditInput({
      originalUrl: "https://cache-rebind.example/services/",
      normalizedDomain: "cache-rebind.example",
      priorityUrls: ["https://cache-rebind.example/pricing"],
    }));
    const oldCreatedAt = "2025-01-02T03:04:05.000Z";
    const publicResult = {
      resultVersion: 4,
      contractVersion: 3,
      auditId: original.publicToken,
      createdAt: oldCreatedAt,
      marker: "public",
    };
    const fullResult = {
      resultVersion: 4,
      contractVersion: 3,
      auditId: original.publicToken,
      createdAt: oldCreatedAt,
      marker: "full",
      publicResult,
    };
    await completeAuditRecord(original.id, {
      publicResult,
      fullResult,
      score: null,
      grade: null,
      partial: false,
      pagesDiscovered: 4,
      pagesChecked: 3,
    });

    const created = await createDomainAudit(auditInput({
      originalUrl: "https://cache-rebind.example/services#details",
      normalizedDomain: "cache-rebind.example",
      priorityUrls: ["https://cache-rebind.example/pricing"],
    }), 60_000, cachedAuditFromRow);

    expect(created).not.toHaveProperty("conflict");
    if ("conflict" in created) throw new Error("Unexpected active-domain conflict");
    expect(created.cached).toBe(true);
    const reboundPublic = JSON.parse(created.audit.publicResultJson ?? "null") as Record<string, unknown>;
    const reboundFull = JSON.parse(created.audit.fullResultJson ?? "null") as Record<string, unknown>;
    const expectedCreatedAt = new Date(created.audit.createdAt).toISOString();
    expect(reboundPublic).toMatchObject({
      resultVersion: 4,
      contractVersion: 3,
      auditId: created.audit.publicToken,
      createdAt: expectedCreatedAt,
      marker: "public",
    });
    expect(reboundFull).toMatchObject({
      resultVersion: 4,
      contractVersion: 3,
      auditId: created.audit.publicToken,
      createdAt: expectedCreatedAt,
      marker: "full",
      publicResult: reboundPublic,
    });

    const untouched = await getAuditByToken(original.publicToken);
    expect(JSON.parse(untouched?.publicResultJson ?? "null")).toEqual(publicResult);
    expect(JSON.parse(untouched?.fullResultJson ?? "null")).toEqual(fullResult);
  });

  it("does not rewrite legacy cached result identifiers", async () => {
    useTemporaryLocalDatabase();
    const { createAuditRecord } = await import("../../src/db/queries");
    const legacyPublic = JSON.stringify({ resultVersion: 3, contractVersion: 2, auditId: "legacy-token", createdAt: "2024-01-01T00:00:00.000Z" });
    const legacyFull = JSON.stringify({ resultVersion: 3, contractVersion: 2, auditId: "legacy-token", createdAt: "2024-01-01T00:00:00.000Z" });

    const created = await createAuditRecord({
      ...auditInput({ originalUrl: "https://legacy-cache.example/", normalizedDomain: "legacy-cache.example" }),
      cached: {
        publicResultJson: legacyPublic,
        fullResultJson: legacyFull,
        overallScore: 71,
        grade: "B",
        pagesDiscovered: 5,
        pagesChecked: 5,
        partial: false,
      },
    });

    expect(created.publicResultJson).toBe(legacyPublic);
    expect(created.fullResultJson).toBe(legacyFull);
  });

  it("starts a queued audit when an explicit repeat disables cache reuse", async () => {
    useTemporaryLocalDatabase();
    const { completeAuditRecord, createAuditRecord, createDomainAudit } = await import("../../src/db/queries");
    const input = auditInput({
      originalUrl: "https://fresh-repeat.example/",
      normalizedDomain: "fresh-repeat.example",
    });
    const original = await createAuditRecord(input);
    await completeCurrentAudit(completeAuditRecord, original);
    const cacheReader = vi.fn(cachedAuditFromRow);

    const repeated = await createDomainAudit(input, 60_000, cacheReader, { reuseCachedResult: false });

    expect(repeated).toMatchObject({ cached: false, audit: { status: "queued", publicResultJson: null, fullResultJson: null } });
    expect("conflict" in repeated ? null : repeated.audit.publicToken).not.toBe(original.publicToken);
    expect(cacheReader).not.toHaveBeenCalled();
  });

  it("does not reuse a domain cache for another path or priority URL set", async () => {
    useTemporaryLocalDatabase();
    const { completeAuditRecord, createAuditRecord, createDomainAudit } = await import("../../src/db/queries");
    const pathSource = await createAuditRecord(auditInput({
      originalUrl: "https://cache-path.example/services/",
      normalizedDomain: "cache-path.example",
      priorityUrls: ["https://cache-path.example/pricing"],
    }));
    await completeCurrentAudit(completeAuditRecord, pathSource);
    const pathCache = vi.fn(cachedAuditFromRow);

    const differentPath = await createDomainAudit(auditInput({
      originalUrl: "https://cache-path.example/about/",
      normalizedDomain: "cache-path.example",
      priorityUrls: ["https://cache-path.example/pricing"],
    }), 60_000, pathCache);

    expect(differentPath).toMatchObject({ cached: false, audit: { status: "queued" } });
    expect(pathCache).not.toHaveBeenCalled();

    const prioritySource = await createAuditRecord(auditInput({
      originalUrl: "https://cache-priority.example/services/",
      normalizedDomain: "cache-priority.example",
      priorityUrls: ["https://cache-priority.example/pricing"],
    }));
    await completeCurrentAudit(completeAuditRecord, prioritySource);
    const priorityCache = vi.fn(cachedAuditFromRow);

    const differentPriorities = await createDomainAudit(auditInput({
      originalUrl: "https://cache-priority.example/services",
      normalizedDomain: "cache-priority.example",
      priorityUrls: ["https://cache-priority.example/contact"],
    }), 60_000, priorityCache);

    expect(differentPriorities).toMatchObject({ cached: false, audit: { status: "queued" } });
    expect(priorityCache).not.toHaveBeenCalled();
  });
});

function auditInput(overrides: Partial<{
  originalUrl: string;
  normalizedDomain: string;
  priorityUrls: readonly string[];
}> = {}) {
  return {
    originalUrl: overrides.originalUrl ?? "https://example.com/",
    normalizedDomain: overrides.normalizedDomain ?? "example.com",
    locale: "ru" as const,
    name: "Cache test",
    contact: "cache@example.com",
    contactType: "email",
    ipHash: "ip",
    userAgentHash: "ua",
    source: "test",
    consentVersion: "test-v1",
    priorityUrls: overrides.priorityUrls,
  };
}

function cachedAuditFromRow(row: {
  publicResultJson: string | null;
  fullResultJson: string | null;
  overallScore: number | null;
  grade: string | null;
  pagesDiscovered: number;
  pagesChecked: number;
  partial: number;
}) {
  if (!row.publicResultJson || !row.fullResultJson) return null;
  return {
    publicResultJson: row.publicResultJson,
    fullResultJson: row.fullResultJson,
    overallScore: row.overallScore,
    grade: row.grade,
    pagesDiscovered: row.pagesDiscovered,
    pagesChecked: row.pagesChecked,
    partial: Boolean(row.partial),
  };
}

async function completeCurrentAudit(
  completeAuditRecord: typeof import("../../src/db/queries").completeAuditRecord,
  audit: { id: string; publicToken: string },
): Promise<void> {
  const publicResult = {
    resultVersion: 4,
    contractVersion: 3,
    auditId: audit.publicToken,
    createdAt: "2025-01-02T03:04:05.000Z",
  };
  await completeAuditRecord(audit.id, {
    publicResult,
    fullResult: { ...publicResult, publicResult },
    score: null,
    grade: null,
    partial: false,
    pagesDiscovered: 4,
    pagesChecked: 3,
  });
}

function useTemporaryLocalDatabase(): string {
  const directory = mkdtempSync(join(tmpdir(), "kileni-priority-urls-"));
  temporaryDirectories.push(directory);
  const databasePath = join(directory, "kileni.sqlite");
  process.env.DATABASE_PATH = databasePath;
  delete process.env.TURSO_DATABASE_URL;
  delete process.env.TURSO_AUTH_TOKEN;
  vi.resetModules();
  return databasePath;
}

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
