import {
  AUDIT_CHECK_REGISTRY_V3,
  evaluateAuditChecksV3,
  type AuditCheckResultV3,
  type AuditCheckSeverityV3,
  type AuditCheckStatusV3,
} from "./check-registry-v3";
import type { ClassifiedAuditObject } from "./classification";
import {
  partitionAuditSampleInventory,
  PUBLIC_AUDIT_SAMPLE_LIMIT,
  type AuditSampleExcludedItem,
  type AuditSampleExclusionReason,
  type AuditUrlInventoryItem,
  type SelectedAuditUrl,
} from "./sample-selector";
import type {
  AuditCategory,
  PageAnalysis,
  PerformanceAuditInput,
  RobotsInfo,
  SitemapInfo,
} from "./types";

export const AUDIT_CONTRACT_VERSION_V3 = 3 as const;
export const AUDIT_RESULT_VERSION_V4 = 4 as const;
export const AUDIT_ENGINE_VERSION_V3 = "audit-pipeline-v3.1.0" as const;
export const PUBLIC_UNCHECKED_URL_LIMIT_V3 = 100 as const;

export interface AuditStatusCountsV3 {
  readonly pass: number;
  readonly warning: number;
  readonly fail: number;
  readonly not_applicable: number;
  readonly not_run: number;
  readonly insufficient_data: number;
}

export interface AuditInventorySummaryV3 {
  readonly objectsFound: number;
  readonly htmlFound: number;
  readonly eligibleHtml: number;
  readonly excludedHtml: number;
  readonly selected: number;
  readonly checked: number;
  readonly notCompleted: number;
  readonly outsideSample: number;
  readonly representedPageTypes: number;
}

export interface AuditExclusionSummaryV3 {
  readonly reason: AuditSampleExclusionReason;
  readonly count: number;
}

export interface AuditExcludedPageV3 {
  readonly url: string;
  readonly reason: AuditSampleExclusionReason;
  readonly primaryUrl?: string;
}

export interface AuditFindingV3 {
  readonly checkId: string;
  readonly title: string;
  readonly category: AuditCategory;
  readonly severity: AuditCheckSeverityV3;
  readonly whatFound: string;
  readonly whyImportant: string;
  readonly nextStep: string;
  readonly confidence: number;
  readonly affectedCount: number;
  readonly examples: readonly {
    readonly url?: string;
    readonly observation: string;
  }[];
}

export interface AuditCheckedPageV3 {
  readonly url: string;
  readonly finalUrl: string;
  readonly pageType: ClassifiedAuditObject["pageType"];
  readonly templateFamily: string;
  readonly classificationConfidence: number;
  readonly statusCode: number;
  readonly noindex: boolean;
  readonly title: PageAnalysis["title"];
  readonly description: PageAnalysis["description"];
  readonly h1: PageAnalysis["h1"];
  readonly canonical: PageAnalysis["canonical"];
}

export interface AuditTechnicalFileSummaryV3 {
  readonly robots?: {
    readonly url: string;
    readonly statusCode: number;
    readonly read: boolean;
    readonly selectedPagesNotBlocked: boolean | null;
  };
  readonly sitemap?: {
    readonly url: string;
    readonly statusCode: number;
    readonly parsed: boolean;
    readonly discoveredUrls: number;
    readonly loadedUrls: number;
    readonly notLoadedUrls: number;
    readonly htmlUrls: number;
    readonly redirectUrls: number;
    readonly documentUrls: number;
    readonly technicalResourceUrls: number;
    readonly errorUrls: number;
    readonly skippedByTechnicalLimit: number;
    readonly siteUrlsOnly: boolean | null;
  };
}

export interface AuditCategorySummaryV3 extends AuditStatusCountsV3 {
  readonly category: AuditCategory;
  readonly total: number;
}

export interface AuditResultSummaryV3 extends AuditStatusCountsV3 {
  readonly headline: string;
  readonly totalChecks: number;
  readonly completedChecks: number;
}

