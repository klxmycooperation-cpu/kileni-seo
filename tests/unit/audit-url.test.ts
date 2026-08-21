import { describe, expect, it } from "vitest";

import { normalizeAuditDomain, normalizeTargetUrl } from "../../src/lib/audit/url";

describe("normalizeTargetUrl", () => {
  it("normalizes a bare IDN host to an HTTPS punycode URL", () => {
    expect(normalizeTargetUrl("  пример.рф/каталог#top").href).toBe(
      "https://xn--e1afmkfd.xn--p1ai/%D0%BA%D0%B0%D1%82%D0%B0%D0%BB%D0%BE%D0%B3",
    );
  });

  it.each([
    "ftp://example.com",
    "file:///etc/passwd",
    "https://example.com:8443",
    "https://user:password@example.com",
  ])("rejects an unsafe target form: %s", (input) => {
    expect(() => normalizeTargetUrl(input)).toThrow();
  });

  it("allows only the explicit web ports and removes their default spelling", () => {
    expect(normalizeTargetUrl("http://EXAMPLE.com:80/a").href).toBe(
      "http://example.com/a",
    );
    expect(normalizeTargetUrl("https://example.com:443").href).toBe(
      "https://example.com/",
    );
    expect(normalizeTargetUrl("http://example.com:443").href).toBe(
      "http://example.com:443/",
    );
    expect(normalizeTargetUrl("example.com:80/path").href).toBe(
      "https://example.com:80/path",
    );
  });

  it("uses one audit/cache key for www and non-www mirrors", () => {
    expect(normalizeAuditDomain("WWW.Example.COM.")).toBe("example.com");
    expect(normalizeAuditDomain("example.com")).toBe("example.com");
  });
});
