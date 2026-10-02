import { describe, expect, it } from "vitest";

import { canonicalizeBriefOffer } from "../../src/lib/brief/offer-payload";

describe("canonicalizeBriefOffer", () => {
  it("replaces forged terms even when the offer only appears inside answers", () => {
    expect(canonicalizeBriefOffer({ locale: "ru", service: "seo", answers: {
      sourceOffer: "seo-promotion-growth", selectedOfferPrice: "1 ₽", selectedOfferScope: "999 регионов",
    } })).toMatchObject({ ok: true, answers: {
      sourceOffer: "seo-promotion-growth", selectedOfferPrice: "35 000 ₽ в месяц", selectedOfferScope: "До 2 регионов, 10 страниц и 2 материала",
    } });
  });

  it("removes unsupported catalogue terms from a generic brief", () => {
    expect(canonicalizeBriefOffer({ locale: "ru", service: "audit", answers: {
      company: "KILENI", selectedOfferTitle: "Подставленный тариф", selectedOfferPrice: "1 ₽", selectedOfferScope: "999 страниц",
    } })).toEqual({ ok: true, answers: { company: "KILENI" } });
  });
  it("adds canonical offer facts instead of trusting client price text", () => {
    expect(canonicalizeBriefOffer({
      locale: "ru",
      service: "audit",
      offerId: "seo-audit-200",
      answers: { clientPrice: "1 ₽" },
    })).toMatchObject({
      ok: true,
      answers: {
        clientPrice: "1 ₽",
        sourceOffer: "seo-audit-200",
        selectedOfferTitle: "Технический SEO-аудит",
        selectedOfferPrice: "29 000 ₽",
        selectedOfferScope: "До 200 страниц",
        selectedOfferDuration: "5–7 рабочих дней",
      },
    });
  });

  it("rejects an unknown offer", () => {
    expect(canonicalizeBriefOffer({ locale: "ru", service: "audit", offerId: "missing", answers: {} })).toEqual({
      ok: false,
      reason: "unknown_offer",
    });
  });

  it("rejects an offer that does not belong to the chosen brief type", () => {
    expect(canonicalizeBriefOffer({ locale: "ru", service: "seo", offerId: "seo-audit-200", answers: {} })).toEqual({
      ok: false,
      reason: "service_mismatch",
    });
  });

  it("keeps a generic brief generic", () => {
    expect(canonicalizeBriefOffer({ locale: "ru", service: "audit", answers: { company: "KILENI" } })).toEqual({
      ok: true,
      answers: { company: "KILENI" },
    });
  });
});
