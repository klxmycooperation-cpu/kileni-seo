import { describe, expect, it } from "vitest";

import { FREE_AUDIT_PAGE_BASELINE, PUBLIC_AUDIT_PAGE_LIMIT, freeAuditUsageLabel } from "../../src/config/public-audit";

describe("public audit configuration", () => {
  it("keeps the approved baseline and ten-page product cap centralized", () => {
    expect(FREE_AUDIT_PAGE_BASELINE).toBe(1_267);
    expect(PUBLIC_AUDIT_PAGE_LIMIT).toBe(10);
  });

  it.each([
    [1, "страница прошла бесплатную проверку KILENI"],
    [2, "страницы прошли бесплатную проверку KILENI"],
    [5, "страниц прошли бесплатную проверку KILENI"],
    [21, "страница прошла бесплатную проверку KILENI"],
  ] as const)("uses the correct Russian page form for %i", (count, label) => {
    expect(freeAuditUsageLabel("ru", count)).toBe(label);
  });
});