export interface AuditResultContractV3 {
  readonly resultVersion: typeof AUDIT_RESULT_VERSION_V4;
  readonly contractVersion: typeof AUDIT_CONTRACT_VERSION_V3;
  readonly engineVersion: typeof AUDIT_ENGINE_VERSION_V3;
  readonly auditId: string;
  readonly createdAt: string;
  readonly target: string;
  readonly inventorySummary: AuditInventorySummaryV3;
  readonly pagesDiscovered: number;
  readonly pagesEligible: number;
  readonly pagesExcluded: number;
  readonly pagesSelected: number;
  readonly pagesChecked: number;
  readonly pagesNotCompleted: number;
  readonly pagesNotCheckedTotal: number;
  readonly pagesNotCheckedReturned: number;
  readonly pagesNotCheckedTruncated: boolean;
  readonly pagesNotCheckedUrls: readonly string[];
  readonly exclusionSummary: readonly AuditExclusionSummaryV3[];
  readonly excludedPages: readonly AuditExcludedPageV3[];
  readonly coverageStatus: "sample_complete" | "sample_partial";
  readonly selectedPages: readonly SelectedAuditUrl[];
  readonly checkedPages: readonly AuditCheckedPageV3[];
  readonly technicalResources: readonly ClassifiedAuditObject[];
  readonly technicalFileSummary: AuditTechnicalFileSummaryV3;
  readonly performanceObservation: PerformanceAuditInput | null;
  readonly checks: readonly AuditCheckResultV3[];
  readonly findings: readonly AuditFindingV3[];
  readonly categorySummary: readonly AuditCategorySummaryV3[];
  readonly resultSummary: AuditResultSummaryV3;
  readonly limitations: readonly string[];
}

export interface BuildAuditContractV3Input {
  readonly auditId: string;
  readonly createdAt: string;
  readonly targetUrl: string | URL;
  readonly inventory: readonly ClassifiedAuditObject[];
  readonly selectedPages: readonly SelectedAuditUrl[];
  readonly pages: readonly PageAnalysis[];
  readonly robots?: RobotsInfo | null;
  readonly sitemap?: SitemapInfo | null;
  readonly performance?: PerformanceAuditInput | null;
}

