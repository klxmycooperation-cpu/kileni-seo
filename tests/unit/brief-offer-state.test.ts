import { describe, expect, it } from "vitest";

import { resolveBriefOfferState, type BriefDraftV2 } from "../../src/lib/brief/offer-state";

const oldDraft: BriefDraftV2 = {
  version: 2,
  service: "audit",
  offerId: "seo-audit-50",
  answers: { company: "KILENI", selectedTier: "Старый пакет" },
  step: 2,
};

describe("brief offer state", () => {
  it("lets an explicit URL offer override an older draft", () => {
    const state = resolveBriefOfferState("?offer=seo-audit-200", oldDraft);
    expect(state).toMatchObject({ service: "audit", offerId: "seo-audit-200", step: 2 });
    expect(state.answers.company).toBe("KILENI");
    expect(state.answers.selectedTier).toBeUndefined();
  });

  it("derives service and marketplace platform from the canonical offer", () => {
    const state = resolveBriefOfferState("?offer=marketplace-ozon-optimization", {
      ...oldDraft,
      service: "seo",
      offerId: "seo-promotion-start",
    });
    expect(state).toMatchObject({
      service: "marketplaces",
      offerId: "marketplace-ozon-optimization",
      answers: expect.objectContaining({ platform: "ozon" }),
    });
  });

  it("does not replace an unknown URL offer with the cheapest option or the draft offer", () => {
    const state = resolveBriefOfferState("?offer=not-a-real-offer", oldDraft);
    expect(state.offerId).toBeUndefined();
    expect(state.invalidOfferId).toBe("not-a-real-offer");
  });

  it("restores a valid draft when the URL has no offer", () => {
    expect(resolveBriefOfferState("", oldDraft)).toMatchObject({
      service: "audit",
      offerId: "seo-audit-50",
      step: 2,
    });
  });

  it("ignores an incompatible or stale draft offer", () => {
    const state = resolveBriefOfferState("", { ...oldDraft, offerId: "missing-offer" });
    expect(state.offerId).toBeUndefined();
  });
});
