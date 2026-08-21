import { describe, expect, it } from "vitest";

import { localizedMarketplaceOffers, marketplaceOffers } from "../../src/config/marketplace-offers";
import { serviceQuestions } from "../../src/content/brief";
import { getMarketplaceResultExample } from "../../src/content/marketplace-result-examples";
import { marketplaceName, marketplacePlatforms } from "../../src/content/marketplaces";
import { additionalServices } from "../../src/content/service-additions";

const ids = ["wildberries", "ozon", "yandex-market", "megamarket"] as const;

describe("marketplace commercial journey", () => {
  it("publishes three bounded offers for every supported platform", () => {
    expect(marketplacePlatforms.map((platform) => platform.id)).toEqual(ids);
    for (const id of ids) {
      expect(marketplaceOffers[id]).toHaveLength(3);
      expect(marketplaceOffers[id].filter((offer) => offer.featured)).toHaveLength(1);
      expect(localizedMarketplaceOffers(id, "ru").every((offer) => offer.current.length > 0)).toBe(true);
      expect(localizedMarketplaceOffers(id, "en").every((offer) => offer.current === "Individual estimate")).toBe(true);
    }
  });

  it("keeps English platform names and official-document labels free from Cyrillic", () => {
    for (const platform of marketplacePlatforms) {
      expect(marketplaceName(platform, "en")).not.toMatch(/[А-Яа-яЁё]/u);
      expect(platform.docs.map((doc) => doc.labelEn).join(" ")).not.toMatch(/[А-Яа-яЁё]/u);
    }
  });

  it("carries all four platforms into the short brief", () => {
    const platformQuestion = serviceQuestions.marketplaces.find((question) => question.key === "platform");
    const values = platformQuestion?.options?.map((option) => option.value) ?? [];
    for (const id of ids) expect(values).toContain(id);
    expect(values).toContain("multiple");
    expect(values).not.toContain("both");
  });

  it("shows a concrete result example for each platform in both languages", () => {
    const expectedRows = ["search-phrases", "card-fields", "image-scenario", "files", "publishing-rules"];
    for (const id of ids) {
      for (const locale of ["ru", "en"] as const) {
        const example = getMarketplaceResultExample(id, locale);
        expect(example.rows.map((row) => row.key)).toEqual(expectedRows);
        expect(example.before.items).toHaveLength(3);
        expect(example.after.items).toHaveLength(3);
        expect(example.disclaimer.length).toBeGreaterThan(40);
      }
    }
  });

  it("does not publish truncated custom-task copy", () => {
    const copy = JSON.stringify(additionalServices.ru["custom-task"].content);
    expect(copy).not.toContain("резуль.");
    expect(copy).not.toContain("резуль;");
    expect(copy).not.toContain("Проверяемый резуль\"");
    expect(copy).toContain("желаемый результат");
  });
});