export function buildAuditContractV3(input: BuildAuditContractV3Input): AuditResultContractV3 {
  const inventory = deduplicateInventory(input.inventory);
  const selectedPages = deduplicateSelected(input.selectedPages);
  const selectedSet = new Set(selectedPages.map((item) => comparableUrl(item.url)));
  const pages = deduplicateCheckedPages(input.pages
    .filter((page) => pageUrls(page).some((url) => selectedSet.has(comparableUrl(url)))));
  const objectsByUrl = buildComparableObjectIndex(inventory);
  const checks = evaluateAuditChecksV3({
    targetUrl: input.targetUrl,
    // Applicability may depend on a counterpart that was discovered but did
    // not enter the ten-page sample. Page checks still run only for `pages`,
    // because the registry joins HTML objects to loaded pages.
    objects: inventory,
    pages,
    robots: input.robots,
    sitemap: input.sitemap,
    performance: input.performance,
  });
  const html = inventory.filter((item) => item.resourceType === "html");
  const sampleInventory = partitionAuditSampleInventory(html.map(toInventoryItem));
  const eligible = sampleInventory.eligible;
  const excluded = sampleInventory.excluded;
  const checkedSet = new Set(pages.flatMap(pageUrls).map(comparableUrl));
  const unchecked = eligible
    .map((item) => publicUrl(item.finalUrl ?? item.url))
    .filter((url) => !selectedSet.has(comparableUrl(url)))
    .sort((left, right) => left.localeCompare(right, "en"));
  const notCompleted = selectedPages.filter((item) => !checkedSet.has(comparableUrl(item.url))).length;
  const returnedUnchecked = unchecked.slice(0, PUBLIC_UNCHECKED_URL_LIMIT_V3);
  const coverageStatus = pages.length === selectedPages.length ? "sample_complete" : "sample_partial";
  const statusCounts = countStatuses(checks);
  const representedPageTypes = new Set(
    selectedPages.map((item) => item.pageType).filter((type) => type !== "unknown"),
  ).size;

  const snapshot: AuditResultContractV3 = {
    resultVersion: AUDIT_RESULT_VERSION_V4,
    contractVersion: AUDIT_CONTRACT_VERSION_V3,
    engineVersion: AUDIT_ENGINE_VERSION_V3,
    auditId: input.auditId,
    createdAt: input.createdAt,
    target: publicUrl(input.targetUrl),
    inventorySummary: {
      objectsFound: inventory.length,
      htmlFound: html.length,
      eligibleHtml: eligible.length,
      excludedHtml: excluded.length,
      selected: selectedPages.length,
      checked: pages.length,
      notCompleted,
      outsideSample: unchecked.length,
      representedPageTypes,
    },
    pagesDiscovered: html.length,
    pagesEligible: eligible.length,
    pagesExcluded: excluded.length,
    pagesSelected: selectedPages.length,
    pagesChecked: pages.length,
    pagesNotCompleted: notCompleted,
    pagesNotCheckedTotal: unchecked.length,
    pagesNotCheckedReturned: returnedUnchecked.length,
    pagesNotCheckedTruncated: returnedUnchecked.length < unchecked.length,
    pagesNotCheckedUrls: returnedUnchecked,
    exclusionSummary: buildExclusionSummary(excluded),
    excludedPages: excluded.map(({ item, reason, primaryUrl }) => ({
      url: publicInventoryUrl(item.url),
      reason,
      ...(primaryUrl ? { primaryUrl: publicInventoryUrl(primaryUrl) } : {}),
    })),
    coverageStatus,
    selectedPages,
    checkedPages: pages.map((page) => checkedPage(page, objectsByUrl)),
    technicalResources: inventory.filter((item) => item.resourceType !== "html" && item.resourceType !== "unknown"),
    technicalFileSummary: buildTechnicalFileSummary(input, selectedPages, objectsByUrl),
    performanceObservation: input.performance ? { ...input.performance } : null,
    checks,
    findings: buildFindings(checks, objectsByUrl),
    categorySummary: buildCategorySummary(checks),
    resultSummary: {
      headline: headline(selectedPages.length, pages.length, statusCounts),
      totalChecks: checks.length,
      completedChecks: statusCounts.pass + statusCounts.warning + statusCounts.fail,
      ...statusCounts,
    },
    limitations: [
      "Фактическое наличие страниц в индексе нельзя подтвердить без Яндекс Вебмастера или Search Console.",
      "Позиции и показы нельзя подтвердить без поискового кабинета и списка запросов.",
      "CTR и переходы из поиска нельзя подтвердить без данных поискового кабинета.",
      "Трафик и действия посетителей нельзя подтвердить без доступа к системе аналитики.",
      "Выводы по страницам относятся только к выбранным HTML-страницам. Технические файлы проверяются отдельно.",
    ],
  };
  return deepFreeze(snapshot);
}

