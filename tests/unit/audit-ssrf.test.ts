import { describe, expect, it, vi } from "vitest";

import {
  assertPublicUrl,
  isPublicIpAddress,
  type DnsResolver,
} from "../../src/lib/audit/ssrf";
import {
  SafeFetchError,
  safeFetch,
  type SafeTransport,
} from "../../src/lib/audit/fetch";

describe("SSRF address policy", () => {
  it.each(["8.8.8.8", "1.1.1.1", "2001:4860:4860::8888"])(
    "accepts a public address: %s",
    (address) => {
      expect(isPublicIpAddress(address)).toBe(true);
    },
  );

  it.each([
    "0.0.0.0",
    "10.0.0.1",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.1.1",
    "224.0.0.1",
    "::",
    "::1",
    "fc00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "2002:7f00:1::",
  ])("blocks a non-public or transitional address: %s", (address) => {
    expect(isPublicIpAddress(address)).toBe(false);
  });

  it.each([
    "http://127.0.0.1",
    "http://2130706433",
    "http://0x7f000001",
    "http://0177.0.0.1",
    "http://[::ffff:127.0.0.1]",
  ])("blocks literal IP aliases before DNS: %s", async (input) => {
    const resolver: DnsResolver = { resolve: vi.fn() };
    await expect(assertPublicUrl(input, resolver)).rejects.toMatchObject({
      code: "BLOCKED_ADDRESS",
    });
    expect(resolver.resolve).not.toHaveBeenCalled();
  });

  it.each([
    "http://localhost",
    "http://api.localhost",
    "http://printer.local",
    "http://service.internal",
    "http://intranet",
  ])("blocks local hostnames before DNS: %s", async (input) => {
    const resolver: DnsResolver = { resolve: vi.fn() };
    await expect(assertPublicUrl(input, resolver)).rejects.toMatchObject({
      code: "BLOCKED_HOSTNAME",
    });
    expect(resolver.resolve).not.toHaveBeenCalled();
  });

  it("resolves every address and rejects the whole host if one is private", async () => {
    const resolver: DnsResolver = {
      resolve: vi.fn().mockResolvedValue([
        { address: "93.184.216.34", family: 4 },
        { address: "10.0.0.7", family: 4 },
      ]),
    };

    await expect(assertPublicUrl("https://example.com", resolver)).rejects.toMatchObject(
      { code: "BLOCKED_ADDRESS" },
    );
    expect(resolver.resolve).toHaveBeenCalledOnce();
  });

  it("returns the complete validated DNS answer", async () => {
    const answers = [
      { address: "93.184.216.34", family: 4 as const },
      { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 as const },
    ];
    const resolver: DnsResolver = { resolve: vi.fn().mockResolvedValue(answers) };

    await expect(assertPublicUrl("https://example.com", resolver)).resolves.toEqual({
      url: new URL("https://example.com/"),
      addresses: answers,
    });
  });
});

describe("safeFetch", () => {
  const publicResolver: DnsResolver = {
    resolve: vi.fn().mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
    ]),
  };

  it("validates a redirect target before issuing its request", async () => {
    const transport = vi.fn<SafeTransport>().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1/admin" },
      }),
    );

    await expect(
      safeFetch("https://example.com", {}, { resolver: publicResolver, transport }),
    ).rejects.toMatchObject({ code: "BLOCKED_ADDRESS" });
    expect(transport).toHaveBeenCalledOnce();
  });

  it("re-resolves and re-validates every redirect hop", async () => {
    const resolver: DnsResolver = {
      resolve: vi.fn().mockResolvedValue([
        { address: "93.184.216.34", family: 4 },
      ]),
    };
    const transport = vi
      .fn<SafeTransport>()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 301,
          headers: { location: "https://www.example.com/final" },
        }),
      )
      .mockResolvedValueOnce(
        new Response("ok", {
          status: 200,
          headers: { "content-type": "text/plain" },
        }),
      );

    const response = await safeFetch(
      "https://example.com",
      {},
      { resolver, transport },
    );

    expect(response.url).toBe("https://www.example.com/final");
    expect(response.text).toBe("ok");
    expect(response.redirects).toEqual(["https://www.example.com/final"]);
    expect(resolver.resolve).toHaveBeenCalledTimes(2);
  });

  it("stops reading when the configured body limit is crossed", async () => {
    const transport: SafeTransport = async () => new Response("123456");

    await expect(
      safeFetch(
        "https://example.com",
        { maxBodyBytes: 5 },
        { resolver: publicResolver, transport },
      ),
    ).rejects.toBeInstanceOf(SafeFetchError);
    await expect(
      safeFetch(
        "https://example.com",
        { maxBodyBytes: 5 },
        { resolver: publicResolver, transport },
      ),
    ).rejects.toMatchObject({ code: "BODY_TOO_LARGE" });
  });

  it("caps the manual redirect chain at five hops", async () => {
    const transport: SafeTransport = async ({ url }) =>
      new Response(null, {
        status: 302,
        headers: { location: new URL(`/next${url.pathname}`, url).href },
      });

    await expect(
      safeFetch(
        "https://example.com",
        { maxRedirects: 50 },
        { resolver: publicResolver, transport },
      ),
    ).rejects.toMatchObject({ code: "TOO_MANY_REDIRECTS" });
  });

  it("applies the timeout to DNS resolution as well as the response body", async () => {
    const resolver: DnsResolver = {
      resolve: async () => new Promise(() => undefined),
    };

    await expect(
      safeFetch("https://example.com", { timeoutMs: 5 }, { resolver }),
    ).rejects.toMatchObject({ code: "REQUEST_TIMEOUT" });
  });

  it("times out an injected transport even if it ignores the abort signal", async () => {
    const transport: SafeTransport = async () => new Promise(() => undefined);

    await expect(
      safeFetch(
        "https://example.com",
        { timeoutMs: 5 },
        { resolver: publicResolver, transport },
      ),
    ).rejects.toMatchObject({ code: "REQUEST_TIMEOUT" });
  });
});
