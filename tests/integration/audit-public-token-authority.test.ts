import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let temporaryDirectory: string;
let previousDatabasePath: string | undefined;
let previousRestoreSecret: string | undefined;
let closeDatabaseConnections: Awaited<typeof import("../../src/db/client")>["closeDatabaseConnections"];
let publicAuditRoute: Awaited<typeof import("../../app/api/audits/[token]/route")>;
let publicAuditEventsRoute: Awaited<typeof import("../../app/api/audits/[token]/events/route")>;
let publicReportRoute: Awaited<typeof import("../../app/api/audits/[token]/report.pdf/route")>;
let createAuditRestoreEnvelope: Awaited<typeof import("../../app/api/_lib/audit-restore")>["createAuditRestoreEnvelope"];
const restoreSecret = "integration-restore-secret-with-at-least-32-characters";

beforeAll(async () => {
  temporaryDirectory = mkdtempSync(join(tmpdir(), "kileni-public-audit-authority-"));
  previousDatabasePath = process.env.DATABASE_PATH;
  previousRestoreSecret = process.env.AUDIT_RESTORE_SECRET;
  process.env.DATABASE_PATH = join(temporaryDirectory, "kileni.sqlite");
  process.env.AUDIT_RESTORE_SECRET = restoreSecret;
  vi.resetModules();
  ({ closeDatabaseConnections } = await import("../../src/db/client"));
  ({ createAuditRestoreEnvelope } = await import("../../app/api/_lib/audit-restore"));
  publicAuditRoute = await import("../../app/api/audits/[token]/route");
  publicAuditEventsRoute = await import("../../app/api/audits/[token]/events/route");
  publicReportRoute = await import("../../app/api/audits/[token]/report.pdf/route");
});

