import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "../../proxy";

describe("security proxy", () => {
  it("does not upgrade local HTTP assets to HTTPS", () => {
    const response = proxy(new NextRequest("http://localhost:3000/"));

    expect(response.headers.get("content-security-policy")).not.toContain(
      "upgrade-insecure-requests",
    );
  });

  it("keeps insecure-request upgrades on HTTPS", () => {
    const response = proxy(new NextRequest("https://kileni.example/"));

    expect(response.headers.get("content-security-policy")).toContain(
      "upgrade-insecure-requests",
    );
  });
});
