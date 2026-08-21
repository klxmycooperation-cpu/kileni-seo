import { describe, expect, it } from "vitest";

import { selectPricingTiers } from "../../src/config/pricing-tiers";

describe("pricing tier selection", () => {
  it("keeps exactly three distinct levels and preserves the recommended option", () => {
    const tiers = selectPricingTiers([
      { name: "Start", featured: false },
      { name: "Growth", featured: true },
      { name: "Full", featured: false },
      { name: "Extra", featured: false },
    ]);

    expect(tiers).toHaveLength(3);
    expect(tiers.map((tier) => tier.name)).toEqual(["Start", "Growth", "Extra"]);
    expect(tiers.filter((tier) => tier.featured)).toHaveLength(1);
  });

  it("does not invent a paid package when a category has fewer than three real options", () => {
    const tiers = selectPricingTiers([
      { name: "Setup", featured: true },
      { name: "Support", featured: false },
    ]);

    expect(tiers).toHaveLength(2);
  });
});
