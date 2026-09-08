import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { analyzePage } from "../../src/lib/audit/analyzer";
import { classifyAuditObject } from "../../src/lib/audit/classification";
import { finalizeAuditResultV4 } from "../../src/lib/audit/finalize-v4";
import { selectAuditSample } from "../../src/lib/audit/sample-selector";
import type { FullAuditResult } from "../../src/lib/audit/types";

const mocks = vi.hoisted(() => ({
  runAudit: vi.fn(),
  notifyTelegram: vi.fn(),
  sendEmail: vi.fn(),
  consumeRules: vi.fn(),
}));

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (task: () => Promise<unknown>) => { void task(); },
}));

vi.mock("../../src/lib/audit", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/lib/audit")>();
  return {
    ...original,
    assertPublicUrl: vi.fn(async (url: URL) => ({ url })),
    runAudit: mocks.runAudit,
    runPublicAudit: mocks.runAudit,
    toPublicAuditResult: vi.fn((result: { pagesChecked: number; pagesDiscovered: number; partial: boolean }) => ({
      resultVersion: 2,
      score: 82,
      grade: "B",
      interpretation: "Good",
      pagesChecked: result.pagesChecked,
      pagesDiscovered: result.pagesDiscovered,
      partial: result.partial,
      categories: [],
    })),
  };
});

vi.mock("../../src/lib/security/turnstile", () => ({
  verifyTurnstile: vi.fn(async () => ({ ok: true })),
}));

vi.mock("../../src/lib/notifications/telegram", () => ({
  notifyTelegram: mocks.notifyTelegram,
}));

vi.mock("../../src/lib/notifications/email", () => ({
  sendEmail: mocks.sendEmail,
}));

vi.mock("../../app/api/_lib/http", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../app/api/_lib/http")>();
  return { ...original, mutationGuard: vi.fn(() => null) };
});

vi.mock("../../app/api/_lib/submission", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../app/api/_lib/submission")>();
  return { ...original, consumeRules: mocks.consumeRules };
});

const databasePath = resolve(process.cwd(), `tmp/test-audit-vercel-stream-${process.pid}.sqlite`);
let previousEnvironment: NodeJS.ProcessEnv;

function auditResultFixture(input: { checked?: number; selected?: number; discovered?: number; host?: string } = {}) {
  const checked = input.checked ?? 10;
  const discovered = Math.max(checked, input.discovered ?? checked);
  const host = input.host ?? "fixture.example";
  const semanticPaths = [
    "/",
    "/seo-audit",
    "/seo-promotion",
    "/pricing",
    "/services",
    "/marketplaces/ozon",
    "/cases/example",
    "/blog/example",
    "/calculator",
    "/en",
  ];
  const inventory = Array.from({ length: discovered }, (_, index) => ({
    url: `https://${host}${semanticPaths[index] ?? `/extra-${index}`}`,
    depth: index === 0 ? 0 : 1,
    fromSitemap: true,
  }));
  const classifiedInventory = inventory.map((item) => classifyAuditObject({
    ...item,
    contentType: "text/html; charset=utf-8",
    fromSitemap: true,
  }));
  const selectedPages = selectAuditSample(inventory, input.selected ?? checked);
  const pages = selectedPages.slice(0, checked).map((selected) => analyzePage({
    url: selected.url,
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
    html: `<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Проверяемая страница ${selected.pageType}</title><meta name="description" content="Подробное описание проверяемой страницы для понятного результата аудита."><link rel="canonical" href="${selected.url}"></head><body><h1>Проверяемая страница</h1></body></html>`,
  }));
  return {
    resultVersion: 2,
    targetUrl: `https://${host}/`,
    finalUrl: `https://${host}/`,
    pageLimit: 10,
    score: { total: 82 },
    grade: "B",
    interpretation: "Legacy internal score",
    pagesChecked: pages.length,
    pagesDiscovered: inventory.length,
    partial: false,
    coverage: pages.length / Math.max(1, selectedPages.length),
    issueCounts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    pages,
    inventory: [
      ...classifiedInventory,
      classifyAuditObject({
        url: `https://${host}/robots.txt`,
        contentType: "text/plain",
        statusCode: 200,
        resourceHint: "robots",
      }),
      classifyAuditObject({
        url: `https://${host}/sitemap.xml`,
        contentType: "application/xml",
        statusCode: 200,
        resourceHint: "sitemap",
      }),
    ],
    selectedPages,
    discoveredUrls: inventory.map((item) => item.url),
    issues: pages.flatMap((page) => page.issues),
    robots: {
      url: `https://${host}/robots.txt`,
      status: "found",
      httpStatus: 200,
      allowedRoot: true,
      sitemapUrls: [`https://${host}/sitemap.xml`],
    },
    sitemap: {
      status: "found",
      filesVisited: 1,
      urls: inventory.map((item) => item.url),
      errors: [],
    },
    performance: null,
    startedAt: "2026-08-30T10:00:00.000Z",
    finishedAt: "2026-08-30T10:00:01.000Z",
  } as const;
}