function buildTechnicalFileSummary(
  input: BuildAuditContractV3Input,
  selectedPages: readonly SelectedAuditUrl[],
  objectsByUrl: ReadonlyMap<string, ClassifiedAuditObject>,
): AuditTechnicalFileSummaryV3 {
  const robots = input.robots;
  const sitemap = input.sitemap;
  const target = new URL(publicUrl(input.targetUrl));
  const robotsRead = Boolean(
    robots?.status === "found"
    && robots.httpStatus !== null
    && robots.httpStatus >= 200
    && robots.httpStatus < 300
    && typeof robots.body === "string",
  );
  const selectedRobotsSignals = selectedPages.map((page) => objectsByUrl.get(comparableUrl(page.url)))
    .filter((item): item is ClassifiedAuditObject => Boolean(item));
  const selectedPagesNotBlocked = !robotsRead || selectedRobotsSignals.length !== selectedPages.length
    ? null
    : selectedRobotsSignals.some((item) => item.indexabilitySignals.includes("robots_blocked"))
      ? false
      : selectedRobotsSignals.every((item) => item.indexabilitySignals.includes("robots_allowed"))
        ? true
        : null;
  const sitemapFile = sitemap?.files?.find((file) => file.statusCode !== null && file.statusCode >= 200 && file.statusCode < 300);
  const sitemapUrl = sitemapFile?.url ?? robots?.sitemapUrls[0] ?? new URL("/sitemap.xml", target).href;
  const sitemapObject = objectsByUrl.get(comparableUrl(sitemapUrl));
  const sitemapStatusCode = sitemapFile?.statusCode ?? sitemapObject?.statusCode ?? null;
  const sitemapParsed = Boolean(
    sitemap?.status === "found"
    && sitemap.filesVisited > 0
    && sitemap.errors.length === 0
    && (sitemap.urls.length > 0 || sitemap.files?.some((file) => file.kind === "urlset" || file.kind === "index")),
  );
  const siteUrlsOnly = !sitemapParsed || !sitemap?.urls.length
    ? null
    : sitemap.urls.every((value) => {
      try {
        return new URL(value).origin === target.origin;
      } catch {
        return false;
      }
    });
  const robotsSummary = robots && robotsRead && robots.httpStatus !== null ? {
    url: publicUrl(robots.url),
    statusCode: robots.httpStatus,
    read: true as const,
    selectedPagesNotBlocked,
  } : null;
  const sitemapBreakdown = buildSitemapBreakdown(sitemap?.urls ?? [], input.inventory);

  return {
    ...(robotsSummary ? { robots: robotsSummary } : {}),
    ...(sitemapParsed && sitemapStatusCode !== null && sitemapStatusCode >= 200 && sitemapStatusCode < 300 ? {
      sitemap: {
        url: publicUrl(sitemapUrl),
        statusCode: sitemapStatusCode,
        parsed: true,
        discoveredUrls: sitemap?.urls.length ?? 0,
        ...sitemapBreakdown,
        siteUrlsOnly,
      },
    } : {}),
  };
}

function buildSitemapBreakdown(
  sitemapUrls: readonly string[],
  inventory: readonly ClassifiedAuditObject[],
): Omit<NonNullable<AuditTechnicalFileSummaryV3["sitemap"]>, "url" | "statusCode" | "parsed" | "discoveredUrls" | "siteUrlsOnly"> {
  const byRequestedUrl = new Map<string, ClassifiedAuditObject>();
  for (const item of inventory) {
    byRequestedUrl.set(inventoryComparableUrl(item.url), item);
    const finalKey = inventoryComparableUrl(item.finalUrl);
    if (!byRequestedUrl.has(finalKey)) byRequestedUrl.set(finalKey, item);
  }

  let loadedUrls = 0;
  let htmlUrls = 0;
  let redirectUrls = 0;
  let documentUrls = 0;
  let technicalResourceUrls = 0;
  let errorUrls = 0;
  let skippedByTechnicalLimit = 0;
  for (const rawUrl of sitemapUrls) {
    let item: ClassifiedAuditObject | undefined;
    try {
      item = byRequestedUrl.get(inventoryComparableUrl(rawUrl));
    } catch {
      errorUrls += 1;
      continue;
    }
    if (!item) continue;
    const reasons = new Set(item.classificationReasons);
    if (item.statusCode !== null) loadedUrls += 1;
    if (item.resourceType === "html" && item.statusCode !== null && item.statusCode >= 200 && item.statusCode < 400) htmlUrls += 1;
    if (inventoryComparableUrl(item.url) !== inventoryComparableUrl(item.finalUrl)) redirectUrls += 1;
    if (item.resourceType === "document") documentUrls += 1;
    if (!["html", "document", "unknown"].includes(item.resourceType)) technicalResourceUrls += 1;
    if ((item.statusCode !== null && item.statusCode >= 400) || reasons.has("discovery_fetch_failed")) errorUrls += 1;
    if (reasons.has("discovery_skipped_technical_limit")) skippedByTechnicalLimit += 1;
  }

  return {
    loadedUrls,
    notLoadedUrls: Math.max(0, sitemapUrls.length - loadedUrls),
    htmlUrls,
    redirectUrls,
    documentUrls,
    technicalResourceUrls,
    errorUrls,
    skippedByTechnicalLimit,
  };
}

