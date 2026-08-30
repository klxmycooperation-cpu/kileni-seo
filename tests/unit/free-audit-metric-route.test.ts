import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { migrationSql } from "../../src/db/migrations";
import { FREE_AUDIT_PAGE_BASELINE } from "../../src/config/public-audit";

let temporaryDirectory: string;
let previousDatabasePath: string | undefined;

beforeAll(async () => {
  temporaryDirectory = mkdtempSync(join(tmpdir(), "kileni-free-audit-route-"));
  previousDatabasePath = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = join(temporaryDirectory, "kileni.sqlite");
  vi.resetModules();
  const { sqlite } = await import("../../src/db/client");
  sqlite.exec(migrationSql);
});

afterAll(async () => {
  const { closeDatabaseConnections } = await import("../../src/db/client");
  await closeDatabaseConnections();
  if (previousDatabasePath === undefined) delete process.env.DATABASE_PATH;
  else process.env.DATABASE_PATH = previousDatabasePath;
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe("GET /api/public-metrics/free-audits", () => {
  it("returns only the fresh aggregate and forbids intermediary caching", async () => {
    let route: { GET?: () => Promise<Response> | Response } | null = null;
    let importError: unknown;
    try {
      route = await import("../../app/api/public-metrics/free-audits/route");
    } catch (error) {
      importError = error;
      route = null;
    }

    expect(importError).toBeUndefined();
    expect(route).not.toBeNull();
    expect(route).toHaveProperty("GET", expect.any(Function));
    if (!route?.GET) return;

    const response = await route.GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(await response.json()).toEqual({ count: FREE_AUDIT_PAGE_BASELINE });
  });
});
