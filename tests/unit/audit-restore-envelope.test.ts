import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createAuditRestoreEnvelope,
  verifyAuditRestoreEnvelope,
} from "../../app/api/_lib/audit-restore";
import { auditV4Snapshot } from "./fixtures/audit-v4-snapshot";

const secret = "restore-test-secret-with-at-least-32-characters";
const token = "r".repeat(43);

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("signed audit restore envelope", () => {
  it("round-trips the immutable v4 snapshot without falling back to the v3 envelope", () => {
    const restore = createAuditRestoreEnvelope({
      token,
      locale: "ru",
      normalizedDomain: "example.com",
      status: "completed",
      createdAt: 1_700_000_000_000,
      completedAt: 1_700_000_001_000,
      result: auditV4Snapshot(),
    }, { secret, now: 1_700_000_001_000, ttlMs: 60_000 });

    expect(restore).toBeTypeOf("string");
    const decoded = verifyAuditRestoreEnvelope(restore, token, {
      secret,
      now: 1_700_000_002_000,
    });

    expect(decoded).toMatchObject({
      version: 3,
      token,
      status: "completed",
      result: {
        resultVersion: 4,
        contractVersion: 3,
        pagesChecked: 2,
        pagesEligible: 2,
        coverageStatus: "sample_complete",
      },
    });
    expect(Object.isFrozen(decoded?.result)).toBe(true);
    expect(decoded?.result).not.toHaveProperty("score");
    expect(decoded?.result).not.toHaveProperty("grade");
  });

  it("round-trips a score-free v3 contract and derives terminal status from sample coverage", () => {
    const restore = createAuditRestoreEnvelope({
      token,
      locale: "ru",
      normalizedDomain: "example.com",
      status: "completed",
      createdAt: 1_700_000_000_000,
      completedAt: 1_700_000_001_000,
      result: {
        resultVersion: 3,
        contractVersion: 2,
        engineVersion: "audit-contract-v2.0.0",
        auditId: token,
        createdAt: "2026-08-30T10:00:00.000Z",
        target: "https://example.com/",
        pagesDiscovered: 10,
        pagesSelected: 10,
        pagesChecked: 10,
        pagesNotCheckedTotal: 0,
        pagesNotCheckedReturned: 0,
        pagesNotCheckedTruncated: false,
        pagesNotCheckedUrls: [],
        coverageStatus: "sample_complete",
        selectedPages: Array.from({ length: 10 }, (_, index) => ({
          url: index === 0 ? "https://example.com/" : `https://example.com/page-${index}`,
          pageType: index === 0 ? "homepage" : "unique",
          selectionReason: index === 0 ? "homepage" : "additional_important",
          templateFamily: `template-${index}`,
          locale: null,
        })),
        checks: [],
        categorySummary: [],
        resultSummary: {
          headline: "Проверено 10 выбранных страниц",
          totalChecks: 0,
          completedChecks: 0,
          pass: 0,
          warning: 0,
          fail: 0,
          not_run: 0,
          insufficient_data: 0,
        },
        score: 100,
      },
    }, { secret, now: 1_700_000_001_000, ttlMs: 60_000 });

    expect(restore).toBeTypeOf("string");
    const decoded = verifyAuditRestoreEnvelope(restore, token, {
      secret,
      now: 1_700_000_002_000,
    });
    expect(decoded).toMatchObject({
      token,
      status: "completed",
      result: {
        resultVersion: 3,
        contractVersion: 2,
        coverageStatus: "sample_complete",
        pagesChecked: 10,
      },
    });
    expect(decoded?.result).not.toHaveProperty("score");
    expect(decoded?.result).not.toHaveProperty("grade");
  });

  it("round-trips only the public terminal snapshot and drops injected private fields", () => {
    const restore = createAuditRestoreEnvelope({
      token,
      locale: "ru",
      normalizedDomain: "example.com",
      status: "partial",
      createdAt: 1_700_000_000_000,
      completedAt: 1_700_000_001_000,
      result: {
        resultVersion: 2,
        score: 61,
        grade: "C",
        interpretation: "Сайт требует системной доработки",
        pagesChecked: 4,
        pagesDiscovered: 10,
        partial: true,
        categories: [{
          name: "Техническая доступность и индексация",
          risk: "high",
          explanation: "Направление требует углублённой проверки.",
          exactUrl: "https://example.com/private-path",
          recommendation: "Секретная инструкция",
        }],
        contact: "private@example.com",
        fullIssues: [{ url: "https://example.com/private-path" }],
      },
    }, { secret, now: 1_700_000_001_000, ttlMs: 60_000 });

    expect(restore).toBeTypeOf("string");
    const decoded = verifyAuditRestoreEnvelope(restore, token, {
      secret,
      now: 1_700_000_002_000,
    });

    expect(decoded).toMatchObject({
      token,
      locale: "ru",
      normalizedDomain: "example.com",
      status: "partial",
      result: {
        resultVersion: 2,
        pagesChecked: 4,
        pagesDiscovered: 10,
        pagesSelected: 10,
        coverageStatus: "sample_partial",
      },
    });
    expect(decoded?.result).not.toHaveProperty("score");
    expect(decoded?.result).not.toHaveProperty("grade");
    expect(decoded?.result).not.toHaveProperty("partial");
    expect(JSON.stringify(decoded)).not.toMatch(/private@example|private-path|Секретная инструкция|fullIssues/u);
  });

  it("rejects unsigned, tampered, wrong-token and expired restore values", () => {
    const restore = createAuditRestoreEnvelope({
      token,
      locale: "en",
      normalizedDomain: "example.com",
      status: "completed",
      createdAt: 1_700_000_000_000,
      completedAt: 1_700_000_001_000,
      result: {
        score: 88,
        grade: "A",
        interpretation: "Strong technical condition",
        pagesChecked: 3,
        pagesDiscovered: 3,
        partial: false,
        categories: [],
      },
    }, { secret, now: 1_700_000_001_000, ttlMs: 60_000 });
    expect(restore).toBeTypeOf("string");
    const signed = restore as string;
    const [payload, signature] = signed.split(".");

    expect(verifyAuditRestoreEnvelope(payload, token, { secret, now: 1_700_000_002_000 })).toBeNull();
    expect(verifyAuditRestoreEnvelope(`${payload}x.${signature}`, token, { secret, now: 1_700_000_002_000 })).toBeNull();
    expect(verifyAuditRestoreEnvelope(signed, "w".repeat(43), { secret, now: 1_700_000_002_000 })).toBeNull();
    expect(verifyAuditRestoreEnvelope(signed, token, { secret, now: 1_700_000_061_001 })).toBeNull();
  });

  it("fails closed when the restore secret is absent or too short", () => {
    vi.stubEnv("AUDIT_RESTORE_SECRET", "");
    const input = {
      token,
      locale: "ru" as const,
      normalizedDomain: "example.com",
      status: "completed" as const,
      createdAt: Date.now() - 1_000,
      completedAt: Date.now(),
      result: {
        score: 75,
        grade: "B",
        interpretation: "Результат",
        pagesChecked: 1,
        pagesDiscovered: 1,
        partial: false,
        categories: [],
      },
    };

    expect(createAuditRestoreEnvelope(input)).toBeNull();
    expect(createAuditRestoreEnvelope(input, { secret: "short" })).toBeNull();
    expect(createAuditRestoreEnvelope(input, { secret: "replace-with-at-least-32-random-characters" })).toBeNull();
    expect(verifyAuditRestoreEnvelope("payload.signature", token)).toBeNull();
  });
});
