import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runAudit: vi.fn(),
  notifyTelegram: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("../../src/lib/audit", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/lib/audit")>();
  return {
    ...original,
    assertPublicUrl: vi.fn(async (url: URL) => ({ url })),
    runAudit: mocks.runAudit,
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

const databasePath = resolve(process.cwd(), `tmp/test-audit-vercel-stream-${process.pid}.sqlite`);
let previousEnvironment: NodeJS.ProcessEnv;

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
      return {
        score: { total: 82 },
        grade: "B",
        partial: false,
        pagesDiscovered: 22,
        pagesChecked: 7,
        pages: [],
        issues: [],
      };
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
    await expect(getAuditByToken(String(events[0]?.token))).resolves.toMatchObject({
      name: "Получатель отчёта",
      contact: "preview@example.com",
      contactType: "email",
    });
    expect(mocks.notifyTelegram).toHaveBeenCalledWith(expect.objectContaining({
      text: expect.stringContaining("Email: preview@example.com"),
    }));
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "preview@example.com" }));
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
    mocks.runAudit.mockResolvedValue({
      resultVersion: 2,
      score: { total: 82 },
      grade: "B",
      partial: false,
      pagesDiscovered: 1,
      pagesChecked: 1,
      pages: [],
      issues: [],
    });

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
    mocks.runAudit.mockResolvedValue({
      resultVersion: 2,
      score: { total: 82 },
      grade: "B",
      partial: false,
      pagesDiscovered: 10,
      pagesChecked: 10,
      pages: [],
      issues: [],
    });

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
    mocks.runAudit.mockResolvedValue({
      resultVersion: 2,
      score: { total: 88 },
      grade: "A",
      partial: false,
      pagesDiscovered: 10,
      pagesChecked: 10,
      pages: [],
      issues: [],
    });

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

  it("reuses a seven-day cache entry with current full and public result contracts", async () => {
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
    await completeAuditRecord(current.id, {
      publicResult: {
        resultVersion: 2,
        score: 82,
        grade: "B",
        interpretation: "Current result",
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
      status: "partial",
    });
  });
});
