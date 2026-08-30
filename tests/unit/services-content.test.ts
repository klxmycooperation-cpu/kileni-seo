import { describe, expect, it } from "vitest";

import { getService, serviceSlugs } from "../../src/content/services";
import { offersForService, type OfferService } from "../../src/config/offers";

describe("service information architecture", () => {
  it("keeps the six public service directions with a distinct explanatory visual", () => {
    expect(serviceSlugs).toEqual([
      "seo-audit",
      "seo-promotion",
      "web-development",
      "yandex-ads",
      "content-materials",
      "custom-task",
    ]);

    const visuals = serviceSlugs.map((slug) => getService("ru", slug)?.visual);
    expect(visuals.every(Boolean)).toBe(true);
    expect(new Set(visuals.map((visual) => visual?.kind)).size).toBeGreaterThanOrEqual(5);
    expect(visuals.every((visual) => visual && visual.signals.length >= 3)).toBe(true);
  });

  it("gives every service the full decision-making content structure in both languages", () => {
    for (const locale of ["ru", "en"] as const) {
      for (const slug of serviceSlugs) {
        const service = getService(locale, slug);
        expect(service, `${locale}/${slug}`).toBeDefined();
        expect(service?.problem.length).toBeGreaterThan(80);
        expect(service?.diagnosis.length).toBeGreaterThanOrEqual(3);
        expect(service?.outcomes.length).toBeGreaterThanOrEqual(3);
        expect(service?.work.length).toBeGreaterThanOrEqual(4);
        expect(service?.packages.length).toBe(offersForService(slug as OfferService).length);
        expect(service?.packages.length).toBeGreaterThan(0);
        expect(service?.duration.length).toBeGreaterThan(20);
        expect(service?.exclusions.length).toBeGreaterThanOrEqual(3);
        expect(service?.faq.length).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