beforeAll(() => {
  previousEnvironment = { ...process.env };
  mkdirSync(resolve(process.cwd(), "tmp"), { recursive: true });
  process.env.DATABASE_PATH = databasePath;
  process.env.VERCEL = "1";
  process.env.FORMS_ENABLED = "true";
  process.env.AUDIT_RESTORE_SECRET = "stream-test-secret-with-at-least-32-bytes";
  process.env.LEGAL_NAME = "KILENI Test Operator";
  process.env.LEGAL_ADDRESS = "Test address";
  process.env.LEGAL_EMAIL = "legal@example.test";
  process.env.LEGAL_INN = "0000000000";
  process.env.LEGAL_POLICY_VERSION = "2026-08-17";
  process.env.LEGAL_POLICY_URL = "/privacy";
  process.env.LEGAL_CONSENT_URL = "/consent";
});

afterAll(() => {
  process.env = previousEnvironment;
});

beforeEach(() => {
  mocks.runAudit.mockReset();
  mocks.notifyTelegram.mockReset().mockResolvedValue({ sent: false, reason: "not_configured" });
  mocks.sendEmail.mockReset().mockResolvedValue({ sent: false, reason: "not_configured" });
  mocks.consumeRules.mockReset().mockResolvedValue(null);
});

describe("Vercel public audit stream", () => {
  it("returns an accepted event before the crawler completes and then streams observed progress plus restore", async () => {
    let finishAudit: (() => void) | undefined;
    const blocked = new Promise<void>((resolve) => { finishAudit = resolve; });
    mocks.runAudit.mockImplementation(async (_url: string, options: { onEvent?: (event: unknown) => Promise<void> | void }) => {
      await options.onEvent?.({ type: "audit:start" });
      await options.onEvent?.({ type: "discovery:start" });
      await options.onEvent?.({ type: "crawl:progress", crawled: 7, queued: 15, pagesChecked: 7, pagesDiscovered: 22, limit: 100 });
      await blocked;
      return auditResultFixture({ checked: 10, discovered: 22, host: "stream-preview.example" });
    });

    const { POST } = await import("../../app/api/audits/route");
    const responsePromise = POST(new Request("http://localhost/api/audits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: "https://stream-preview.example",
        email: "preview@example.com",
        consent: true,
        authority: true,
        honeypot: "",
        utm: {},
        turnstileToken: "test",
        locale: "ru",
        source: "integration-test",
      }),
    }));

    const early = await Promise.race([
      responsePromise.then((response) => ({ response, timedOut: false as const })),
      new Promise<{ response: null; timedOut: true }>((resolve) => setTimeout(() => resolve({ response: null, timedOut: true }), 75)),
    ]);
    finishAudit?.();

    expect(early.timedOut).toBe(false);
    if (!early.response) throw new Error("Expected streaming response");
    expect(early.response.status).toBe(202);
    expect(early.response.headers.get("content-type")).toMatch(/application\/x-ndjson/iu);

    const events = (await early.response.text()).trim().split("\n").map((line) => JSON.parse(line) as Record<string, unknown>);
    expect(events[0]).toMatchObject({ type: "accepted", status: "running", pageLimit: 10 });
    expect(events).toContainEqual(expect.objectContaining({ type: "progress", status: "crawling_pages", pagesChecked: 7, pagesDiscovered: 22 }));
    expect(events.at(-1)).toMatchObject({ type: "completed", status: "completed" });
    expect(events.at(-1)?.restore).toEqual(expect.any(String));
    const { getAuditByToken } = await import("../../src/db/queries");
    const stored = await getAuditByToken(String(events[0]?.token));
    expect(stored).toMatchObject({
      name: "Получатель отчёта",
      contact: "preview@example.com",
      contactType: "email",
    });
    const { readAdminEntityMetadata } = await import("../../src/db/admin-entity-metadata");
    await expect(readAdminEntityMetadata("audit", stored!.id)).resolves.toMatchObject({
      offerSnapshot: {
        id: "seo-audit-free",
        title: "Бесплатная проверка",
        price: "0 ₽",
      },
    });
    const storedPublicResult = JSON.parse(stored?.publicResultJson ?? "null") as Record<string, unknown>;
    expect(storedPublicResult).toMatchObject({
      resultVersion: 4,
      contractVersion: 3,
      coverageStatus: "sample_complete",
      pagesChecked: 10,
    });
    expect(storedPublicResult.checkedPages).toHaveLength(10);
    expect(storedPublicResult).not.toHaveProperty("score");
    expect(JSON.parse(stored?.fullResultJson ?? "null")).toMatchObject({ resultVersion: 4, contractVersion: 3 });
    expect(stored).toMatchObject({ overallScore: null, grade: null });
    expect(mocks.notifyTelegram).toHaveBeenCalledWith(expect.objectContaining({
      text: expect.stringContaining("Email: preview@example.com"),
    }));
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "preview@example.com" }));
  });

  it("persists a valid partial result after the crawl deadline aborts", async () => {
    vi.useFakeTimers();
    try {
      mocks.runAudit.mockImplementation(async (_url: string, options: { signal?: AbortSignal }) => {
        await vi.advanceTimersByTimeAsync(42_000);
        expect(options.signal?.aborted).toBe(true);
        return {
          ...auditResultFixture({ checked: 3, selected: 10, discovered: 10, host: "deadline-partial.example" }),
          partial: true,
        };
      });

      const { POST } = await import("../../app/api/audits/route");
      const response = await POST(new Request("http://localhost/api/audits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: "https://deadline-partial.example",
          authority: true,
          honeypot: "",
          turnstileToken: "test",
          locale: "ru",
          source: "integration-test",
        }),
      }));

      const events = (await response.text()).trim().split("\n").map((line) => JSON.parse(line) as Record<string, unknown>);
      const { getAuditByToken } = await import("../../src/db/queries");
      expect(events.at(-1)).toMatchObject({ type: "completed", status: "partial" });
      await expect(getAuditByToken(String(events[0]?.token))).resolves.toMatchObject({
        status: "partial",
        partial: 1,
        pagesChecked: 3,
        pagesDiscovered: 10,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects the legacy audit name/contact payload instead of accepting Telegram", async () => {
    const { POST } = await import("../../app/api/audits/route");
    const response = await POST(new Request("http://localhost/api/audits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: "https://legacy-contact.example",
        name: "Legacy name",
        contact: "@kileni_team",
        consent: true,
        authority: true,
        honeypot: "",
        locale: "ru",
      }),
    }));

    expect(response.status).toBe(422);
    expect(mocks.runAudit).not.toHaveBeenCalled();
  });

  it("completes in the browser without email, consent or an email notification", async () => {
    mocks.runAudit.mockResolvedValue(auditResultFixture({ checked: 1, discovered: 1, host: "browser-only.example" }));

    const { POST } = await import("../../app/api/audits/route");
    const response = await POST(new Request("http://localhost/api/audits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: "https://browser-only.example",
        authority: true,
        honeypot: "",
        turnstileToken: "test",
        locale: "ru",
        source: "integration-test",
      }),
    }));

    expect(response.status).toBe(202);
    const events = (await response.text()).trim().split("\n").map((line) => JSON.parse(line) as Record<string, unknown>);
    expect(events.at(-1)).toMatchObject({ type: "completed", status: "completed" });
    const { getAuditByToken } = await import("../../src/db/queries");
    await expect(getAuditByToken(String(events[0]?.token))).resolves.toMatchObject({
      name: "Без контакта",
      contact: "",
      contactType: "none",
    });
    expect(mocks.notifyTelegram).toHaveBeenCalledWith(expect.objectContaining({
      text: expect.not.stringContaining("Email:"),
    }));
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("does not reuse a seven-day cache entry produced by an older audit result version", async () => {
    const { createAuditRecord, completeAuditRecord } = await import("../../src/db/queries");
    const stale = await createAuditRecord({
      originalUrl: "https://stale-cache.example/",
      normalizedDomain: "stale-cache.example",
      locale: "ru",
      name: "Stale cache",
      contact: "stale@example.com",
      contactType: "email",
      ipHash: "stale-ip",
      userAgentHash: "stale-agent",
      source: "integration-test",
      pageLimit: 10,
      utm: {},
      consentVersion: "2026-08-17",
    });
    await completeAuditRecord(stale.id, {
      publicResult: {
        score: 62,
        grade: "C",
        interpretation: "Old result",
        pagesChecked: 10,
        pagesDiscovered: 43,
        partial: true,
        categories: [],
      },
      fullResult: { score: { total: 62 } },
      score: 62,
      grade: "C",
      partial: true,
      pagesDiscovered: 43,
      pagesChecked: 10,
    });
    mocks.runAudit.mockResolvedValue(auditResultFixture({ host: "stale-cache.example" }));

    const { POST } = await import("../../app/api/audits/route");
    const response = await POST(new Request("http://localhost/api/audits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: "https://stale-cache.example",
        email: "fresh@example.com",
        consent: true,
        authority: true,
        honeypot: "",
        utm: {},
        turnstileToken: "test",
        locale: "ru",
        source: "integration-test",
      }),
    }));

    expect(response.status).toBe(202);
    expect(mocks.runAudit).toHaveBeenCalledTimes(1);
    const events = (await response.text()).trim().split("\n").map((line) => JSON.parse(line) as Record<string, unknown>);
    expect(events[0]).toMatchObject({ type: "accepted", status: "running" });
    expect(events.at(-1)).toMatchObject({ type: "completed", status: "completed" });
  });

  it("does not reuse a current full result when its public report still has the legacy contract", async () => {
    const { createAuditRecord, completeAuditRecord } = await import("../../src/db/queries");
    const stalePublic = await createAuditRecord({
      originalUrl: "https://stale-public-cache.example/",
      normalizedDomain: "stale-public-cache.example",
      locale: "ru",
      name: "Stale public cache",
      contact: "stale-public@example.com",
      contactType: "email",
      ipHash: "stale-public-ip",
      userAgentHash: "stale-public-agent",
      source: "integration-test",
      pageLimit: 10,
      utm: {},
      consentVersion: "2026-08-17",
    });
    await completeAuditRecord(stalePublic.id, {
      publicResult: {
        score: 82,
        grade: "B",
        interpretation: "Legacy public result",
        pagesChecked: 10,
        pagesDiscovered: 43,
        partial: true,
        categories: [],
      },
      fullResult: { resultVersion: 2, score: { total: 82 } },
      score: 82,
      grade: "B",
      partial: true,
      pagesDiscovered: 43,
      pagesChecked: 10,
    });
    mocks.runAudit.mockResolvedValue(auditResultFixture({ host: "stale-public-cache.example" }));

    const { POST } = await import("../../app/api/audits/route");
    const response = await POST(new Request("http://localhost/api/audits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: "https://stale-public-cache.example",
        authority: true,
        honeypot: "",
        turnstileToken: "test",
        locale: "ru",
        source: "integration-test",
      }),
    }));

    expect(response.status).toBe(202);
    expect(mocks.runAudit).toHaveBeenCalledTimes(1);
    const events = (await response.text()).trim().split("\n").map((line) => JSON.parse(line) as Record<string, unknown>);
    expect(events[0]).toMatchObject({ type: "accepted", status: "running" });
    expect(events.at(-1)).toMatchObject({ type: "completed", status: "completed" });
  });

  it("reuses only a seven-day cache entry with v4 full and public result contracts", async () => {
    const { createAuditRecord, completeAuditRecord } = await import("../../src/db/queries");
    const current = await createAuditRecord({
      originalUrl: "https://current-cache.example/",
      normalizedDomain: "current-cache.example",
      locale: "ru",
      name: "Current cache",
      contact: "current@example.com",
      contactType: "email",
      ipHash: "current-ip",
      userAgentHash: "current-agent",
      source: "integration-test",
      pageLimit: 10,
      utm: {},
      consentVersion: "2026-08-17",
    });
    const source = auditResultFixture({ discovered: 43, host: "current-cache.example" });
    const finalized = finalizeAuditResultV4({
      auditId: current.publicToken,
      createdAt: "2026-08-30T10:00:00.000Z",
      result: source as unknown as FullAuditResult,
    });
    await completeAuditRecord(current.id, {
      publicResult: finalized.publicResult as unknown as Record<string, unknown>,
      fullResult: finalized.fullResult as unknown as Record<string, unknown>,
      score: null,
      grade: null,
      partial: finalized.partial,
      pagesDiscovered: 43,
      pagesChecked: 10,
    });

    const { POST } = await import("../../app/api/audits/route");
    const response = await POST(new Request("http://localhost/api/audits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: "https://current-cache.example",
        email: "cached@example.com",
        consent: true,
        authority: true,
        honeypot: "",
        utm: {},
        turnstileToken: "test",
        locale: "ru",
        source: "integration-test",
      }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.runAudit).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      cached: true,
      status: "completed",
    });
    expect(mocks.consumeRules).not.toHaveBeenCalled();
  });

  it("consumes quota when a current cache belongs to another path on the same domain", async () => {
    const { createAuditRecord, completeAuditRecord } = await import("../../src/db/queries");
    const current = await createAuditRecord({
      originalUrl: "https://cache-inputs.example/services",
      normalizedDomain: "cache-inputs.example",
      locale: "ru",
      name: "Current cache",
      contact: "",
      contactType: "none",
      ipHash: "cache-inputs-ip",
      userAgentHash: "cache-inputs-agent",
      source: "integration-test",
      pageLimit: 10,
      priorityUrls: ["https://cache-inputs.example/pricing"],
      utm: {},
      consentVersion: "2026-08-17",
    });
    const source = auditResultFixture({ discovered: 20, host: "cache-inputs.example" });
    const finalized = finalizeAuditResultV4({
      auditId: current.publicToken,
      createdAt: "2026-08-30T10:00:00.000Z",
      result: source as unknown as FullAuditResult,
    });
    await completeAuditRecord(current.id, {
      publicResult: finalized.publicResult as unknown as Record<string, unknown>,
      fullResult: finalized.fullResult as unknown as Record<string, unknown>,
      score: null,
      grade: null,
      partial: finalized.partial,
      pagesDiscovered: 20,
      pagesChecked: 10,
    });
    mocks.runAudit.mockResolvedValue(auditResultFixture({ host: "cache-inputs.example" }));

    const { POST } = await import("../../app/api/audits/route");
    const response = await POST(new Request("http://localhost/api/audits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: "https://cache-inputs.example/about",
        priorityUrls: ["https://cache-inputs.example/pricing"],
        authority: true,
        honeypot: "",
        turnstileToken: "test",
        locale: "ru",
        source: "integration-test",
      }),
    }));

    expect(response.status).toBe(202);
    expect(mocks.consumeRules).toHaveBeenCalledTimes(1);
    expect(mocks.runAudit).toHaveBeenCalledTimes(1);
  });

  it("keeps the exact path entered by the user and forwards validated priority URLs", async () => {
    mocks.runAudit.mockResolvedValue(auditResultFixture({ checked: 1, discovered: 1, host: "path-target.example" }));

    const { POST } = await import("../../app/api/audits/route");
    const response = await POST(new Request("http://localhost/api/audits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: "https://path-target.example/services/seo",
        priorityUrls: ["https://path-target.example/pricing"],
        authority: true,
        honeypot: "",
        turnstileToken: "test",
        locale: "ru",
        source: "integration-test",
      }),
    }));

    expect(response.status).toBe(202);
    expect(mocks.runAudit).toHaveBeenCalledWith(
      "https://path-target.example/services/seo",
      expect.objectContaining({ priorityUrls: ["https://path-target.example/pricing"] }),
    );
  });

  it("rejects a priority URL from another host", async () => {
    const { POST } = await import("../../app/api/audits/route");
    const response = await POST(new Request("http://localhost/api/audits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: "https://priority-owner.example/",
        priorityUrls: ["https://other-host.example/pricing"],
        authority: true,
        honeypot: "",
        turnstileToken: "test",
        locale: "ru",
        source: "integration-test",
      }),
    }));

    expect(response.status).toBe(422);
    expect(mocks.runAudit).not.toHaveBeenCalled();
  });
});
