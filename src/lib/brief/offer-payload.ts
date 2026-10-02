import type { Locale } from "../../config/site";
import { formatOfferPrice, getOffer, localizedOffer } from "../../config/offers";
import type { BriefService } from "../../content/brief";

type BriefAnswerValue = string | number | boolean | string[];

type Payload = {
  locale: Locale;
  service: BriefService;
  offerId?: string;
  answers: Record<string, BriefAnswerValue>;
};

type Result =
  | { ok: true; answers: Record<string, BriefAnswerValue> }
  | { ok: false; reason: "unknown_offer" | "service_mismatch" };

export function canonicalizeBriefOffer(payload: Payload): Result {
  const offerId = payload.offerId || (typeof payload.answers.sourceOffer === "string" ? payload.answers.sourceOffer.trim() : "");
  // Catalogue terms are server-owned, including briefs from older clients.
  const answers = Object.fromEntries(Object.entries(payload.answers).filter(([key]) =>
    key !== "sourceOffer" && !/^selectedOffer(?:Title|Price|Scope|Duration|Result)$/u.test(key),
  ));
  if (!offerId) return { ok: true, answers };
  const offer = getOffer(offerId);
  if (!offer) return { ok: false, reason: "unknown_offer" };
  if (offer.briefType !== payload.service) return { ok: false, reason: "service_mismatch" };
  const localized = localizedOffer(offer, payload.locale);
  return {
    ok: true,
    answers: {
      ...answers,
      sourceOffer: offer.id,
      selectedOfferTitle: localized.title,
      selectedOfferPrice: formatOfferPrice(offer, payload.locale),
      selectedOfferScope: localized.scope,
      selectedOfferDuration: localized.duration,
      selectedOfferResult: localized.result,
    },
  };
}
