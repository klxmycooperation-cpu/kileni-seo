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
  if (!payload.offerId) return { ok: true, answers: payload.answers };
  const offer = getOffer(payload.offerId);
  if (!offer) return { ok: false, reason: "unknown_offer" };
  if (offer.briefType !== payload.service) return { ok: false, reason: "service_mismatch" };
  const localized = localizedOffer(offer, payload.locale);
  return {
    ok: true,
    answers: {
      ...payload.answers,
      sourceOffer: offer.id,
      selectedOfferTitle: localized.title,
      selectedOfferPrice: formatOfferPrice(offer, payload.locale),
      selectedOfferScope: localized.scope,
      selectedOfferDuration: localized.duration,
      selectedOfferResult: localized.result,
    },
  };
}
