import { getOffer, type Offer } from "../../config/offers";
import type { BriefService } from "../../content/brief";
import type { AssistantTopic } from "../site-assistant";
import { matchingPlanOffers, planChoiceRows, type AssistantPlan } from "../site-assistant-plan";
import { resolveBriefOfferState, type BriefAnswers, type BriefDraftV2 } from "./offer-state";
import { BRIEF_ANSWER_LIMIT, BRIEF_WISHES_LIMIT } from "./answer-limits";

export type AssistantOfferIssue = "unavailable" | "changed" | "unverified";
export type AssistantBriefHandoff = {
  version: 1;
  createdAt: number;
  topic: string;
  offerId?: string;
  offerFingerprint?: string;
  offerIssue?: AssistantOfferIssue;
  summary: string;
  task: string;
  timing?: string;
  budget?: number;
  cards?: number;
  requirements?: string;
};
export type AssistantBriefReadResult =
  | { status: "ready"; data: AssistantBriefHandoff }
  | { status: "missing" | "invalid" | "expired" | "unavailable"; data: null; recoverySummary?: string };
export type AssistantBriefConflict = { key: string; current: string; incoming: string };
export type AssistantBriefImportPolicy = "keep" | "apply";

const prefix = "kileni-assistant-brief:";
const lifetime = 86_400_000;
export const ASSISTANT_SUMMARY_LIMIT = BRIEF_WISHES_LIMIT;
const validToken = (token: string) => /^[\w-]{1,100}$/u.test(token);
const platforms = ["wildberries", "ozon", "yandex-market"];
const serviceMap: Record<string, BriefService> = {
  "seo-audit": "audit", "seo-promotion": "seo", "web-development": "development",
  "yandex-ads": "ads", "content-materials": "custom", "custom-task": "custom",
  marketplaces: "marketplaces", wildberries: "marketplaces", ozon: "marketplaces", "yandex-market": "marketplaces",
};

function publicOfferForTopic(id: string | undefined, topic: string): Offer | undefined {
  const offer = getOffer(id);
  return offer?.availability === "public" && (offer.platform ? offer.platform === topic : offer.service === topic) ? offer : undefined;
}

