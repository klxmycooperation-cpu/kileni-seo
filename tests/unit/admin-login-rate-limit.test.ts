import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  compare: vi.fn(),
  consumeRules: vi.fn(),
}));

vi.mock("bcryptjs", () => ({ default: { compare: mocks.compare } }));

vi.mock("../../app/api/_lib/http", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../app/api/_lib/http")>();
  return { ...original, mutationGuard: vi.fn(() => null) };
});

vi.mock("../../app/api/_lib/submission", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../app/api/_lib/submission")>();
  return { ...original, consumeRules: mocks.consumeRules };
});

vi.mock("../../src/lib/security/session", () => ({
  adminCookieName: "kileni-admin",
  createAdminSession: vi.fn(() => "session"),
}));

import { POST } from "../../app/api/admin/session/route";

describe("ограничение попыток входа в admin", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_LOGIN", "owner");
    vi.stubEnv("ADMIN_PASSWORD_HASH", "$2a$12$abcdefghijklmnopqrstuuuuuuuuuuuuuuuuuuuuuuuuuuuuu");
    vi.stubEnv("ADMIN_SESSION_SECRET", "a-secure-session-secret-longer-than-32-bytes");
    vi.stubEnv("ADMIN_SESSION_HOURS", "8");
    mocks.compare.mockReset().mockResolvedValue(false);
    mocks.consumeRules.mockReset().mockResolvedValue(null);
  });

  it("не запускает дорогую проверку пароля после достижения лимита", async () => {
    mocks.consumeRules.mockResolvedValueOnce(new Response(null, { status: 429 }));

    const response = await POST(new Request("https://kileni.test/api/admin/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ login: "owner", password: "wrong" }),
    }));

    expect(response.status).toBe(429);
    expect(mocks.consumeRules).toHaveBeenCalledTimes(1);
    expect(mocks.compare).not.toHaveBeenCalled();
  });

  it("учитывает попытку до проверки bcrypt", async () => {
    await POST(new Request("https://kileni.test/api/admin/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ login: "owner", password: "wrong" }),
    }));

    expect(mocks.consumeRules.mock.invocationCallOrder[0]).toBeLessThan(mocks.compare.mock.invocationCallOrder[0]);
  });
});
