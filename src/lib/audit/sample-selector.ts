import type { AuditHtmlPageType, AuditResourceType } from "./classification";

export const PUBLIC_AUDIT_SAMPLE_LIMIT = 10 as const;

export type AuditPageType =
  | "homepage"
  | "commercial"
  | "conversion_support"
  | "hub"
  | "detail"
  | "case"
  | "article"
  | "unique"
  | "alternate_locale"
  | AuditHtmlPageType;

export type AuditSelectionReason =
  | "homepage"
  | "primary_commercial"
  | "commercial_different_template"
  | "conversion_support"
  | "category_hub"
  | "detail_page"
  | "case_page"
  | "article_page"
  | "unique_template"
  | "additional_important"
  | "alternate_locale_control"
  | "primary_locale_type_missing"
  | "user_target"
  | "priority_url";

export type AuditSampleExclusionReason =
  | "search_page"
  | "technical_page"
  | "parameterized_url"
  | "redirect"
  | "confirmed_duplicate"
  // Legacy values remain readable for immutable snapshots created before v3.1.
  | "service_url"
  | "technical_object"
  | "closed_section"
  | "duplicate_template"
  | "other";

export interface AuditUrlInventoryItem {
  readonly url: string;
  readonly finalUrl?: string;
  readonly resourceType?: AuditResourceType;
  readonly pageType?: AuditHtmlPageType | null;
  readonly classificationConfidence?: number;
  readonly classificationReasons?: readonly string[];
  readonly language?: string | null;
  readonly depth?: number;
  readonly fromSitemap?: boolean;
  readonly schemaTypes?: readonly string[];
  readonly templateSignature?: string | null;
  readonly canonicalUrl?: string | null;
  readonly contentFingerprint?: string | null;
}

export interface AuditSampleExcludedItem<T extends AuditUrlInventoryItem = AuditUrlInventoryItem> {
  readonly item: T;
  readonly reason: AuditSampleExclusionReason;
  readonly primaryUrl?: string;
}

export interface AuditSampleInventoryPartition<T extends AuditUrlInventoryItem = AuditUrlInventoryItem> {
  readonly eligible: readonly T[];
  readonly excluded: readonly AuditSampleExcludedItem<T>[];
}

export interface SelectedAuditUrl {
  readonly url: string;
  readonly pageType: AuditPageType;
  readonly selectionReason: AuditSelectionReason;
  readonly templateFamily: string;
  readonly locale: string | null;
  readonly classificationConfidence?: number;
  readonly classificationReasons?: readonly string[];
}

export interface AuditSampleOptions {
  readonly targetUrl?: string;
  readonly priorityUrls?: readonly string[];
}

export type AuditBusinessPriorityKey =
  | "homepage"
  | "service_hub"
  | "primary_service"
  | "pricing"
  | "free_audit"
  | "lead_form"
  | "contact"
  | "case"
  | "article"
  | "detail"
  | "about"
  | "content_hub"
  | "unique"
  | "other";

export type AuditBusinessPriority = {
  readonly key: AuditBusinessPriorityKey;
  readonly rank: number;
};

export type AuditPrefetchPriority = {
  readonly businessPriority: AuditBusinessPriority;
  readonly depth: number;
  readonly inferredPageType: Exclude<AuditPageType, "alternate_locale">;
  readonly localeRank: number;
  readonly pathname: string;
  readonly templateFamily: string;
};

export function isAuditSampleEligible(item: AuditUrlInventoryItem): boolean {
  return auditSampleExclusionReason(item) === null;
}

/**
 * Splits a discovered HTML inventory into the exact population used by the
 * representative sampler. Eligibility cannot be decided URL-by-URL alone:
 * canonical aliases and redirects may resolve to one confirmed destination.
 */
