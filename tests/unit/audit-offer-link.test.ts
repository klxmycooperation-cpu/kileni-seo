import { describe, expect, it } from "vitest";

import { briefOfferHref } from "../../src/components/pages/AuditProgressPage";

describe("audit result offer links", () => {
  it("carries only the public audit token needed for same-browser prefill", () => {
    const href = briefOfferHref("ru", "example.com", "seo-audit-implementation", "public-token-123");
    const url = new URL(href, "https://kileni.example");

    expect(url.pathname).toBe("/brief");
    expect(url.searchParams.get("audit")).toBe("public-token-123");
    expect(url.searchParams.get("domain")).toBe("example.com");
    expect(url.searchParams.get("offer")).toBe("seo-audit-implementation");
    expect(url.searchParams.has("discount")).toBe(false);
    expect(url.searchParams.has("name")).toBe(false);
    expect(url.searchParams.has("contact")).toBe(false);
  });
});
