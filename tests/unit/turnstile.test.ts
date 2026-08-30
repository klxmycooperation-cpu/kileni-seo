import { afterEach, describe, expect, it, vi } from "vitest";

import { verifyTurnstile } from "../../src/lib/security/turnstile";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("optional Turnstile verification", () => {
  it("is disabled without a secret key", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyTurnstile(undefined, "203.0.113.8")).resolves.toEqual({ configured: false, ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails closed when configured but the token is missing", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    await expect(verifyTurnstile(undefined)).resolves.toEqual({ configured: true, ok: false, reason: "missing-token" });
  });

  it("accepts a successful submit action and passes the remote IP", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    vi.stubEnv("APP_BASE_URL", "https://kileni.test");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, action: "submit", hostname: "kileni.test" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyTurnstile("client-token", "203.0.113.8")).resolves.toEqual({ configured: true, ok: true, hostname: "kileni.test" });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(init.body)).toContain("response=client-token");
    expect(String(init.body)).toContain("remoteip=203.0.113.8");
  });

  it("rejects a failed or mismatched action", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, action: "login" }), { status: 200 })));
    await expect(verifyTurnstile("client-token")).resolves.toEqual({ configured: true, ok: false, reason: "rejected" });
  });

  it("rejects a token issued for another hostname", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    vi.stubEnv("APP_BASE_URL", "https://kileni-seo.ru");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, action: "submit", hostname: "attacker.example" }), { status: 200 })));

    await expect(verifyTurnstile("client-token")).resolves.toEqual({ configured: true, ok: false, reason: "rejected" });
  });
});