export function partitionAuditSampleInventory<T extends AuditUrlInventoryItem>(
  inventory: readonly T[],
): AuditSampleInventoryPartition<T> {
  const eligibleCandidates: T[] = [];
  const excluded: AuditSampleExcludedItem<T>[] = [];

  for (const item of inventory) {
    const reason = auditSampleExclusionReason(item);
    if (reason) {
      excluded.push({ item, reason });
      continue;
    }

    const canonicalPrimary = confirmedCanonicalPrimary(item, inventory);
    if (canonicalPrimary) {
      excluded.push({ item, reason: "confirmed_duplicate", primaryUrl: canonicalPrimary });
      continue;
    }

    eligibleCandidates.push(item);
  }

  const eligible: T[] = [];
  const eligibleByConfirmedDestination = groupBy(
    eligibleCandidates,
    (item) => confirmedDestinationKey(item),
  );
  for (const destination of [...eligibleByConfirmedDestination.keys()].sort((left, right) => left.localeCompare(right, "en"))) {
    const group = [...(eligibleByConfirmedDestination.get(destination) ?? [])].sort(compareInventoryRepresentative);
    const representative = group.shift();
    if (representative) eligible.push(representative);
    for (const item of group) excluded.push({
      item,
      reason: isRedirect(item) ? "redirect" : "confirmed_duplicate",
      primaryUrl: representative ? publicInventoryUrl(representative.finalUrl ?? representative.url) : undefined,
    });
  }

  return {
    // When discovery has only the original redirect entry, that observation
    // represents the resolved HTML destination itself. If the destination is
    // also present, the comparator keeps it and the alias above is excluded.
    eligible: eligible.sort(compareInventoryRepresentative),
    excluded: excluded.sort((left, right) => left.item.url.localeCompare(right.item.url, "en")),
  };
}

/**
 * Returns the client-safe reason why an HTML URL cannot enter the free
 * sample. The detailed classifier evidence remains available in admin only.
 */
