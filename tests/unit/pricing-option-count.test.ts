import { describe, expect, it } from "vitest";

import { formatPricingOptionCount } from "../../src/lib/pricing/format-option-count";

describe("pricing option count", () => {
  it.each([
    [1, "1 вариант"],
    [2, "2 варианта"],
    [4, "4 варианта"],
    [5, "5 вариантов"],
    [11, "11 вариантов"],
    [14, "14 вариантов"],
    [21, "21 вариант"],
    [22, "22 варианта"],
    [25, "25 вариантов"],
  ])("uses the correct Russian form for %i", (count, expected) => {
    expect(formatPricingOptionCount(count, "ru")).toBe(expected);
  });

  it("uses the singular only for one English option", () => {
    expect(formatPricingOptionCount(1, "en")).toBe("1 option");
    expect(formatPricingOptionCount(2, "en")).toBe("2 options");
  });
});
