import { briefServices, type BriefService } from "../../content/brief";
import { getOffer } from "../../config/offers";

export type BriefAnswers = Record<string, string>;

export type BriefDraftV2 = {
  version: 2;
  service: BriefService;
  offerId?: string;
  answers: BriefAnswers;
  step: number;
};

export type ResolvedBriefOfferState = {
  service: BriefService;
  offerId?: string;
  invalidOfferId?: string;
  answers: BriefAnswers;
  step: number;
};

export const BRIEF_DRAFT_KEY = "kileni-brief:v2";

export function parseBriefDraft(value: string | null): BriefDraftV2 | undefined {
  if (!value) return undefined;
  try {
    const draft = JSON.parse(value) as Partial<BriefDraftV2>;
    if (
      draft.version !== 2
      || typeof draft.service !== "string"
      || !briefServices.some((item) => item.id === draft.service)
      || !draft.answers
      || typeof draft.answers !== "object"
      || Array.isArray(draft.answers)
      || typeof draft.step !== "number"
      || !Number.isFinite(draft.step)
    ) return undefined;
    const offerId = typeof draft.offerId === "string" && getOffer(draft.offerId) ? draft.offerId : undefined;
    return {
      version: 2,
      service: draft.service as BriefService,
      offerId,
      answers: sanitizeAnswers(draft.answers as BriefAnswers),
      step: clampStep(draft.step),
    };
  } catch {
    return undefined;
  }
}

export function resolveBriefOfferState(search: string, draft?: BriefDraftV2): ResolvedBriefOfferState {
  const query = new URLSearchParams(search);
  const hasExplicitOffer = query.has("offer");
  const requestedOfferId = query.get("offer")?.trim() || undefined;
  const requestedOffer = getOffer(requestedOfferId);
  const draftOffer = getOffer(draft?.offerId);
  let service: BriefService = draft?.service ?? "seo";
  let offerId = draftOffer?.id;
  const answers: BriefAnswers = { ...(draft?.answers ?? {}) };
  let invalidOfferId: string | undefined;

  if (hasExplicitOffer) {
    delete answers.selectedTier;
    delete answers.sourceOffer;
    offerId = undefined;
    if (requestedOffer) {
      offerId = requestedOffer.id;
      service = requestedOffer.briefType;
      answers.sourceOffer = requestedOffer.id;
      if (requestedOffer.platform) answers.platform = requestedOffer.platform;
    } else if (requestedOfferId) {
      invalidOfferId = requestedOfferId;
    }
  } else if (draftOffer) {
    service = draftOffer.briefType;
    if (draftOffer.platform) answers.platform = draftOffer.platform;
  }

  const sourceService = query.get("service");
  if (!hasExplicitOffer && sourceService) {
    const direct = briefServiceForRoute(sourceService);
    if (direct) {
      service = direct;
      answers.sourceService = sourceService;
    }
  }

  const platform = query.get("platform");
  if (!hasExplicitOffer && platform && isPlatform(platform)) {
    service = "marketplaces";
    answers.platform = platform;
  }

  const selectedTier = query.get("tier");
  if (!hasExplicitOffer && selectedTier) answers.selectedTier = selectedTier;

  return {
    service,
    offerId,
    invalidOfferId,
    answers,
    step: clampStep(draft?.step ?? 0),
  };
}

function sanitizeAnswers(value: BriefAnswers): BriefAnswers {
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

function clampStep(step: number): number {
  return Math.max(0, Math.min(Math.floor(step), 3));
}

function isPlatform(value: string): value is "wildberries" | "ozon" | "yandex-market" | "megamarket" | "multiple" {
  return ["wildberries", "ozon", "yandex-market", "megamarket", "multiple"].includes(value);
}

function briefServiceForRoute(route: string): BriefService | undefined {
  const map: Record<string, BriefService> = {
    "seo-audit": "audit",
    "seo-promotion": "seo",
    marketplaces: "marketplaces",
    "web-development": "development",
    "yandex-ads": "ads",
    "content-materials": "custom",
    "custom-task": "custom",
  };
  return map[route];
}