export function auditSampleExclusionReason(
  item: AuditUrlInventoryItem,
): AuditSampleExclusionReason | null {
  try {
    const requested = new URL(item.url);
    const parsed = new URL(item.finalUrl ?? item.url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "technical_object";
    if (item.resourceType && item.resourceType !== "html") return "technical_page";
    if (requested.searchParams.size > 0 || parsed.searchParams.size > 0) return "parameterized_url";

    parsed.pathname = normalizePathname(parsed.pathname);
    const { basePathname } = splitLocale(parsed.pathname);
    const explicitClassification = item.resourceType === "html"
      && item.pageType !== undefined
      && item.pageType !== "unknown"
      && (item.classificationConfidence === undefined || clampConfidence(item.classificationConfidence) >= 0.6);
    const pageType = explicitClassification
      ? item.pageType!
      : classifyPageType(basePathname, item.schemaTypes ?? []);

    if (pageType === "auth" || pageType === "account") return "closed_section";
    if (pageType === "internal_search") return "search_page";
    if (["cart", "filter", "legal"].includes(pageType ?? "")) return "technical_page";
    if (pageType === null) return "other";
    return null;
  } catch {
    return "technical_object";
  }
}

interface Candidate {
  readonly item: AuditUrlInventoryItem;
  readonly url: string;
  readonly pathname: string;
  readonly basePathname: string;
  readonly contentFamily: string;
  readonly pageType: Exclude<AuditPageType, "alternate_locale">;
  readonly businessPriority: AuditBusinessPriority;
  readonly templateFamily: string;
  readonly locale: string | null;
  readonly depth: number;
  readonly explicitClassification: boolean;
  readonly classificationConfidence: number;
  readonly classificationReasons: readonly string[];
}

const LOCALE_SEGMENTS = new Set([
  "ar",
  "de",
  "en",
  "es",
  "fr",
  "it",
  "ja",
  "kk",
  "ko",
  "pl",
  "pt",
  "ru",
  "tr",
  "uk",
  "zh",
]);

const TYPE_ORDER: Readonly<Record<Exclude<AuditPageType, "alternate_locale">, number>> = {
  homepage: 0,
  about: 2,
  service: 1,
  commercial: 1,
  pricing: 2,
  contact: 2,
  conversion_support: 2,
  category: 3,
  hub: 3,
  product: 4,
  detail: 4,
  case: 5,
  article: 6,
  utility: 7,
  unique: 7,
  legal: 8,
  auth: 9,
  account: 9,
  cart: 9,
  internal_search: 9,
  filter: 9,
  unknown: 10,
};

const BUSINESS_PRIORITY_ORDER: readonly AuditBusinessPriorityKey[] = [
  "homepage",
  "service_hub",
  "primary_service",
  "pricing",
  "free_audit",
  "lead_form",
  "contact",
  "case",
  "article",
  "detail",
  "about",
  "content_hub",
  "unique",
  "other",
];

const CORE_BUSINESS_PRIORITIES = BUSINESS_PRIORITY_ORDER.slice(0, 9);

/**
 * Selects a stable, representative public-audit sample without fetching data.
 * The caller supplies observations collected during URL discovery; input order
 * never influences the selected set or its order.
 */
export function selectAuditSample(
  inventory: readonly AuditUrlInventoryItem[],
  limit: number = PUBLIC_AUDIT_SAMPLE_LIMIT,
  options: AuditSampleOptions = {},
): readonly SelectedAuditUrl[] {
  const normalizedLimit = clampLimit(limit);
  if (normalizedLimit === 0) return [];

  // Selection and coverage must operate on the same population. In
  // particular, a confirmed redirect/canonical alias cannot be excluded by
  // coverage and still consume one of the ten selected HTML slots.
  const eligibleInventory = partitionAuditSampleInventory(inventory).eligible;
  const allCandidates = normalizeInventory(eligibleInventory, true);
  const candidates = allCandidates.filter((candidate) => !isLowValuePageType(candidate.pageType));
  const primaryLocale = inferPrimaryLocale(allCandidates, options.targetUrl);
  const primaryPool = candidates.filter((candidate) => isPrimaryLocaleCandidate(candidate, primaryLocale));
  const alternatePool = candidates.filter((candidate) => !isPrimaryLocaleCandidate(candidate, primaryLocale));
  const primaryContentGroups = groupBy(primaryPool, (candidate) => candidate.contentFamily);
  const primaryCandidates = [...primaryContentGroups.values()]
    .map((group) => [...group].sort(compareCandidate)[0])
    .filter((candidate): candidate is Candidate => candidate !== undefined);
  const selected: Array<{ candidate: Candidate; reason: AuditSelectionReason }> = [];
  const selectedUrls = new Set<string>();
  const selectedTemplateFamilies = new Set<string>();
  let alternateSelected = false;

  const chooseUrl = (rawUrl: string | undefined, reason: AuditSelectionReason): void => {
    if (!rawUrl || selected.length >= normalizedLimit) return;
    const normalized = normalizeComparableUrl(rawUrl);
    const pool = reason === "user_target" ? allCandidates : candidates;
    const candidate = pool.find((item) => item.url === normalized);
    if (!candidate || selectedUrls.has(candidate.url)) return;
    const isAlternate = !isPrimaryLocaleCandidate(candidate, primaryLocale);
    if (isAlternate && alternateSelected) return;
    selected.push({ candidate, reason });
    selectedUrls.add(candidate.url);
    selectedTemplateFamilies.add(candidate.templateFamily);
    if (isAlternate) alternateSelected = true;
  };

  chooseUrl(options.targetUrl, "user_target");
  for (const priorityUrl of (options.priorityUrls ?? []).slice(0, 3)) {
    chooseUrl(priorityUrl, "priority_url");
  }

  const primaryTypes = [...new Set(primaryCandidates.map((candidate) => candidate.pageType))]
    .sort(comparePageTypes);
  for (const businessPriority of CORE_BUSINESS_PRIORITIES) {
    if (selected.length >= normalizedLimit) break;
    const candidate = primaryCandidates
      .filter((item) => item.businessPriority.key === businessPriority && !selectedUrls.has(item.url))
      .sort(compareCandidate)[0];
    if (!candidate) continue;
    selected.push({ candidate, reason: selectionReasonFor(candidate, selected) });
    selectedUrls.add(candidate.url);
    selectedTemplateFamilies.add(candidate.templateFamily);
  }

  // Fill any missing diversity slots with the next stable primary URLs. A
  // different template is always preferred over another page of a seen one.
  const remainingPrimary = primaryPool
    .filter((candidate) => !selectedUrls.has(candidate.url))
    .sort(compareCandidate);
  const alternate = (normalizedLimit === PUBLIC_AUDIT_SAMPLE_LIMIT || remainingPrimary.length === 0)
    && !alternateSelected && selected.length < normalizedLimit
    ? chooseAlternateCandidate(alternatePool, selected, primaryTypes)
    : null;
  const primaryFillLimit = alternate ? normalizedLimit - 1 : normalizedLimit;
  // Keep the tenth slot useful and stable when the crawl has no alternate
  // locale to represent. A company/about page describes the business itself;
  // it should not be displaced merely because prefetch discovered one more
  // catalogue/detail URL than an earlier crawl did.
  if (!alternate && selected.length < primaryFillLimit) {
    const about = remainingPrimary
      .filter((candidate) => candidate.businessPriority.key === "about")
      .sort(compareCandidate)[0];
    if (about) {
      selected.push({ candidate: about, reason: selectionReasonFor(about, selected) });
      selectedUrls.add(about.url);
      selectedTemplateFamilies.add(about.templateFamily);
    }
  }
  const selectedBusinessPriorities = new Set(selected.map(({ candidate }) => candidate.businessPriority.key));
  for (const candidate of [
    ...remainingPrimary.filter((item) => !selectedBusinessPriorities.has(item.businessPriority.key) && !selectedTemplateFamilies.has(item.templateFamily)),
    ...remainingPrimary.filter((item) => !selectedBusinessPriorities.has(item.businessPriority.key) && selectedTemplateFamilies.has(item.templateFamily)),
    ...remainingPrimary.filter((item) => selectedBusinessPriorities.has(item.businessPriority.key) && !selectedTemplateFamilies.has(item.templateFamily)),
    ...remainingPrimary.filter((item) => selectedBusinessPriorities.has(item.businessPriority.key) && selectedTemplateFamilies.has(item.templateFamily)),
  ]) {
    if (selected.length >= primaryFillLimit) break;
    if (selectedUrls.has(candidate.url)) continue;
    selected.push({ candidate, reason: selectionReasonFor(candidate, selected) });
    selectedUrls.add(candidate.url);
    selectedTemplateFamilies.add(candidate.templateFamily);
  }

  // One locale/control URL may use the tenth slot, but only after the diverse
  // primary pass. A locale copy never displaces one of the first nine types.
  if (alternate && selected.length < normalizedLimit) {
    const primaryHasType = primaryTypes.includes(alternate.pageType);
    selected.push({
      candidate: alternate,
      reason: primaryHasType ? "alternate_locale_control" : "primary_locale_type_missing",
    });
    selectedUrls.add(alternate.url);
  }

  for (const candidate of remainingPrimary) {
    if (selected.length >= normalizedLimit) break;
    if (selectedUrls.has(candidate.url)) continue;
    selected.push({ candidate, reason: selectionReasonFor(candidate, selected) });
    selectedUrls.add(candidate.url);
  }

  return selected.map(({ candidate, reason }) => ({
    url: candidate.url,
    pageType: reason === "alternate_locale_control" && !candidate.explicitClassification
      ? "alternate_locale"
      : candidate.pageType,
    selectionReason: reason,
    templateFamily: candidate.templateFamily,
    locale: candidate.locale,
    classificationConfidence: candidate.classificationConfidence,
    classificationReasons: candidate.classificationReasons,
  }));
}

function selectionReasonFor(
  candidate: Candidate,
  selected: readonly { candidate: Candidate; reason: AuditSelectionReason }[],
): AuditSelectionReason {
  if (candidate.pageType === "homepage") return "homepage";
  if (["pricing", "free_audit", "lead_form", "contact"].includes(candidate.businessPriority.key)) {
    return "conversion_support";
  }
  if (candidate.businessPriority.key === "service_hub") return "category_hub";
  if (candidate.pageType === "service" || candidate.pageType === "commercial") {
    return selected.some(({ candidate: item }) => item.pageType === "service" || item.pageType === "commercial")
      ? "commercial_different_template"
      : "primary_commercial";
  }
  if (["pricing", "contact", "conversion_support"].includes(candidate.pageType)) return "conversion_support";
  if (candidate.pageType === "category" || candidate.pageType === "hub") return "category_hub";
  if (candidate.pageType === "product" || candidate.pageType === "detail") return "detail_page";
  if (candidate.pageType === "case") return "case_page";
  if (candidate.pageType === "article") return "article_page";
  if (candidate.pageType === "unique") return "unique_template";
  return "additional_important";
}

function inferPrimaryLocale(
  candidates: readonly Candidate[],
  targetUrl: string | undefined,
): string | null {
  const target = targetUrl ? normalizeComparableUrl(targetUrl) : null;
  const exactTarget = target ? candidates.find((candidate) => candidate.url === target) : undefined;
  if (exactTarget) return exactTarget.locale;
  const primaryHomepage = candidates
    .filter((candidate) => candidate.pageType === "homepage" && candidate.basePathname === "/")
    .sort(compareCandidate)[0];
  return primaryHomepage?.locale ?? null;
}

function isPrimaryLocaleCandidate(candidate: Candidate, primaryLocale: string | null): boolean {
  return primaryLocale === null
    ? candidate.locale === null
    : candidate.locale === primaryLocale || candidate.locale === null;
}

function comparePageTypes(left: Candidate["pageType"], right: Candidate["pageType"]): number {
  return TYPE_ORDER[left] - TYPE_ORDER[right] || left.localeCompare(right, "en");
}

function chooseAlternateCandidate(
  candidates: readonly Candidate[],
  selected: readonly { candidate: Candidate; reason: AuditSelectionReason }[],
  primaryTypes: readonly Candidate["pageType"][],
): Candidate | null {
  const available = candidates
    .filter((candidate) => !selected.some(({ candidate: item }) => item.url === candidate.url));
  const missingPrimaryType = available
    .filter((candidate) => !primaryTypes.includes(candidate.pageType))
    .sort(compareAlternate)[0];
  if (missingPrimaryType) return missingPrimaryType;

  const selectedFamilies = new Set(selected.map(({ candidate }) => candidate.contentFamily));
  return available
    .filter((candidate) => selectedFamilies.has(candidate.contentFamily))
    .sort(compareAlternate)[0]
    ?? available.sort(compareAlternate)[0]
    ?? null;
}

function normalizeInventory(inventory: readonly AuditUrlInventoryItem[], allowLowValue = false): Candidate[] {
  const byUrl = new Map<string, Candidate>();
  for (const item of inventory) {
    const candidate = toCandidate(item, allowLowValue);
    if (!candidate) continue;
    const previous = byUrl.get(candidate.url);
    if (!previous || compareCandidate(candidate, previous) < 0) byUrl.set(candidate.url, candidate);
  }
  return [...byUrl.values()].sort(compareCandidate);
}

function toCandidate(item: AuditUrlInventoryItem, allowLowValue = false): Candidate | null {
  try {
    const requested = new URL(item.url);
    const parsed = new URL(item.finalUrl ?? item.url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (item.resourceType && item.resourceType !== "html") return null;
    if (requested.searchParams.size > 0 || parsed.searchParams.size > 0) return null;
    parsed.hash = "";
    parsed.search = "";
    parsed.pathname = normalizePathname(parsed.pathname);
    const url = parsed.href;
    const { locale: routeLocale, basePathname } = splitLocale(parsed.pathname);
    const locale = item.language?.trim().toLowerCase().split(/[-_]/u)[0] ?? routeLocale;
    const explicitClassification = item.resourceType === "html"
      && item.pageType !== undefined
      && item.pageType !== "unknown"
      && (item.classificationConfidence === undefined || clampConfidence(item.classificationConfidence) >= 0.6);
    const pageType = explicitClassification
      ? item.pageType!
      : classifyPageType(basePathname, item.schemaTypes ?? []);
    if (pageType === null || (!allowLowValue && isLowValuePageType(pageType))) return null;
    const signature = normalizeSignature(item.templateSignature);
    const signatureBody = stripTemplatePageTypePrefix(signature);
    const fallbackSignature = inferTemplateSignature(basePathname, pageType);
    const templateFamily = signature?.startsWith(`${pageType}:`)
      ? signature
      : `${pageType}:${signatureBody ?? fallbackSignature}`;
    return {
      item,
      url,
      pathname: parsed.pathname,
      basePathname,
      contentFamily: `${parsed.hostname.toLowerCase()}${basePathname}`,
      pageType,
      businessPriority: auditBusinessPriority(parsed.href, pageType),
      templateFamily,
      locale,
      depth: normalizeDepth(item.depth, basePathname),
      explicitClassification,
      classificationConfidence: clampConfidence(item.classificationConfidence),
      classificationReasons: item.classificationReasons ?? [],
    };
  } catch {
    return null;
  }
}

function classifyPageType(
  pathname: string,
  schemaTypes: readonly string[],
): Candidate["pageType"] {
  if (pathname === "/") return "homepage";
  const normalized = pathname.toLowerCase();
  const segments = normalized.split("/").filter(Boolean);
  const schema = new Set(schemaTypes.map((value) => value.toLowerCase()));

  if (/(?:^|\/)(?:login|log-in|signin|sign-in|auth)(?:\/|$)/u.test(normalized)) return "auth";
  if (/(?:^|\/)(?:account|cabinet|profile)(?:\/|$)/u.test(normalized)) return "account";
  if (/(?:^|\/)(?:cart|basket)(?:\/|$)/u.test(normalized)) return "cart";
  if (/(?:^|\/)(?:search|find)(?:\/|$)/u.test(normalized)) return "internal_search";
  if (/(?:^|\/)(?:filter|sort)(?:\/|$)/u.test(normalized)) return "filter";
  if (/(?:^|\/)(?:privacy|consent|terms|legal|policy|offer)(?:\/|$)/u.test(normalized)) return "legal";

  if (/^\/(?:cases?|portfolio)(?:\/|$)/u.test(normalized)) {
    return segments.length > 1 ? "case" : "hub";
  }
  if (/^\/(?:blog|articles?|news|guides?)(?:\/|$)/u.test(normalized)) {
    return segments.length > 1 ? "article" : "hub";
  }
  if (schema.has("blogposting") || schema.has("newsarticle") || schema.has("article")) {
    return "article";
  }
  if (/(?:^|\/)(?:pricing|prices?|contacts?|brief|request|quote|checkout)(?:\/|$)/u.test(normalized)) {
    return "conversion_support";
  }
  if (/^\/(?:services?|marketplaces?|catalog|products?|categories)(?:\/|$)/u.test(normalized)) {
    if (segments.length === 1) return "hub";
    return "detail";
  }
  if (schema.has("product") || schema.has("offer")) return "detail";
  if (
    schema.has("service") ||
    /(?:seo|audit|promotion|development|advertis)/u.test(normalized)
  ) {
    return segments.length > 1 ? "detail" : "commercial";
  }
  return "unique";
}

function inferTemplateSignature(
  pathname: string,
  pageType: Candidate["pageType"],
): string {
  if (pathname === "/") return "root";
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 1) return segments[0] ?? pageType;
  return `${segments[0] ?? pageType}/:detail`;
}

function splitLocale(pathname: string): { locale: string | null; basePathname: string } {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0]?.toLowerCase();
  if (!first || !LOCALE_SEGMENTS.has(first)) return { locale: null, basePathname: pathname };
  const rest = segments.slice(1);
  return {
    locale: first,
    basePathname: rest.length === 0 ? "/" : `/${rest.join("/")}`,
  };
}

