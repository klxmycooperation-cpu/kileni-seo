import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  hasActiveDomainAudit: vi.fn(),
  failStaleAudits: vi.fn(),
  purgeExpiredAudits: vi.fn(),
  purgeExpiredRateLimits: vi.fn(),
}));

vi.mock("../../src/db/queries", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/db/queries")>()),
  hasActiveDomainAudit: mocks.hasActiveDomainAudit,
  failStaleAudits: mocks.failStaleAudits,
  purgeExpiredAudits: mocks.purgeExpiredAudits,
}));

vi.mock("../../src/lib/security/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/lib/security/rate-limit")>()),
  purgeExpiredRateLimits: mocks.purgeExpiredRateLimits,
}));

vi.mock("../../src/lib/security/turnstile", () => ({
  verifyTurnstile: vi.fn(async () => ({ configured: false, ok: true })),
}));

vi.mock("../../src/lib/audit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/lib/audit")>()),
  assertPublicUrl: vi.fn(async (url: URL) => ({ url })),
}));

vi.mock("../../app/api/_lib/http", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../app/api/_lib/http")>()),
  mutationGuard: vi.fn(() => null),
}));

let previousEnvironment: NodeJS.ProcessEnv;
let postAudit: Awaited<typeof import("../../app/api/audits/route")>["POST"];

beforeAll(async () => {
  previousEnvironment = { ...process.env };
  process.env.FORMS_ENABLED = "true";
  process.env.AUDIT_ENABLED = "true";
  delete process.env.VERCEL;
  vi.resetModules();
  ({ POST: postAudit } = await import("../../app/api/audits/route"));
});

afterAll(() => {
  process.env = previousEnvironment;
});

beforeEach(() => {
  mocks.hasActiveDomainAudit.mockReset().mockRejectedValue(new Error("temporary database timeout"));
  mocks.failStaleAudits.mockReset().mockResolvedValue(0);
  mocks.purgeExpiredAudits.mockReset().mockResolvedValue(0);
  mocks.purgeExpiredRateLimits.mockReset().mockResolvedValue(0);
});

describe("audit submission resilience", () => {
  it("returns a JSON 503 when a pre-creation database check is temporarily unavailable", async () => {
    const response = await postAudit(new Request("http://localhost/api/audits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: "https://example.com",
        email: "recipient@example.test",
        consent: true,
        authority: true,
        honeypot: "",
        turnstileToken: "test",
        locale: "ru",
        source: "resilience-test",
        utm: {},
      }),
    }));

    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toMatchObject({
      error: "AUDIT_TEMPORARILY_UNAVAILABLE",
      message: "Сервис проверки временно недоступен. Повторите попытку через минуту.",
    });
  });
});
