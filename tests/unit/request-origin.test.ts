import { afterEach, describe, expect, it } from "vitest";

import { requestOriginIsAllowed } from "../../src/lib/security/request";

const originalBaseUrl = process.env.APP_BASE_URL;

afterEach(() => {
  if (originalBaseUrl === undefined) delete process.env.APP_BASE_URL;
  else process.env.APP_BASE_URL = originalBaseUrl;
});

describe("requestOriginIsAllowed", () => {
  it("accepts a browser loopback origin when the standalone server reports its internal bind address", () => {
    delete process.env.APP_BASE_URL;
    const request = new Request("http://0.0.0.0:3000/api/audits", {
      headers: {
        host: "127.0.0.1:3000",
        origin: "http://127.0.0.1:3000",
      },
    });

    expect(requestOriginIsAllowed(request)).toBe(true);
  });

  it("does not trust an arbitrary Host header as an allowed origin", () => {
    delete process.env.APP_BASE_URL;
    const request = new Request("http://0.0.0.0:3000/api/audits", {
      headers: {
        host: "attacker.example",
        origin: "https://attacker.example",
      },
    });

    expect(requestOriginIsAllowed(request)).toBe(false);
  });
});