function compareCandidate(left: Candidate, right: Candidate): number {
  return (
    left.businessPriority.rank - right.businessPriority.rank ||
    businessPrioritySubrank(left) - businessPrioritySubrank(right) ||
    Number(right.explicitClassification) - Number(left.explicitClassification) ||
    right.classificationConfidence - left.classificationConfidence ||
    TYPE_ORDER[left.pageType] - TYPE_ORDER[right.pageType] ||
    localeRank(left.locale) - localeRank(right.locale) ||
    left.depth - right.depth ||
    Number(right.item.fromSitemap === true) - Number(left.item.fromSitemap === true) ||
    left.pathname.localeCompare(right.pathname, "en") ||
    left.url.localeCompare(right.url, "en")
  );
}

function businessPrioritySubrank(candidate: Candidate): number {
  if (candidate.businessPriority.key === "service_hub") {
    const first = candidate.basePathname.split("/").filter(Boolean)[0] ?? "";
    return /^(?:services?|solutions?|offerings?|capabilities|catalog)$/u.test(first) ? 0 : 1;
  }
  if (candidate.businessPriority.key === "case") return candidate.pageType === "case" ? 0 : 1;
  if (candidate.businessPriority.key === "article") return candidate.pageType === "article" ? 0 : 1;
  return 0;
}

