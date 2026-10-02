import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "../../app/api/public/turnstile-key/route";

afterEach(() => vi.unstubAllEnvs());

describe("public Turnstile runtime configuration", () => {
  it("reads the current public key for each request without exposing the secret", async () => {
    vi.stubEnv("TURNSTILE_SITE_KEY", " first-public-key ");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "private-secret");
    const first = await GET();
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ siteKey: "first-public-key" });
    expect(first.headers.get("cache-control")).toContain("no-store");

    vi.stubEnv("TURNSTILE_SITE_KEY", "second-public-key");
    expect(await (await GET()).json()).toEqual({ siteKey: "second-public-key" });
  });

  it("reports disabled verification only when both keys are absent", async () => {
    vi.stubEnv("TURNSTILE_SITE_KEY", "");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ siteKey: null });
  });

  it.each(["TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY"])("fails closed when only %s is configured", async (name) => {
    vi.stubEnv("TURNSTILE_SITE_KEY", "");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    vi.stubEnv(name, "configured-key");
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ siteKey: null });
  });
});
