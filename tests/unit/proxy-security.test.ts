import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "../../proxy";

describe("security proxy", () => {
  it("does not upgrade local HTTP assets to HTTPS", async () => {
    const response = await proxy(new NextRequest("http://localhost:3000/"));

    expect(response.headers.get("content-security-policy")).not.toContain(
      "upgrade-insecure-requests",
    );
  });

  it("keeps insecure-request upgrades on HTTPS", async () => {
    const response = await proxy(new NextRequest("https://kileni.example/"));

    expect(response.headers.get("content-security-policy")).toContain(
      "upgrade-insecure-requests",
    );
  });

  it("returns a readable noindex 400 for a malformed audit page URL", async () => {
    const response = await proxy(new NextRequest("https://kileni.example/audit/bad-token"));
    const html = await response.text();

    expect(response.status).toBe(400);
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(html).toContain("Некорректная ссылка");
    expect(html).toContain('href="/"');
  });
});