/**
 * Gives commercial and conversion routes a stable, generic priority without
 * depending on one site's concrete URLs. The key is also used by sampling
 * diagnostics so the reported priority cannot drift from the selector.
 */
export function auditBusinessPriority(
  rawUrl: string,
  pageType: AuditPageType | AuditHtmlPageType | null | undefined,
): AuditBusinessPriority {
  let pathname = "/";
  try {
    pathname = splitLocale(normalizePathname(new URL(rawUrl).pathname)).basePathname.toLowerCase();
  } catch {
    // Invalid candidates receive the lowest priority and are filtered later.
  }
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0] ?? "";
  const matches = (pattern: RegExp) => pattern.test(pathname);
  let key: AuditBusinessPriorityKey;

  if (pathname === "/" || pageType === "homepage") key = "homepage";
  else if (
    segments.length === 1
    && /^(?:services?|solutions?|offerings?|capabilities|catalog)$/u.test(first)
  ) key = "service_hub";
  else if (/^(?:glossary|checks?|docs?|help|resources?)$/u.test(first)) {
    // A term such as `/glossary/seo-audit` describes a service but is not the
    // service itself. Keep knowledge-base routes behind commercial and
    // conversion pages even when their slug contains a commercial keyword.
    key = pageType === "article" ? "article" : "content_hub";
  }
  else if (
    matches(/(?:^|\/)(?:free|gratis|kostenlos|besplatn\w*)[-_/]?(?:audit|check|scan)|(?:site|website)[-_/]?(?:audit|check|scan)(?:\/|$)/u)
  ) key = "free_audit";
  else if (pageType === "pricing" || matches(/(?:^|\/)(?:pricing|prices?|plans?|tariffs?|rates?)(?:\/|$)/u)) key = "pricing";
  else if (
    matches(/(?:^|\/)(?:brief|request|quote|estimate|demo|application|book|booking|order|consultation)(?:\/|$)/u)
  ) key = "lead_form";
  else if (pageType === "contact" || matches(/(?:^|\/)(?:contacts?|contact-us|get-in-touch)(?:\/|$)/u)) key = "contact";
  else if (pageType === "case" || matches(/(?:^|\/)(?:cases?|portfolio)(?:\/|$)/u)) key = "case";
  else if (pageType === "article" || matches(/(?:^|\/)(?:blog|articles?|news|guides?)\/[^/]+(?:\/|$)/u)) key = "article";
  else if (
    pageType === "service"
    || pageType === "commercial"
    || matches(/(?:^|\/)(?:services?|solutions?|seo|audit|promotion|development|advertis(?:ing|ement)?|marketing)(?:[-_/]|$)/u)
  ) key = "primary_service";
  else if (pageType === "product" || pageType === "detail") key = "detail";
  else if (pageType === "about" || matches(/(?:^|\/)(?:about|company|team)(?:\/|$)/u)) key = "about";
  else if (pageType === "category" || pageType === "hub" || matches(/(?:^|\/)(?:blog|articles?|news|guides?|glossary)(?:\/|$)/u)) key = "content_hub";
  else if (pageType === "conversion_support") key = "lead_form";
  else if (pageType === "unique" || pageType === "utility") key = "unique";
  else key = "other";

  return { key, rank: BUSINESS_PRIORITY_ORDER.indexOf(key) };
}