afterAll(async () => {
  await closeDatabaseConnections();
  if (previousDatabasePath === undefined) delete process.env.DATABASE_PATH;
  else process.env.DATABASE_PATH = previousDatabasePath;
  if (previousRestoreSecret === undefined) delete process.env.AUDIT_RESTORE_SECRET;
  else process.env.AUDIT_RESTORE_SECRET = previousRestoreSecret;
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe("public audit token authority", () => {
  it("uses the same 400/404 contract for result, events and PDF endpoints", async () => {
    const malformed = "not-a-valid-token";
    const missing = "M".repeat(43);
    const calls = [
      (token: string) => publicAuditRoute.GET(
        new Request(`http://localhost/api/audits/${token}`),
        { params: Promise.resolve({ token }) },
      ),
      (token: string) => publicAuditEventsRoute.GET(
        new Request(`http://localhost/api/audits/${token}/events?format=json`),
        { params: Promise.resolve({ token }) },
      ),
      (token: string) => publicReportRoute.GET(
        new Request(`http://localhost/api/audits/${token}/report.pdf`),
        { params: Promise.resolve({ token }) },
      ),
    ];

    for (const call of calls) {
      const malformedResponse = await call(malformed);
      expect(malformedResponse.status).toBe(400);
      expect(await malformedResponse.json()).toMatchObject({ error: "INVALID_TOKEN" });

      const missingResponse = await call(missing);
      expect(missingResponse.status).toBe(404);
      expect(await missingResponse.json()).toMatchObject({ error: "AUDIT_NOT_FOUND" });
    }
  });

  it("restores a signed public summary when the serverless database record is absent", async () => {
    const token = "R".repeat(43);
    const restore = createAuditRestoreEnvelope({
      token,
      locale: "ru",
      normalizedDomain: "restore.example",
      status: "partial",
      createdAt: Date.now() - 2_000,
      completedAt: Date.now() - 1_000,
      result: {
        score: 58,
        grade: "C",
        interpretation: "Сайт требует системной доработки",
        pagesChecked: 2,
        pagesDiscovered: 8,
        partial: true,
        categories: [{ name: "Индексация", risk: "high", explanation: "Нужна углублённая проверка." }],
      },
    }, { secret: restoreSecret });
    expect(restore).toBeTypeOf("string");

    const resultResponse = await publicAuditRoute.GET(
      new Request(`http://localhost/api/audits/${token}?restore=${encodeURIComponent(restore as string)}`),
      { params: Promise.resolve({ token }) },
    );
    const resultText = await resultResponse.text();
    expect(resultResponse.status).toBe(200);
    expect(resultText).toContain("restore.example");
    expect(resultText).toContain("Сайт требует системной доработки");
    expect(resultText).not.toContain("contact");
    expect(resultText).not.toContain("originalUrl");
    expect(JSON.parse(resultText)).not.toHaveProperty("score");
    expect(JSON.parse(resultText)).not.toHaveProperty("grade");

    const eventsResponse = await publicAuditEventsRoute.GET(
      new Request(`http://localhost/api/audits/${token}/events?format=json&restore=${encodeURIComponent(restore as string)}`),
      { params: Promise.resolve({ token }) },
    );
    expect(eventsResponse.status).toBe(200);
    expect(await eventsResponse.json()).toMatchObject({
      status: "partial",
      terminal: true,
      pagesChecked: 2,
      pagesDiscovered: 8,
      pageLimit: 10,
      events: [],
    });

    const pdfResponse = await publicReportRoute.GET(
      new Request(`http://localhost/api/audits/${token}/report.pdf?restore=${encodeURIComponent(restore as string)}`),
      { params: Promise.resolve({ token }) },
    );
    expect(pdfResponse.status).toBe(200);
    expect(pdfResponse.headers.get("content-type")).toBe("application/pdf");
  });

  it("keeps the database authoritative when a conflicting signed restore is supplied", async () => {
    const queries = await import("../../src/db/queries");
    const audit = await queries.createAuditRecord({
      originalUrl: "https://database.example/",
      normalizedDomain: "database.example",
      locale: "ru",
      name: "Имя",
      contact: "owner@example.com",
      contactType: "email",
      ipHash: "ip",
      userAgentHash: "ua",
      source: "integration-test",
      pageLimit: 10,
      consentVersion: "test-v1",
    });
    await queries.completeAuditRecord(audit.id, {
      publicResult: { score: 70, grade: "B", interpretation: "DB RESULT", pagesChecked: 1, pagesDiscovered: 1, partial: false, categories: [] },
      fullResult: {}, score: 70, grade: "B", partial: false, pagesDiscovered: 1, pagesChecked: 1,
    });
    const restore = createAuditRestoreEnvelope({
      token: audit.publicToken,
      locale: "ru",
      normalizedDomain: "forged.example",
      status: "completed",
      createdAt: Date.now() - 2_000,
      completedAt: Date.now() - 1_000,
      result: { score: 99, grade: "A", interpretation: "RESTORE RESULT", pagesChecked: 10, pagesDiscovered: 10, partial: false, categories: [] },
    }, { secret: restoreSecret });

    const response = await publicAuditRoute.GET(
      new Request(`http://localhost/api/audits/${audit.publicToken}?restore=${encodeURIComponent(restore as string)}`),
      { params: Promise.resolve({ token: audit.publicToken }) },
    );
    const text = await response.text();
    expect(JSON.parse(text)).toMatchObject({ pageLimit: 10 });
    expect(text).toContain("database.example");
    expect(text).toContain("DB RESULT");
    expect(text).not.toContain("forged.example");
    expect(text).not.toContain("RESTORE RESULT");
  });

  it("rejects an unsigned instant snapshot when the token has no database record", async () => {
    const forged = Buffer.from(JSON.stringify({
      version: 1,
      locale: "ru",
      normalizedDomain: "forged.example",
      completedAt: Date.now(),
      result: {
        score: 99,
        grade: "A",
        interpretation: "Поддельный результат",
        pagesChecked: 100,
        pagesDiscovered: 100,
        partial: false,
        categories: Array.from({ length: 5 }, (_, index) => ({
          name: `Поддельная категория ${index + 1}`,
          risk: "low" as const,
          explanation: "Эти данные не были сохранены сервером.",
        })),
      },
    })).toString("base64url");
    const token = "Z".repeat(43);

    const response = await publicReportRoute.GET(
      new Request(`http://localhost/api/audits/${token}/report.pdf?instant=${forged}`),
      { params: Promise.resolve({ token }) },
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: "AUDIT_NOT_FOUND" });
  });

  it("returns only the redacted summary even when the database contains private evidence", async () => {
    const queries = await import("../../src/db/queries");
    const audit = await queries.createAuditRecord({
      originalUrl: "https://safe.example/",
      normalizedDomain: "safe.example",
      locale: "ru",
      name: "Секретное имя",
      contact: "private@example.com",
      contactType: "email",
      ipHash: "private-ip-hash",
      userAgentHash: "private-agent-hash",
      source: "integration-test",
      pageLimit: 10,
      consentVersion: "test-v1",
    });
    await queries.completeAuditRecord(audit.id, {
      publicResult: {
        score: 62,
        grade: "C",
        interpretation: "Сайт требует системной доработки",
        pagesChecked: 1,
        pagesDiscovered: 1,
        partial: false,
        categories: [{ name: "Индексация", risk: "high", explanation: "Нужна углублённая проверка." }],
      },
      fullResult: { exactUrl: "https://safe.example/private-problem", instruction: "Секретная инструкция по исправлению" },
      score: 62,
      grade: "C",
      partial: false,
      pagesDiscovered: 1,
      pagesChecked: 1,
      pages: [{ url: "https://safe.example/private-problem", status: 404 }],
      issues: [{ code: "PRIVATE_ISSUE", category: "technical", severity: "high", url: "https://safe.example/private-problem", recommendation: "Секретная инструкция по исправлению" }],
    });

    const response = await publicAuditRoute.GET(
      new Request(`http://localhost/api/audits/${audit.publicToken}`),
      { params: Promise.resolve({ token: audit.publicToken }) },
    );
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain("safe.example");
    expect(text).not.toContain("private@example.com");
    expect(text).not.toContain("Секретное имя");
    expect(text).not.toContain("private-problem");
    expect(text).not.toContain("Секретная инструкция");
  });

  it("normalizes a legacy 10-of-43 record to a completed sample without exposing score or grade", async () => {
    const queries = await import("../../src/db/queries");
    const audit = await queries.createAuditRecord({
      originalUrl: "https://legacy-sample.example/",
      normalizedDomain: "legacy-sample.example",
      locale: "ru",
      name: "",
      contact: "",
      contactType: "none",
      ipHash: "legacy-ip",
      userAgentHash: "legacy-agent",
      source: "integration-test",
      pageLimit: 10,
      consentVersion: "test-v1",
    });
    await queries.completeAuditRecord(audit.id, {
      publicResult: {
        resultVersion: 2,
        score: 62,
        grade: "C",
        interpretation: "Сайт требует системной доработки",
        pagesChecked: 10,
        pagesDiscovered: 43,
        partial: true,
        categories: [],
      },
      fullResult: {},
      score: 62,
      grade: "C",
      partial: true,
      pagesDiscovered: 43,
      pagesChecked: 10,
    });

    const resultResponse = await publicAuditRoute.GET(
      new Request(`http://localhost/api/audits/${audit.publicToken}`),
      { params: Promise.resolve({ token: audit.publicToken }) },
    );
    const resultPayload = await resultResponse.json() as Record<string, unknown>;
    expect(resultPayload).toMatchObject({
      status: "completed",
      terminal: true,
      pagesChecked: 10,
      pagesDiscovered: 43,
      pagesSelected: 10,
      coverageStatus: "sample_complete",
      result: {
        resultVersion: 2,
        legacyFormat: true,
        pagesSelected: 10,
        coverageStatus: "sample_complete",
      },
    });
    expect(resultPayload).not.toHaveProperty("score");
    expect(resultPayload).not.toHaveProperty("overallScore");
    expect(resultPayload).not.toHaveProperty("grade");
    expect(resultPayload).not.toHaveProperty("partial");

    const eventsResponse = await publicAuditEventsRoute.GET(
      new Request(`http://localhost/api/audits/${audit.publicToken}/events?format=json`),
      { params: Promise.resolve({ token: audit.publicToken }) },
    );
    const eventsPayload = await eventsResponse.json() as Record<string, unknown>;
    expect(eventsPayload).toMatchObject({
      status: "completed",
      terminal: true,
      pagesChecked: 10,
      pagesDiscovered: 43,
      pagesSelected: 10,
      coverageStatus: "sample_complete",
    });
    expect(eventsPayload).not.toHaveProperty("overallScore");
    expect(eventsPayload).not.toHaveProperty("grade");
    expect(eventsPayload).not.toHaveProperty("partial");
  });

  it("serves the score-free v3 snapshot and coverage through result and events APIs", async () => {
    const queries = await import("../../src/db/queries");
    const audit = await queries.createAuditRecord({
      originalUrl: "https://contract-v3.example/",
      normalizedDomain: "contract-v3.example",
      locale: "ru",
      name: "Без контакта",
      contact: "",
      contactType: "none",
      ipHash: "v3-ip",
      userAgentHash: "v3-agent",
      source: "integration-test",
      pageLimit: 10,
      consentVersion: "test-v1",
    });
    const publicResult = {
      resultVersion: 3,
      contractVersion: 2,
      engineVersion: "audit-contract-v2.0.0",
      auditId: audit.publicToken,
      createdAt: "2026-08-30T10:00:00.000Z",
      target: "https://contract-v3.example/",
      pagesDiscovered: 1,
      pagesSelected: 1,
      pagesChecked: 1,
      pagesNotCheckedTotal: 0,
      pagesNotCheckedReturned: 0,
      pagesNotCheckedTruncated: false,
      pagesNotCheckedUrls: [],
      coverageStatus: "sample_complete",
      selectedPages: [{
        url: "https://contract-v3.example/",
        pageType: "homepage",
        selectionReason: "homepage",
        templateFamily: "homepage",
        locale: null,
      }],
      checks: [],
      categorySummary: [],
      resultSummary: {
        headline: "Проверена вся выбранная страница",
        totalChecks: 0,
        completedChecks: 0,
        pass: 0,
        warning: 0,
        fail: 0,
        not_run: 0,
        insufficient_data: 0,
      },
    };
    await queries.completeAuditRecord(audit.id, {
      publicResult,
      fullResult: { resultVersion: 3, contractVersion: 2, publicResult },
      // Legacy database columns remain populated during the migration, but
      // v3 public endpoints must never expose them as a contract score.
      score: 99,
      grade: "A",
      partial: false,
      pagesDiscovered: 1,
      pagesChecked: 1,
    });

    const resultResponse = await publicAuditRoute.GET(
      new Request(`http://localhost/api/audits/${audit.publicToken}`),
      { params: Promise.resolve({ token: audit.publicToken }) },
    );
    const resultPayload = await resultResponse.json() as Record<string, unknown>;
    expect(resultResponse.status).toBe(200);
    expect(resultPayload).toMatchObject({
      status: "completed",
      coverageStatus: "sample_complete",
      result: {
        resultVersion: 3,
        contractVersion: 2,
        coverageStatus: "sample_complete",
      },
    });
    expect(resultPayload).not.toHaveProperty("score");
    expect(resultPayload).not.toHaveProperty("overallScore");
    expect(resultPayload).not.toHaveProperty("grade");
    expect(resultPayload).not.toHaveProperty("partial");

    const eventsResponse = await publicAuditEventsRoute.GET(
      new Request(`http://localhost/api/audits/${audit.publicToken}/events?format=json`),
      { params: Promise.resolve({ token: audit.publicToken }) },
    );
    const eventsPayload = await eventsResponse.json() as Record<string, unknown>;
    expect(eventsPayload).toMatchObject({
      status: "completed",
      terminal: true,
      coverageStatus: "sample_complete",
      pagesChecked: 1,
      pagesDiscovered: 1,
    });
    expect(eventsPayload).not.toHaveProperty("overallScore");
    expect(eventsPayload).not.toHaveProperty("grade");
    expect(eventsPayload).not.toHaveProperty("partial");
  });
});
