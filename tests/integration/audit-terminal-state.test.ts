import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

type Queries = typeof import("../../src/db/queries");

let closeDatabaseConnections: typeof import("../../src/db/client")["closeDatabaseConnections"];
let queries: Queries;
let temporaryDirectory: string;
let previousDatabasePath: string | undefined;

beforeAll(async () => {
  temporaryDirectory = mkdtempSync(join(tmpdir(), "kileni-audit-terminal-test-"));
  previousDatabasePath = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = join(temporaryDirectory, "kileni.sqlite");
  delete process.env.TURSO_DATABASE_URL;
  delete process.env.TURSO_AUTH_TOKEN;
  vi.resetModules();

  ({ closeDatabaseConnections } = await import("../../src/db/client"));
  queries = await import("../../src/db/queries");
});

afterAll(async () => {
  await closeDatabaseConnections();
  if (previousDatabasePath === undefined) delete process.env.DATABASE_PATH;
  else process.env.DATABASE_PATH = previousDatabasePath;
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe("audit terminal state", () => {
  it("does not overwrite a saved successful result with a later failure", async () => {
    const audit = await queries.createAuditRecord({
      originalUrl: "https://completed.example/",
      normalizedDomain: "completed.example",
      locale: "ru",
      name: "Тест",
      contact: "test@example.com",
      contactType: "email",
      ipHash: "ip",
      userAgentHash: "ua",
      source: "integration-test",
      consentVersion: "test-v1",
    });

    await queries.completeAuditRecord(audit.id, {
      publicResult: { resultVersion: 4, saved: true },
      fullResult: { resultVersion: 4, saved: true },
      score: null,
      grade: null,
      partial: false,
      pagesDiscovered: 10,
      pagesChecked: 10,
    });
    await queries.failAuditRecord(audit.id, "late notification failure");

    const stored = await queries.getAuditById(audit.id);
    expect(stored).toMatchObject({
      status: "completed",
      errorSummary: null,
      pagesDiscovered: 10,
      pagesChecked: 10,
    });
    expect(stored?.publicResultJson).toContain('"saved":true');
  });

  it("ignores a late progress event after a successful terminal result", async () => {
    const audit = await queries.createAuditRecord({
      originalUrl: "https://late-progress.example/",
      normalizedDomain: "late-progress.example",
      locale: "ru",
      name: "Тест",
      contact: "test@example.com",
      contactType: "email",
      ipHash: "ip",
      userAgentHash: "ua",
      source: "integration-test",
      consentVersion: "test-v1",
    });

    await queries.completeAuditRecord(audit.id, {
      publicResult: { resultVersion: 4, saved: "first" },
      fullResult: { resultVersion: 4, saved: "first" },
      score: null,
      grade: null,
      partial: false,
      pagesDiscovered: 10,
      pagesChecked: 10,
    });
    await queries.appendAuditEvent(audit.id, "crawling_pages", {
      pagesDiscovered: 20,
      pagesChecked: 4,
    });

    const stored = await queries.getAuditById(audit.id);
    expect(stored).toMatchObject({
      status: "completed",
      pagesDiscovered: 10,
      pagesChecked: 10,
    });
    expect((await queries.getAuditEvents(audit.id)).map((event) => event.event)).not.toContain("crawling_pages");
  });

  it("keeps a saved failure terminal when completion arrives late", async () => {
    const audit = await queries.createAuditRecord({
      originalUrl: "https://late-completion.example/",
      normalizedDomain: "late-completion.example",
      locale: "ru",
      name: "Тест",
      contact: "test@example.com",
      contactType: "email",
      ipHash: "ip",
      userAgentHash: "ua",
      source: "integration-test",
      consentVersion: "test-v1",
    });

    await queries.failAuditRecord(audit.id, "target unavailable");
    await queries.completeAuditRecord(audit.id, {
      publicResult: { resultVersion: 4, saved: "late" },
      fullResult: { resultVersion: 4, saved: "late" },
      score: null,
      grade: null,
      partial: false,
      pagesDiscovered: 10,
      pagesChecked: 10,
    });

    const stored = await queries.getAuditById(audit.id);
    expect(stored).toMatchObject({
      status: "failed",
      errorSummary: "target unavailable",
      pagesDiscovered: 0,
      pagesChecked: 0,
      publicResultJson: null,
      fullResultJson: null,
    });
    expect((await queries.getAuditEvents(audit.id)).map((event) => event.event)).not.toContain("completed");
  });
});