/**
 * URL-only ranking used before the crawler downloads candidate HTML. It is a
 * deliberately lightweight estimate: the family helps diversify the first
 * fetches, while the confirmed page type/template still comes from HTML.
 */
export function auditPrefetchPriority(
  rawUrl: string,
  targetUrl: string,
  observedDepth?: number,
): AuditPrefetchPriority {
  try {
    const parsed = new URL(rawUrl);
    parsed.hash = "";
    parsed.search = "";
    parsed.pathname = normalizePathname(parsed.pathname);
    const { locale, basePathname } = splitLocale(parsed.pathname);
    const target = new URL(targetUrl);
    const targetPath = splitLocale(normalizePathname(target.pathname));
    const inferredPageType = classifyPageType(basePathname, []) ?? "unknown";
    const businessPriority = auditPrefetchBusinessPriority(parsed.href, basePathname, inferredPageType);
    const depth = normalizeDepth(observedDepth, basePathname);
    const firstSegment = basePathname.split("/").filter(Boolean)[0] ?? "root";
    const depthBucket = depth <= 1 ? "entry" : depth === 2 ? "detail" : "deep";
    const isPrimaryLocale = targetPath.locale === null
      ? locale === null
      : locale === null || locale === targetPath.locale;

    return {
      businessPriority,
      depth,
      inferredPageType,
      localeRank: isPrimaryLocale ? 0 : 1,
      pathname: parsed.pathname,
      templateFamily: `${locale ?? "primary"}:${firstSegment}:${businessPriority.key}:${depthBucket}`,
    };
  } catch {
    return {
      businessPriority: { key: "other", rank: BUSINESS_PRIORITY_ORDER.length - 1 },
      depth: Number.MAX_SAFE_INTEGER,
      inferredPageType: "unknown",
      localeRank: 2,
      pathname: rawUrl,
      templateFamily: `invalid:${rawUrl}`,
    };
  }
}

