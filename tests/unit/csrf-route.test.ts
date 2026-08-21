import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "../../app/api/csrf/route";
import { csrfCookieName } from "../../src/lib/security/csrf";

describe("GET /api/csrf", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sets the full cookie contract for a local HTTP production smoke host", async () => {
    const response = GET(new Request("http://localhost:3000/api/csrf", {
      headers: { host: "localhost:3000" },
    }));
    const setCookie = response.headers.get("set-cookie");
    const body = await response.clone().json() as { token: string };

    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain(`${csrfCookieName}=${body.token}`);
    expect(setCookie).toMatch(/;\s*httponly(?:;|$)/iu);
    expect(setCookie).toMatch(/;\s*samesite=strict(?:;|$)/iu);
    expect(setCookie).toMatch(/;\s*path=\/(?:;|$)/iu);
    expect(setCookie).toMatch(/;\s*max-age=7200(?:;|$)/iu);
    expect(setCookie).not.toMatch(/;\s*secure(?:;|$)/iu);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("pragma")).toBe("no-cache");
  });

  it("keeps the cookie usable when standalone is bound to a wildcard address", () => {
    const response = GET(new Request("http://0.0.0.0:3000/api/csrf", {
      headers: { host: "127.0.0.1:3000" },
    }));

    expect(response.headers.get("set-cookie")).not.toMatch(/;\s*secure(?:;|$)/iu);
  });

  it("keeps cookies Secure for a public HTTP host", () => {
    const response = GET(new Request("http://kileni.example/api/csrf"));

    expect(response.headers.get("set-cookie")).toMatch(/;\s*secure(?:;|$)/iu);
  });

  it("sets a Secure cookie when the effective forwarded protocol is HTTPS", () => {
    const request = new Request("http://web:3000/api/csrf", {
      headers: { "x-forwarded-proto": "https" },
    });
    const response = GET(request);

    expect(response.headers.get("set-cookie")).toMatch(/;\s*secure(?:;|$)/iu);
  });

  it.each(["http, https", "http,", ",http", "ftp", "not-a-protocol"])(
    "fails closed for ambiguous or invalid forwarded protocol %s",
    (forwardedProtocol) => {
      const request = new Request("http://localhost:3000/api/csrf", {
        headers: { "x-forwarded-proto": forwardedProtocol },
      });
      const response = GET(request);

      expect(response.headers.get("set-cookie")).toMatch(/;\s*secure(?:;|$)/iu);
    },
  );

  it("does not treat a loopback URL as local when Host is public", () => {
    const request = new Request("http://localhost:3000/api/csrf", {
      headers: { host: "kileni.example" },
    });
    const response = GET(request);

    expect(response.headers.get("set-cookie")).toMatch(/;\s*secure(?:;|$)/iu);
  });

  it.each([undefined, "evil.example@localhost", "localhost/path", "localhost:99999"])(
    "fails closed when Host is missing or malformed: %s",
    (host) => {
      const headers = host ? { host } : undefined;
      const response = GET(new Request("http://localhost:3000/api/csrf", { headers }));

      expect(response.headers.get("set-cookie")).toMatch(/;\s*secure(?:;|$)/iu);
    },
  );

  it("sets a Secure cookie for a direct HTTPS request", () => {
    const response = GET(new Request("https://kileni.example/api/csrf"));

    expect(response.headers.get("set-cookie")).toMatch(/;\s*secure(?:;|$)/iu);
  });
});