function buildExclusionSummary(
  excluded: readonly AuditSampleExcludedItem[],
): AuditExclusionSummaryV3[] {
  const counts = new Map<AuditSampleExclusionReason, number>();
  for (const { reason } of excluded) {
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  const order: readonly AuditSampleExclusionReason[] = [
    "search_page",
    "closed_section",
    "technical_page",
    "parameterized_url",
    "redirect",
    "confirmed_duplicate",
    "service_url",
    "technical_object",
    "duplicate_template",
    "other",
  ];
  return order.flatMap((reason) => {
    const count = counts.get(reason) ?? 0;
    return count > 0 ? [{ reason, count }] : [];
  });
}

function deduplicateCheckedPages(pages: readonly PageAnalysis[]): PageAnalysis[] {
  const byUrl = new Map<string, PageAnalysis>();
  for (const page of pages) {
    const key = comparableUrl(page.transport?.finalUrl ?? page.url);
    if (!byUrl.has(key)) byUrl.set(key, page);
  }
  return [...byUrl.values()];
}

function checkedPage(
  page: PageAnalysis,
  objectsByUrl: ReadonlyMap<string, ClassifiedAuditObject>,
): AuditCheckedPageV3 {
  const finalUrl = publicUrl(page.transport?.finalUrl ?? page.url);
  const object = objectsByUrl.get(comparableUrl(finalUrl));
  return {
    url: publicUrl(page.transport?.requestedUrl ?? page.url),
    finalUrl,
    pageType: object?.pageType ?? "unknown",
    templateFamily: object?.templateFamily ?? "unknown",
    classificationConfidence: object?.classificationConfidence ?? 0,
    statusCode: page.status,
    noindex: page.indexing.noindex,
    title: { ...page.title },
    description: { ...page.description },
    h1: { count: page.h1.count, values: [...page.h1.values] },
    canonical: { ...page.canonical },
  };
}

function buildFindings(
  checks: readonly AuditCheckResultV3[],
  objectsByUrl: ReadonlyMap<string, ClassifiedAuditObject>,
): AuditFindingV3[] {
  const groups = new Map<string, AuditCheckResultV3[]>();
  for (const check of checks) {
    if (check.status !== "fail" && check.status !== "warning") continue;
    const key = findingRootCauseKey(check);
    const group = groups.get(key) ?? [];
    group.push(check);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((group) => findingFromGroup(group, objectsByUrl))
    .sort(compareFindings)
    .slice(0, 5);
}

function findingRootCauseKey(check: AuditCheckResultV3): string {
  const normalizedReason = check.reason
    .toLocaleLowerCase("ru")
    .replace(/https?:\/\/\S+/giu, "{url}")
    .replace(/\d+(?:[.,]\d+)?/gu, "{n}")
    .replace(/\s+/gu, " ")
    .trim();
  return `${check.checkId}\u0000${check.status}\u0000${normalizedReason}`;
}

function findingFromGroup(
  group: readonly AuditCheckResultV3[],
  objectsByUrl: ReadonlyMap<string, ClassifiedAuditObject>,
): AuditFindingV3 {
  const first = group[0]!;
  const urls = [...new Set(group.map((item) => item.targetUrl).filter((value): value is string => Boolean(value)))];
  const evidence = group.flatMap((item) => item.evidence).slice(0, 3);
  const examples = evidence.length > 0
    ? evidence
    : urls.slice(0, 3).map((url) => ({ url, observation: first.reason }));
  const confidenceValues = urls
    .map((url) => objectsByUrl.get(comparableUrl(url))?.classificationConfidence)
    .filter((value): value is number => value !== undefined);
  return {
    checkId: first.checkId,
    title: first.title,
    category: first.category,
    severity: highestSeverity(group),
    whatFound: first.reason,
    whyImportant: first.publicExplanation,
    nextStep: nextStep(first.checkId),
    confidence: confidenceValues.length > 0 ? Math.min(...confidenceValues) : 1,
    affectedCount: urls.length > 0 ? urls.length : 1,
    examples,
  };
}

function highestSeverity(group: readonly AuditCheckResultV3[]): AuditCheckSeverityV3 {
  const order: readonly AuditCheckSeverityV3[] = ["critical", "high", "medium", "low", "info"];
  return group
    .map((item) => item.severity ?? "info")
    .sort((left, right) => order.indexOf(left) - order.indexOf(right))[0] ?? "info";
}

function compareFindings(left: AuditFindingV3, right: AuditFindingV3): number {
  const order: readonly AuditCheckSeverityV3[] = ["critical", "high", "medium", "low", "info"];
  return order.indexOf(left.severity) - order.indexOf(right.severity)
    || right.affectedCount - left.affectedCount
    || left.checkId.localeCompare(right.checkId, "en");
}

function nextStep(checkId: string): string {
  const steps: Readonly<Record<string, string>> = {
    indexability: "Если страница должна находиться в поиске, удалите noindex и запустите проверку ещё раз.",
    canonical: "Укажите рабочий основной адрес страницы в canonical.",
    title: "Добавьте отдельный точный заголовок для этой страницы.",
    description: "Добавьте короткое описание содержания страницы.",
    h1: "Оставьте один видимый главный заголовок, соответствующий содержанию.",
    "robots-file": "Проверьте ответ /robots.txt и добавьте файл, если сайту нужны отдельные правила обхода.",
    "sitemap-file": "Опубликуйте рабочий XML sitemap и укажите его в robots.txt.",
  };
  return steps[checkId] ?? "Исправьте подтверждённое отклонение и повторите ту же проверку.";
}

function buildCategorySummary(checks: readonly AuditCheckResultV3[]): AuditCategorySummaryV3[] {
  const categories: readonly AuditCategory[] = [
    "technicalIndexing",
    "structureOnPage",
    "performanceMobile",
    "trustStructuredData",
    "contentImages",
  ];
  return categories.map((category) => {
    const categoryChecks = checks.filter((check) => check.category === category);
    return { category, total: categoryChecks.length, ...countStatuses(categoryChecks) };
  });
}

function countStatuses(checks: readonly AuditCheckResultV3[]): AuditStatusCountsV3 {
  const counts: Record<AuditCheckStatusV3, number> = {
    pass: 0,
    warning: 0,
    fail: 0,
    not_applicable: 0,
    not_run: 0,
    insufficient_data: 0,
  };
  for (const check of checks) counts[check.status] += 1;
  return counts;
}

function headline(selected: number, checked: number, counts: AuditStatusCountsV3): string {
  if (checked < selected) return `Проверено ${checked} из ${selected} выбранных страниц`;
  if (counts.fail > 0) return `Подтверждённых ошибок: ${counts.fail}`;
  if (counts.warning > 0) return `Подтверждённых замечаний: ${counts.warning}`;
  return "В выполненных проверках ошибок не найдено";
}

function deduplicateInventory(inventory: readonly ClassifiedAuditObject[]): ClassifiedAuditObject[] {
  const values = new Map<string, ClassifiedAuditObject>();
  for (const item of inventory) {
    const key = inventoryComparableUrl(item.finalUrl);
    const previous = values.get(key);
    if (!previous || item.classificationConfidence >= previous.classificationConfidence) values.set(key, copyObject(item));
  }
  return [...values.values()].sort((left, right) => left.finalUrl.localeCompare(right.finalUrl, "en"));
}

function buildComparableObjectIndex(
  inventory: readonly ClassifiedAuditObject[],
): Map<string, ClassifiedAuditObject> {
  const values = new Map<string, ClassifiedAuditObject>();
  for (const item of inventory) {
    const key = comparableUrl(item.finalUrl);
    const previous = values.get(key);
    if (!previous || objectIndexPriority(item) > objectIndexPriority(previous)) values.set(key, item);
  }
  return values;
}

function objectIndexPriority(item: ClassifiedAuditObject): number {
  const url = new URL(item.finalUrl);
  const typePriority = item.resourceType === "html" ? 100 : item.resourceType === "unknown" ? 0 : 50;
  const canonicalRoutePriority = url.search ? 0 : 10;
  return typePriority + canonicalRoutePriority + item.classificationConfidence;
}

function deduplicateSelected(selected: readonly SelectedAuditUrl[]): SelectedAuditUrl[] {
  const values = new Map<string, SelectedAuditUrl>();
  for (const item of selected.slice(0, PUBLIC_AUDIT_SAMPLE_LIMIT)) {
    const url = publicUrl(item.url);
    const key = comparableUrl(url);
    if (!values.has(key)) values.set(key, { ...item, url, classificationReasons: [...(item.classificationReasons ?? [])] });
  }
  return [...values.values()];
}

function copyObject(item: ClassifiedAuditObject): ClassifiedAuditObject {
  return {
    ...item,
    indexabilitySignals: [...item.indexabilitySignals],
    authSignals: [...item.authSignals],
    classificationReasons: [...item.classificationReasons],
  };
}

function toInventoryItem(item: ClassifiedAuditObject): AuditUrlInventoryItem {
  return {
    url: item.url,
    finalUrl: item.finalUrl,
    resourceType: item.resourceType,
    pageType: item.pageType,
    language: item.language,
    depth: item.depth,
    templateSignature: item.templateFamily,
    classificationConfidence: item.classificationConfidence,
    classificationReasons: item.classificationReasons,
    canonicalUrl: item.canonicalUrl,
    contentFingerprint: item.contentFingerprint,
  };
}

function pageUrls(page: PageAnalysis): string[] {
  return [page.url, page.transport?.requestedUrl, page.transport?.finalUrl]
    .filter((value): value is string => Boolean(value));
}

function publicUrl(value: string | URL): string {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new TypeError("Audit URL must use HTTP or HTTPS");
  url.username = "";
  url.password = "";
  url.hash = "";
  url.search = "";
  return url.href;
}

function publicInventoryUrl(value: string | URL): string {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new TypeError("Audit URL must use HTTP or HTTPS");
  url.username = "";
  url.password = "";
  url.hash = "";
  return url.href;
}

function comparableUrl(value: string | URL): string {
  const url = new URL(publicUrl(value));
  url.pathname = url.pathname.replace(/\/+$/u, "") || "/";
  return url.href;
}

function inventoryComparableUrl(value: string | URL): string {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new TypeError("Audit URL must use HTTP or HTTPS");
  url.username = "";
  url.password = "";
  url.hash = "";
  url.pathname = url.pathname.replace(/\/+$/u, "") || "/";
  return url.href;
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  return value;
}

// Exported only for the parity gate: every current definition must appear in
// a finished snapshot when its scope has a target.
export const AUDIT_CHECK_IDS_V3 = Object.freeze(AUDIT_CHECK_REGISTRY_V3.map((check) => check.checkId));