function auditPrefetchBusinessPriority(
  rawUrl: string,
  basePathname: string,
  inferredPageType: Exclude<AuditPageType, "alternate_locale">,
): AuditBusinessPriority {
  const confirmedByExistingRules = auditBusinessPriority(rawUrl, inferredPageType);
  const segments = basePathname.toLowerCase().split("/").filter(Boolean);
  const first = segments[0] ?? "";
  const tokens = new Set(segments.flatMap((segment) => segment.split(/[-_]+/u)).filter(Boolean));
  const priority = (key: AuditBusinessPriorityKey): AuditBusinessPriority => ({ key, rank: BUSINESS_PRIORITY_ORDER.indexOf(key) });

  // A commercial word inside a glossary/check/article slug describes the
  // topic, not the business role of the page. Keep the section context as the
  // stronger signal during the URL-only phase.
  if (/^(?:glossary|checks?|docs?|help|resources?|blog|articles?|news|guides?)$/u.test(first)) {
    return confirmedByExistingRules;
  }
  if (/^marketplaces?$/u.test(first)) return priority(segments.length === 1 ? "service_hub" : "primary_service");
  if (["calculator", "estimate", "quote"].some((token) => tokens.has(token))) return priority("lead_form");
  if (tokens.has("custom") && ["task", "project", "solution"].some((token) => tokens.has(token))) return priority("primary_service");
  if (
    ["unique", "other"].includes(confirmedByExistingRules.key)
    && ["seo", "audit", "promotion", "development", "advertising", "advertisement", "ads", "marketing", "marketplace", "marketplaces", "content"].some((token) => tokens.has(token))
  ) return priority("primary_service");
  return confirmedByExistingRules;
}

function normalizeComparableUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.hash = "";
    parsed.search = "";
    parsed.pathname = normalizePathname(parsed.pathname);
    return parsed.href;
  } catch {
    return rawUrl;
  }
}

function compareInventoryRepresentative(
  left: AuditUrlInventoryItem,
  right: AuditUrlInventoryItem,
): number {
  const leftUrl = new URL(left.finalUrl ?? left.url);
  const rightUrl = new URL(right.finalUrl ?? right.url);
  return (
    Number(isRedirect(left)) - Number(isRedirect(right)) ||
    Number(leftUrl.search.length > 0) - Number(rightUrl.search.length > 0) ||
    normalizeDepth(left.depth, leftUrl.pathname) - normalizeDepth(right.depth, rightUrl.pathname) ||
    clampConfidence(right.classificationConfidence) - clampConfidence(left.classificationConfidence) ||
    leftUrl.href.localeCompare(rightUrl.href, "en")
  );
}

function confirmedDestinationKey(item: AuditUrlInventoryItem): string {
  return normalizeFinalDestination(item.finalUrl ?? item.url);
}

function normalizeFinalDestination(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.hash = "";
    parsed.pathname = normalizePathname(parsed.pathname);
    return parsed.href;
  } catch {
    return rawUrl;
  }
}

function publicInventoryUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.username = "";
    parsed.password = "";
    parsed.hash = "";
    return parsed.href;
  } catch {
    return rawUrl;
  }
}

function confirmedCanonicalPrimary(
  item: AuditUrlInventoryItem,
  inventory: readonly AuditUrlInventoryItem[],
): string | null {
  if (!item.canonicalUrl) return null;
  try {
    const final = new URL(item.finalUrl ?? item.url);
    const canonical = new URL(item.canonicalUrl, final);
    if (canonical.origin !== final.origin) return null;
    if (normalizeFinalDestination(canonical.href) === normalizeFinalDestination(final.href)) return null;
    const primary = inventory.find((candidate) =>
      normalizeFinalDestination(candidate.finalUrl ?? candidate.url) === normalizeFinalDestination(canonical.href)
    );
    if (!primary?.contentFingerprint || !item.contentFingerprint) return null;
    return primary.contentFingerprint === item.contentFingerprint
      ? publicInventoryUrl(canonical.href)
      : null;
  } catch {
    return null;
  }
}

function isRedirect(item: AuditUrlInventoryItem): boolean {
  if (!item.finalUrl) return false;
  return normalizeFinalDestination(item.url) !== normalizeFinalDestination(item.finalUrl);
}

function isLowValuePageType(pageType: Exclude<AuditPageType, "alternate_locale">): boolean {
  return ["auth", "account", "cart", "internal_search", "filter", "legal"].includes(pageType);
}

function clampConfidence(value: number | undefined): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.max(0, Math.min(1, value!));
}

function compareAlternate(left: Candidate, right: Candidate): number {
  return (
    localeRank(left.locale) - localeRank(right.locale) ||
    TYPE_ORDER[left.pageType] - TYPE_ORDER[right.pageType] ||
    left.pathname.localeCompare(right.pathname, "en") ||
    left.url.localeCompare(right.url, "en")
  );
}

function localeRank(locale: string | null): number {
  if (locale === null) return 0;
  if (locale === "ru") return 1;
  if (locale === "en") return 2;
  return 3;
}

function normalizePathname(pathname: string): string {
  const normalized = pathname.replace(/\/{2,}/gu, "/").replace(/\/$/u, "");
  return normalized || "/";
}

function normalizeSignature(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase().replace(/\s+/gu, "-");
  return normalized || null;
}

function stripTemplatePageTypePrefix(value: string | null): string | null {
  if (!value) return null;
  const separator = value.indexOf(":");
  if (separator <= 0) return value;
  const prefix = value.slice(0, separator);
  return prefix in TYPE_ORDER ? value.slice(separator + 1) || null : value;
}

function normalizeDepth(value: number | undefined, pathname: string): number {
  if (value !== undefined && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  return pathname.split("/").filter(Boolean).length;
}

function clampLimit(value: number): number {
  if (!Number.isFinite(value)) return PUBLIC_AUDIT_SAMPLE_LIMIT;
  return Math.max(0, Math.min(PUBLIC_AUDIT_SAMPLE_LIMIT, Math.floor(value)));
}

function groupBy<T, K>(items: readonly T[], key: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const value = key(item);
    const group = groups.get(value) ?? [];
    group.push(item);
    groups.set(value, group);
  }
  return groups;
}
