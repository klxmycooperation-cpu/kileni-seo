import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runAudit: vi.fn(),
}));

vi.mock("../../src/lib/audit", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/lib/audit")>();
  return {
    ...original,
    assertPublicUrl: vi.fn(async (url: URL) => ({ url })),
    runAudit: mocks.runAudit,
    toPublicAuditResult: vi.fn((result: { pagesChecked: number; pagesDiscovered: number; partial: boolean }) => ({
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
  notifyTelegram: vi.fn(async () => ({ sent: false, reason: "not_configured" })),
}));

vi.mock("../../src/lib/notifications/email", () => ({
  sendEmail: vi.fn(async () => ({ sent: false, reason: "not_configured" })),
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
  process.env.LEGAL_POLICY_VERSION = "2026-08-17";
});

afterAll(() => {
  process.env = previousEnvironment;
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
        name: "Preview test",
        contact: "preview@example.com",
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
  });
});