// A revision marker for published terms, not a security credential.
function offerFingerprint(offer: Offer): string {
  const terms = JSON.stringify({
    id: offer.id, service: offer.service, platform: offer.platform, availability: offer.availability,
    title: offer.title, price: offer.price, priceType: offer.priceType, billingUnit: offer.billingUnit,
    scope: offer.scope, duration: offer.duration, features: offer.features, exclusions: offer.exclusions,
    result: offer.result, contract: offer.scopeContract, briefType: offer.briefType,
  });
  let hash = 2166136261;
  for (let index = 0; index < terms.length; index++) hash = Math.imul(hash ^ terms.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function createAssistantBriefHandoff(plan: AssistantPlan, catalog: AssistantTopic[], now = Date.now()): AssistantBriefHandoff {
  const topic = catalog.find((item) => item.id === plan.topic);
  const publishedOffer = publicOfferForTopic(plan.offer, topic?.id ?? "custom-task");
  const verifiedOffer = publishedOffer && matchingPlanOffers(plan, catalog).some((item) => item.id === publishedOffer.id) ? publishedOffer : undefined;
  const summaryPlan = { ...plan, offer: verifiedOffer?.id };
  const rows = planChoiceRows(summaryPlan, catalog);
  const summary = rows.map((row) => `${row.label}: ${row.value}`).join("\n");
  return {
    version: 1, createdAt: now, topic: topic?.id ?? "custom-task",
    offerId: verifiedOffer?.id, offerFingerprint: verifiedOffer ? offerFingerprint(verifiedOffer) : undefined,
    ...(plan.offer && !verifiedOffer ? { offerIssue: publishedOffer ? "unverified" as const : "unavailable" as const } : {}),
    summary: summary || "Состав работ нужно согласовать с командой.", task: rows.find((row) => row.label === "Ожидаемый результат")?.value ?? plan.task ?? "",
    timing: plan.timing, budget: plan.budget,
    cards: plan.fullScope?.field === "cards" ? plan.fullScope.count : plan.cards,
    ...(plan.topic === "web-development" ? { requirements: rows.find((row) => row.label === "Обязательные требования")?.value } : {}),
  };
}

export function assistantBriefHref(data: AssistantBriefHandoff, token: string): string {
  const query = new URLSearchParams({ assistant: token });
  if (data.offerId) query.set("offer", data.offerId);
  else {
    query.set("offer", "");
    query.set(platforms.includes(data.topic) ? "platform" : "service", data.topic);
  }
  return `/brief?${query.toString()}`;
}

function validHandoff(value: unknown): value is AssistantBriefHandoff {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const data = value as Partial<AssistantBriefHandoff>;
  return data.version === 1 && typeof data.createdAt === "number" && Number.isFinite(data.createdAt) && data.createdAt >= 0
    && typeof data.topic === "string" && Object.hasOwn(serviceMap, data.topic)
    && typeof data.summary === "string" && Boolean(data.summary.trim()) && data.summary.length <= ASSISTANT_SUMMARY_LIMIT
    && typeof data.task === "string" && data.task.length <= 3000
    && (data.timing === undefined || typeof data.timing === "string" && data.timing.length <= 500)
    && (data.budget === undefined || typeof data.budget === "number" && Number.isFinite(data.budget) && data.budget >= 0 && data.budget <= 1e9)
    && (data.cards === undefined || typeof data.cards === "number" && Number.isInteger(data.cards) && data.cards >= 1 && data.cards <= 999999)
    && (data.requirements === undefined || typeof data.requirements === "string" && data.requirements.length <= BRIEF_ANSWER_LIMIT)
    && (data.offerId === undefined || typeof data.offerId === "string" && /^[\w-]{1,120}$/u.test(data.offerId))
    && (data.offerFingerprint === undefined || typeof data.offerFingerprint === "string" && /^[a-f\d]{8}$/u.test(data.offerFingerprint))
    && (data.offerIssue === undefined || !data.offerId && ["unavailable", "changed", "unverified"].includes(data.offerIssue));
}

function currentHandoff(data: AssistantBriefHandoff): AssistantBriefHandoff {
  if (!data.offerId) return data;
  const offer = publicOfferForTopic(data.offerId, data.topic);
  const issue: AssistantOfferIssue | undefined = !offer ? "unavailable"
    : !data.offerFingerprint ? "unverified"
      : data.offerFingerprint !== offerFingerprint(offer) ? "changed" : undefined;
  return issue ? { ...data, offerId: undefined, offerFingerprint: undefined, offerIssue: issue } : data;
}

export function storeAssistantBriefHandoff(storage: Pick<Storage, "setItem">, token: string, data: AssistantBriefHandoff): boolean {
  if (!validToken(token) || !validHandoff(data)) return false;
  try { storage.setItem(prefix + token, JSON.stringify(data)); return true; } catch { return false; }
}

export function inspectAssistantBriefHandoff(storage: Pick<Storage, "getItem">, token: string, now = Date.now()): AssistantBriefReadResult {
  if (!validToken(token)) return { status: "invalid", data: null };
  let raw: string | null;
  try { raw = storage.getItem(prefix + token); } catch { return { status: "unavailable", data: null }; }
  if (raw === null) return { status: "missing", data: null };
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return { status: "invalid", data: null }; }
  if (!validHandoff(data) || data.createdAt > now) {
    const summary = data && typeof data === "object" && "summary" in data ? data.summary : undefined;
    return { status: "invalid", data: null, ...(typeof summary === "string" && summary.trim() && summary.length <= ASSISTANT_SUMMARY_LIMIT ? { recoverySummary: summary } : {}) };
  }
  if (now - data.createdAt > lifetime) return { status: "expired", data: null, recoverySummary: data.summary };
  return { status: "ready", data: currentHandoff(data) };
}

export function readAssistantBriefHandoff(storage: Pick<Storage, "getItem">, token: string, now = Date.now()): AssistantBriefHandoff | null {
  return inspectAssistantBriefHandoff(storage, token, now).data;
}

export function assistantOfferIssueText(issue: AssistantOfferIssue, locale: "ru" | "en" = "ru"): string {
  if (locale === "en") return issue === "changed"
    ? "The offer terms have changed. The earlier offer remains in the summary for reference; its selection must be checked again."
    : issue === "unavailable"
      ? "The earlier offer is no longer available. Your project details can still be imported; the team will help agree a suitable scope."
      : "The earlier offer has not been verified against the current requirements. Your project details can be imported without selecting that offer.";
  return issue === "changed"
    ? "Условия тарифа изменились. Прежние сведения остаются в резюме для справки; выбор тарифа нужно проверить заново."
    : issue === "unavailable"
      ? "Прежний тариф больше недоступен. Данные задачи можно перенести; подходящий состав работ поможет согласовать команда."
      : "Прежний тариф не проверен на соответствие текущим требованиям. Данные задачи можно перенести без выбора этого тарифа.";
}

function incomingAnswers(data: AssistantBriefHandoff): BriefAnswers {
  return {
    ...(data.task.trim() ? { result: data.task } : {}),
    ...(data.timing?.trim() ? { timeline: data.timing } : {}),
    ...(data.cards ? { cardCount: String(data.cards) } : {}),
    ...(platforms.includes(data.topic) ? { platform: data.topic } : {}),
    ...(data.budget !== undefined ? { budget: data.budget < 50000 ? "under50" : data.budget < 150000 ? "50-150" : data.budget <= 400000 ? "150-400" : "400plus" } : {}),
    ...(data.requirements?.trim() ? { functions: data.requirements } : {}),
  };
}

export function mergeAssistantBriefAnswers(answers: BriefAnswers, data: AssistantBriefHandoff, policy: AssistantBriefImportPolicy = "keep"): BriefAnswers {
  const base = `Подбор с помощником KILENI:\n${data.summary}`;
  const notice = data.offerIssue ? assistantOfferIssueText(data.offerIssue) : "";
  const section = `${base}${notice ? `\n${notice}` : ""}`;
  const next = { ...answers };
  for (const [key, value] of Object.entries(incomingAnswers(data))) {
    if (policy === "apply" || !next[key]?.trim()) next[key] = value;
  }
  const wishes = answers.wishes ?? "";
  const sameSummary = wishes.split("Подбор с помощником KILENI:\n").slice(1).some((part) => {
    if (!part.startsWith(data.summary)) return false;
    const rest = part.slice(data.summary.length);
    return !rest.trim() || rest.startsWith("\n\n") || ["unavailable", "changed", "unverified"].some((issue) => rest.startsWith(`\n${assistantOfferIssueText(issue as AssistantOfferIssue)}`));
  });
  next.wishes = sameSummary
    ? notice && !wishes.includes(notice) ? `${wishes}\n${notice}` : wishes
    : wishes ? `${wishes}\n\n${section}` : section;
  return next;
}

function hasBriefSelection(draft: BriefDraftV2): boolean {
  return Boolean(draft.offerId || draft.service !== "seo" || draft.step > 0 || Object.values(draft.answers).some((value) => value.trim()));
}

export function assistantBriefConflicts(draft: BriefDraftV2, handoff: AssistantBriefHandoff): AssistantBriefConflict[] {
  const data = currentHandoff(handoff);
  const conflicts: AssistantBriefConflict[] = [];
  const incomingService = publicOfferForTopic(data.offerId, data.topic)?.briefType ?? serviceMap[data.topic];
  if (hasBriefSelection(draft) && draft.service !== incomingService) conflicts.push({ key: "service", current: draft.service, incoming: incomingService });
  if (draft.offerId && draft.offerId !== data.offerId) conflicts.push({ key: "offerId", current: draft.offerId, incoming: data.offerId ?? "" });
  for (const [key, value] of Object.entries(incomingAnswers(data))) {
    if (draft.answers[key]?.trim() && draft.answers[key].trim() !== value.trim()) conflicts.push({ key, current: draft.answers[key], incoming: value });
  }
  return conflicts;
}

export function prepareAssistantBriefImport(draft: BriefDraftV2, handoff: AssistantBriefHandoff, policy: AssistantBriefImportPolicy, maxWishesLength = BRIEF_WISHES_LIMIT, now?: number):
  | { ok: true; draft: BriefDraftV2; unchanged: boolean }
  | { ok: false; reason: "summary-too-long" | "expired" | "invalid" } {
  if (!validHandoff(handoff) || now !== undefined && handoff.createdAt > now) return { ok: false, reason: "invalid" };
  if (now !== undefined && now - handoff.createdAt > lifetime) return { ok: false, reason: "expired" };
  const data = currentHandoff(handoff);
  const conflicts = assistantBriefConflicts(draft, data);
  const keepSelection = policy === "keep" && conflicts.some((item) => item.key === "service" || item.key === "offerId" || item.key === "platform");
  const pickedOffer = publicOfferForTopic(data.offerId, data.topic);
  const service = keepSelection ? draft.service : pickedOffer?.briefType ?? serviceMap[data.topic];
  const offerId = keepSelection ? draft.offerId : pickedOffer?.id;
  const answers = mergeAssistantBriefAnswers(draft.answers, data, policy);
  if ((answers.wishes?.length ?? 0) > maxWishesLength) return { ok: false, reason: "summary-too-long" };
  if (!keepSelection) {
    delete answers.selectedTier;
    delete answers.sourceService;
    if (offerId) answers.sourceOffer = offerId;
    else delete answers.sourceOffer;
  }
  const unchanged = service === draft.service && offerId === draft.offerId
    && Object.keys(answers).length === Object.keys(draft.answers).length
    && Object.entries(answers).every(([key, value]) => draft.answers[key] === value);
  return { ok: true, draft: { ...draft, service, offerId, answers, step: unchanged ? draft.step : 1 }, unchanged };
}

export function resolveAssistantBriefEntry(search: string, draft?: BriefDraftV2) {
  const queryString = search.includes("?") ? search.slice(search.indexOf("?")) : search;
  const query = new URLSearchParams(queryString);
  // An assistant link is a request to review a handoff, never consent to replace a draft.
  if (query.has("assistant")) return resolveBriefOfferState("", draft);
  return resolveBriefOfferState(queryString, draft);
}
