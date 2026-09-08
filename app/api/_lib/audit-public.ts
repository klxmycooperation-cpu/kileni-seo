import { derivePublicAuditCoverage } from "@/src/lib/audit/public-coverage";
import { PUBLIC_AUDIT_PAGE_LIMIT } from "@/src/config/public-audit";
import { buildAuditClientPresentation } from "@/src/lib/audit/client-presentation";

const CATEGORY_VALUES = new Set([
  "technicalIndexing",
  "structureOnPage",
  "performanceMobile",
  "trustStructuredData",
  "contentImages",
]);
const SEVERITY_VALUES = new Set(["critical", "high", "medium", "low", "info"]);
const MAX_CHECKED_PAGES = PUBLIC_AUDIT_PAGE_LIMIT;
const MAX_ISSUE_GROUPS = 20;
const MAX_AFFECTED_URLS = 10;
const MAX_EVIDENCE = 5;
const MAX_UNCHECKED_URLS = 25;
const MAX_V4_UNCHECKED_URLS = 100;
const MAX_V3_SELECTED_PAGES = 10;
const MAX_V3_CHECKS = 30;
const MAX_V3_CHECK_EVIDENCE = 10;
const MAX_V3_CATEGORIES = 5;
const CHECK_STATUS_VALUES = new Set(["pass", "warning", "fail", "not_run", "insufficient_data"]);
const V4_CHECK_STATUS_VALUES = new Set([...CHECK_STATUS_VALUES, "not_applicable"]);
const V4_SCOPE_VALUES = new Set(["site", "resource", "page"]);
const V4_RESOURCE_TYPE_VALUES = new Set(["robots", "sitemap", "xml_feed", "document", "image", "script", "stylesheet", "api", "unknown"]);
const V4_PAGE_TYPE_VALUES = new Set(["homepage", "about", "commercial", "conversion_support", "hub", "detail", "case", "article", "unique", "alternate_locale", "service", "category", "product", "pricing", "contact", "legal", "auth", "account", "cart", "internal_search", "filter", "utility", "unknown"]);
const V4_SELECTION_REASON_VALUES = new Set(["homepage", "primary_commercial", "commercial_different_template", "conversion_support", "category_hub", "detail_page", "case_page", "article_page", "unique_template", "additional_important", "alternate_locale_control", "primary_locale_type_missing", "user_target", "priority_url"]);
const V4_INDEXABILITY_SIGNAL_VALUES = new Set(["meta_noindex", "meta_nofollow", "canonical_present", "canonical_missing", "robots_allowed", "robots_blocked", "sitemap_listed"]);
const V4_AUTH_SIGNAL_VALUES = new Set(["password_input", "login_form", "restricted_status", "login_redirect", "protected_route", "auth_schema", "confirmed_auth_template"]);
const V4_EXCLUSION_REASON_VALUES = new Set(["search_page", "closed_section", "technical_page", "parameterized_url", "redirect", "confirmed_duplicate", "service_url", "technical_object", "duplicate_template", "other"]);
const MAX_V4_CHECKS = 2_000;
const MAX_V4_FINDINGS = 5;
const MAX_V4_TECHNICAL_RESOURCES = 100;
const PAGE_TYPE_VALUES = new Set(["homepage", "commercial", "conversion_support", "hub", "detail", "case", "article", "unique", "alternate_locale"]);
const SELECTION_REASON_VALUES = new Set(["homepage", "primary_commercial", "commercial_different_template", "conversion_support", "category_hub", "detail_page", "case_page", "article_page", "unique_template", "additional_important", "alternate_locale_control"]);

/** Accepts the current v4 snapshot and read-only records from older formats. */
export function sanitizePublicAuditResult(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  if (value.resultVersion === 4) return sanitizePublicAuditContractV4(value);
  if (value.resultVersion === 3) return sanitizePublicAuditContractV3(value);
  return sanitizeLegacyPublicAuditResult(value);
}

function sanitizePublicAuditContractV4(value: Record<string, unknown>): Record<string, unknown> | null {
  if (value.contractVersion !== 3) return null;
  const engineVersion = text(value.engineVersion, 80);
  const auditId = typeof value.auditId === "string" && /^[A-Za-z0-9_-]{1,128}$/u.test(value.auditId)
    ? value.auditId
    : null;
  const createdAt = isoTimestamp(value.createdAt);
  const target = publicUrl(value.target);
  if (!engineVersion || !auditId || !createdAt || !target) return null;
  const hasStoredClientModel = isRecord(value.clientPresentationByLocale);
  if (
    !integer(value.pagesDiscovered, 0, 1_000_000) ||
    !integer(value.pagesEligible, 0, value.pagesDiscovered) ||
    !integer(value.pagesSelected, 0, MAX_V3_SELECTED_PAGES) ||
    !integer(value.pagesChecked, 0, value.pagesSelected) ||
    !integer(value.pagesNotCheckedTotal, 0, 1_000_000) ||
    !integer(value.pagesNotCheckedReturned, 0, MAX_V4_UNCHECKED_URLS) ||
    typeof value.pagesNotCheckedTruncated !== "boolean" ||
    !Array.isArray(value.pagesNotCheckedUrls) ||
    !Array.isArray(value.selectedPages) ||
    !Array.isArray(value.checkedPages) ||
    !Array.isArray(value.technicalResources) ||
    (!hasStoredClientModel && (!Array.isArray(value.checks) || !Array.isArray(value.findings) ||
      !Array.isArray(value.categorySummary) || !Array.isArray(value.limitations)))
  ) return null;
  const pagesExcluded = value.pagesDiscovered - value.pagesEligible;
  const pagesNotCompleted = value.pagesSelected - value.pagesChecked;
  const pagesOutsideSample = value.pagesEligible - value.pagesSelected;
  if ((value.pagesExcluded !== undefined && value.pagesExcluded !== pagesExcluded) ||
      (value.pagesNotCompleted !== undefined && value.pagesNotCompleted !== pagesNotCompleted) ||
      (value.pagesNotCheckedTotal !== pagesOutsideSample && value.pagesNotCheckedTotal !== pagesOutsideSample + pagesNotCompleted)) return null;
  const expectedCoverage = value.pagesChecked === value.pagesSelected ? "sample_complete" : "sample_partial";
  if (value.coverageStatus !== expectedCoverage) return null;

  const inventorySummary = sanitizeInventorySummaryV4(value.inventorySummary, {
    htmlFound: value.pagesDiscovered,
    eligibleHtml: value.pagesEligible,
    excludedHtml: pagesExcluded,
    selected: value.pagesSelected,
    checked: value.pagesChecked,
    notCompleted: pagesNotCompleted,
    outsideSample: pagesOutsideSample,
  });
  if (!inventorySummary ||
      inventorySummary.htmlFound !== value.pagesDiscovered ||
      inventorySummary.eligibleHtml !== value.pagesEligible ||
      inventorySummary.selected !== value.pagesSelected ||
      inventorySummary.checked !== value.pagesChecked) return null;
  const selectedPages = value.selectedPages.slice(0, MAX_V3_SELECTED_PAGES).flatMap(sanitizeSelectedPageV4);
  const checkedPages = value.checkedPages.slice(0, MAX_CHECKED_PAGES).flatMap(sanitizeCheckedPageV4);
  if (selectedPages.length !== value.pagesSelected || checkedPages.length !== value.pagesChecked) return null;
  const selectedUrlKeys = new Set(selectedPages.map((page) => publicUrlKey(page.url)));
  const pagesNotCheckedUrls = uniqueUrls(value.pagesNotCheckedUrls, MAX_V4_UNCHECKED_URLS)
    .filter((url) => !selectedUrlKeys.has(publicUrlKey(url)))
    .slice(0, pagesOutsideSample);
  if (pagesNotCheckedUrls.length > pagesOutsideSample) return null;
  const technicalResources = value.technicalResources
    .slice(0, MAX_V4_TECHNICAL_RESOURCES)
    .flatMap(sanitizeTechnicalResourceV4);
  if (!hasStoredClientModel) {
    const rawChecks = value.checks as unknown[];
    const rawFindings = value.findings as unknown[];
    const rawCategories = value.categorySummary as unknown[];
    const checks = rawChecks.slice(0, MAX_V4_CHECKS).flatMap(sanitizeCheckV4);
    if (checks.length !== rawChecks.length) return null;
    if (!sanitizeResultSummaryV4(value.resultSummary)) return null;
    if (rawFindings.slice(0, MAX_V4_FINDINGS).flatMap(sanitizeFindingV4).length !== Math.min(rawFindings.length, MAX_V4_FINDINGS)) return null;
    if (rawCategories.slice(0, MAX_V3_CATEGORIES).flatMap(sanitizeCategorySummaryV4).length !== Math.min(rawCategories.length, MAX_V3_CATEGORIES)) return null;
  }
  const exclusionSummary = sanitizeExclusionSummaryV4(value.exclusionSummary, pagesExcluded);
  if (!exclusionSummary) return null;
  const excludedPages = sanitizeExcludedPagesV4(value.excludedPages, pagesExcluded);
  if (!excludedPages) return null;
  const clientPresentationByLocale = {
    ru: buildAuditClientPresentation(value, "ru"),
    en: buildAuditClientPresentation(value, "en"),
  };

  return deepFreeze({
    resultVersion: 4,
    contractVersion: 3,
    engineVersion,
    auditId,
    createdAt,
    target,
    inventorySummary,
    pagesDiscovered: value.pagesDiscovered,
    pagesEligible: value.pagesEligible,
    pagesExcluded,
    pagesSelected: value.pagesSelected,
    pagesChecked: value.pagesChecked,
    pagesNotCompleted,
    pagesNotCheckedTotal: pagesOutsideSample,
    pagesNotCheckedReturned: pagesNotCheckedUrls.length,
    pagesNotCheckedTruncated: value.pagesNotCheckedTotal > pagesNotCheckedUrls.length,
    pagesNotCheckedUrls,
    exclusionSummary,
    excludedPages,
    coverageStatus: expectedCoverage,
    selectedPages,
    checkedPages,
    technicalResources,
    clientPresentationByLocale,
  });
}

function sanitizeInventorySummaryV4(
  value: unknown,
  expected: {
    htmlFound: number;
    eligibleHtml: number;
    excludedHtml: number;
    selected: number;
    checked: number;
    notCompleted: number;
    outsideSample: number;
  },
): Record<string, number> | null {
  if (!isRecord(value) ||
      !integer(value.objectsFound, 0, 1_000_000) ||
      !integer(value.htmlFound, 0, value.objectsFound) ||
      !integer(value.eligibleHtml, 0, value.htmlFound) ||
      !integer(value.selected, 0, MAX_V3_SELECTED_PAGES) ||
      !integer(value.checked, 0, value.selected) ||
      !integer(value.representedPageTypes, 0, value.selected)) return null;
  if (value.htmlFound !== expected.htmlFound || value.eligibleHtml !== expected.eligibleHtml ||
      value.selected !== expected.selected || value.checked !== expected.checked ||
      (value.excludedHtml !== undefined && value.excludedHtml !== expected.excludedHtml) ||
      (value.notCompleted !== undefined && value.notCompleted !== expected.notCompleted) ||
      (value.outsideSample !== undefined && value.outsideSample !== expected.outsideSample)) return null;
  return {
    objectsFound: value.objectsFound,
    htmlFound: value.htmlFound,
    eligibleHtml: value.eligibleHtml,
    excludedHtml: expected.excludedHtml,
    selected: value.selected,
    checked: value.checked,
    notCompleted: expected.notCompleted,
    outsideSample: expected.outsideSample,
    representedPageTypes: value.representedPageTypes,
  };
}

function sanitizeExclusionSummaryV4(value: unknown, excluded: number): Array<{ reason: string; count: number }> | null {
  if (value === undefined && excluded === 0) return [];
  if (value === undefined) return [{ reason: "other", count: excluded }];
  if (!Array.isArray(value)) return null;
  const result: Array<{ reason: string; count: number }> = [];
  let total = 0;
  for (const item of value) {
    if (!isRecord(item) || typeof item.reason !== "string" || !V4_EXCLUSION_REASON_VALUES.has(item.reason) ||
        !integer(item.count, 1, 1_000_000)) return null;
    total += item.count;
    result.push({ reason: item.reason, count: item.count });
  }
  return total === excluded ? result : null;
}

function sanitizeExcludedPagesV4(value: unknown, excluded: number): Array<Record<string, unknown>> | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > excluded || value.length > 100) return null;
  const result: Array<Record<string, unknown>> = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.reason !== "string" || !V4_EXCLUSION_REASON_VALUES.has(item.reason)) return null;
    const url = publicUrl(item.url);
    const primaryUrl = item.primaryUrl === undefined ? undefined : publicUrl(item.primaryUrl);
    if (!url || primaryUrl === null) return null;
    result.push({ url, reason: item.reason, ...(primaryUrl ? { primaryUrl } : {}) });
  }
  return result;
}

function publicUrlKey(value: unknown): string {
  const url = publicUrl(value);
  return url ? url.replace(/\/$/u, "") : "";
}

function sanitizeSelectedPageV4(value: unknown): Record<string, unknown>[] {
  if (!isRecord(value)) return [];
  const url = publicUrl(value.url);
  const pageType = typeof value.pageType === "string" && V4_PAGE_TYPE_VALUES.has(value.pageType) ? value.pageType : null;
  const selectionReason = typeof value.selectionReason === "string" && V4_SELECTION_REASON_VALUES.has(value.selectionReason) ? value.selectionReason : null;
  const templateFamily = value.templateFamily === undefined
    ? undefined
    : text(value.templateFamily, 160);
  const locale = value.locale === null
    ? null
    : typeof value.locale === "string" && /^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/iu.test(value.locale)
      ? value.locale.toLowerCase()
      : undefined;
  const confidence = value.classificationConfidence === undefined
    ? undefined
    : finiteNumber(value.classificationConfidence, 0, 1) ? value.classificationConfidence : null;
  const reasons = value.classificationReasons === undefined
    ? undefined
    : Array.isArray(value.classificationReasons)
      ? value.classificationReasons.slice(0, 10).flatMap((item) => {
        const sanitized = text(item, 300);
        return sanitized === null ? [] : [sanitized];
      })
      : null;
  if (!url || !pageType || !selectionReason || templateFamily === null || locale === undefined || confidence === null || reasons === null) return [];
  return [{
    url,
    pageType,
    selectionReason,
    locale,
  }];
}

function sanitizeCheckedPageV4(value: unknown): Record<string, unknown>[] {
  if (!isRecord(value)) return [];
  const url = publicUrl(value.url);
  const finalUrl = publicUrl(value.finalUrl);
  const pageType = typeof value.pageType === "string" && V4_PAGE_TYPE_VALUES.has(value.pageType) ? value.pageType : null;
  const templateFamily = value.templateFamily === undefined
    ? undefined
    : text(value.templateFamily, 160);
  const confidence = value.classificationConfidence === undefined
    ? undefined
    : finiteNumber(value.classificationConfidence, 0, 1) ? value.classificationConfidence : null;
  const title = sanitizeTextSignal(value.title);
  const description = sanitizeTextSignal(value.description);
  const h1 = sanitizeH1(value.h1);
  const canonical = sanitizeCanonical(value.canonical);
  if (!url || !finalUrl || !pageType || templateFamily === null || confidence === null ||
      !integer(value.statusCode, 100, 599) || typeof value.noindex !== "boolean" ||
      !title || !description || !h1 || !canonical) return [];
  return [{
    url,
    finalUrl,
    pageType,
    statusCode: value.statusCode,
    noindex: value.noindex,
    title,
    description,
    h1,
    canonical,
  }];
}

function sanitizeTechnicalResourceV4(value: unknown): Record<string, unknown>[] {
  if (!isRecord(value)) return [];
  const url = publicUrl(value.url);
  const finalUrl = publicUrl(value.finalUrl);
  const resourceType = typeof value.resourceType === "string" && V4_RESOURCE_TYPE_VALUES.has(value.resourceType) ? value.resourceType : null;
  const templateFamily = value.templateFamily === undefined
    ? undefined
    : text(value.templateFamily, 160);
  const language = value.language === null ? null : text(value.language, 30);
  const statusCode = value.statusCode === null ? null : integer(value.statusCode, 100, 599) ? value.statusCode : undefined;
  const contentType = value.contentType === null ? null : text(value.contentType, 160);
  const indexabilitySignals = enumArray(value.indexabilitySignals, V4_INDEXABILITY_SIGNAL_VALUES, 20);
  const authSignals = enumArray(value.authSignals, V4_AUTH_SIGNAL_VALUES, 20);
  const confidence = value.classificationConfidence === undefined
    ? undefined
    : finiteNumber(value.classificationConfidence, 0, 1) ? value.classificationConfidence : null;
  const classificationReasons = value.classificationReasons === undefined
    ? undefined
    : textArray(value.classificationReasons, 10, 300);
  if (!url || !finalUrl || !resourceType || value.pageType !== null || templateFamily === null ||
      language === null && value.language !== null || !integer(value.depth, 0, 10_000) ||
      statusCode === undefined || contentType === null && value.contentType !== null ||
      !indexabilitySignals || !authSignals || confidence === null || classificationReasons === null) return [];
  return [{
    url,
    finalUrl,
    resourceType,
    pageType: null,
    language,
    depth: value.depth,
    statusCode,
    contentType,
    indexabilitySignals,
    authSignals,
  }];
}

function sanitizeCheckV4(value: unknown): Record<string, unknown>[] {
  if (!isRecord(value)) return [];
  const checkId = typeof value.checkId === "string" && /^[a-z0-9][a-z0-9-]{0,79}$/u.test(value.checkId) ? value.checkId : null;
  const title = text(value.title, 300);
  const category = typeof value.category === "string" && CATEGORY_VALUES.has(value.category) ? value.category : null;
  const scope = typeof value.scope === "string" && V4_SCOPE_VALUES.has(value.scope) ? value.scope : null;
  const status = typeof value.status === "string" && V4_CHECK_STATUS_VALUES.has(value.status) ? value.status : null;
  const severity = value.severity === null
    ? null
    : typeof value.severity === "string" && SEVERITY_VALUES.has(value.severity) ? value.severity : undefined;
  const targetUrl = value.targetUrl === undefined ? undefined : publicUrl(value.targetUrl);
  const reason = text(value.reason, 1_000);
  const publicExplanation = text(value.publicExplanation, 1_000);
  const automationLimit = text(value.automationLimit, 1_000);
  const evidence = Array.isArray(value.evidence)
    ? value.evidence.slice(0, MAX_V3_CHECK_EVIDENCE).flatMap(sanitizeEvidence)
    : null;
  if (!checkId || !integer(value.version, 1, 100) || title === null || !category || !scope || !status ||
      severity === undefined || targetUrl === null || reason === null || publicExplanation === null || automationLimit === null || evidence === null) return [];
  return [{
    checkId,
    version: value.version,
    title,
    category,
    scope,
    status,
    severity,
    ...(targetUrl === undefined ? {} : { targetUrl }),
    reason,
    publicExplanation,
    automationLimit,
    evidence,
  }];
}

function sanitizeFindingV4(value: unknown): Record<string, unknown>[] {
  if (!isRecord(value)) return [];
  const checkId = typeof value.checkId === "string" && /^[a-z0-9][a-z0-9-]{0,79}$/u.test(value.checkId) ? value.checkId : null;
  const title = text(value.title, 300);
  const category = typeof value.category === "string" && CATEGORY_VALUES.has(value.category) ? value.category : null;
  const severity = typeof value.severity === "string" && SEVERITY_VALUES.has(value.severity) ? value.severity : null;
  const whatFound = text(value.whatFound, 1_000);
  const whyImportant = text(value.whyImportant, 1_000);
  const nextStep = text(value.nextStep, 1_000);
  const confidence = value.confidence === undefined
    ? undefined
    : finiteNumber(value.confidence, 0, 1) ? value.confidence : null;
  const examples = Array.isArray(value.examples)
    ? value.examples.slice(0, 3).flatMap(sanitizeEvidence)
    : null;
  if (!checkId || title === null || !category || !severity || whatFound === null || whyImportant === null || nextStep === null ||
      confidence === null || !integer(value.affectedCount, 0, 1_000_000) || examples === null) return [];
  return [{ checkId, title, category, severity, whatFound, whyImportant, nextStep, affectedCount: value.affectedCount, examples }];
}

function sanitizeCategorySummaryV4(value: unknown): Record<string, unknown>[] {
  if (!isRecord(value) || typeof value.category !== "string" || !CATEGORY_VALUES.has(value.category)) return [];
  const counts = sanitizeStatusCountsV4(value);
  if (!counts || !integer(value.total, 0, MAX_V4_CHECKS)) return [];
  return [{ category: value.category, total: value.total, ...counts }];
}

function sanitizeResultSummaryV4(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  const headline = text(value.headline, 500);
  const counts = sanitizeStatusCountsV4(value);
  if (headline === null || !counts || !integer(value.totalChecks, 0, MAX_V4_CHECKS) ||
      !integer(value.completedChecks, 0, value.totalChecks)) return null;
  return { headline, totalChecks: value.totalChecks, completedChecks: value.completedChecks, ...counts };
}

function sanitizeStatusCountsV4(value: Record<string, unknown>): Record<string, number> | null {
  const result: Record<string, number> = {};
  for (const status of V4_CHECK_STATUS_VALUES) {
    const count = value[status];
    if (!integer(count, 0, MAX_V4_CHECKS)) return null;
    result[status] = count;
  }
  return result;
}

function sanitizeLegacyPublicAuditResult(value: Record<string, unknown>): Record<string, unknown> | null {
  const derivedCoverage = derivePublicAuditCoverage({ result: value, pageLimit: MAX_CHECKED_PAGES });
  const result: Record<string, unknown> = {
    resultVersion: integer(value.resultVersion, 1, 100) ? value.resultVersion : 1,
    legacyFormat: true,
    pagesSelected: derivedCoverage.pagesSelected,
    coverageStatus: derivedCoverage.coverageStatus,
  };
  const finalUrl = publicUrl(value.finalUrl);
  if (finalUrl) result.finalUrl = finalUrl;
  const interpretation = text(value.interpretation, 500);
  if (interpretation !== null) result.interpretation = interpretation;
  if (integer(value.pagesChecked, 0, 1_000_000)) result.pagesChecked = value.pagesChecked;
  if (integer(value.pagesDiscovered, 0, 1_000_000)) result.pagesDiscovered = value.pagesDiscovered;

  const coverage = sanitizeCoverage(value.coverage);
  if (coverage) result.coverage = coverage;
  const issueCounts = sanitizeIssueCounts(value.issueCounts);
  if (issueCounts) result.issueCounts = issueCounts;
  const summary = sanitizeSummary(value.summary);
  if (summary) result.summary = summary;

  if (Array.isArray(value.categories)) {
    result.categories = value.categories.slice(0, 20).flatMap(sanitizeCategory);
  }
  if (Array.isArray(value.issueGroups)) {
    result.issueGroups = value.issueGroups.slice(0, MAX_ISSUE_GROUPS).flatMap(sanitizeIssueGroup);
  }
  if (Array.isArray(value.checkedPages)) {
    result.checkedPages = value.checkedPages.slice(0, MAX_CHECKED_PAGES).flatMap(sanitizeCheckedPage);
  }
  const indexability = sanitizeIndexability(value.indexability);
  if (indexability) result.indexability = indexability;
  if (Array.isArray(value.uncheckedUrls)) {
    result.uncheckedUrls = uniqueUrls(value.uncheckedUrls, MAX_UNCHECKED_URLS);
  }
  const hasSavedFacts = Object.keys(result).some((key) =>
    key !== "resultVersion" && key !== "legacyFormat" && key !== "pagesSelected" && key !== "coverageStatus");
  return hasSavedFacts ? result : null;
}

function sanitizePublicAuditContractV3(value: Record<string, unknown>): Record<string, unknown> | null {
  if (value.contractVersion !== 2) return null;
  const engineVersion = text(value.engineVersion, 80);
  const auditId = typeof value.auditId === "string" && /^[A-Za-z0-9_-]{1,128}$/u.test(value.auditId)
    ? value.auditId
    : null;
  const createdAt = isoTimestamp(value.createdAt);
  const target = publicUrl(value.target);
  if (!engineVersion || !auditId || !createdAt || !target) return null;
  if (
    !integer(value.pagesDiscovered, 0, 1_000_000) ||
    !integer(value.pagesSelected, 0, MAX_V3_SELECTED_PAGES) ||
    !integer(value.pagesChecked, 0, value.pagesSelected) ||
    !integer(value.pagesNotCheckedTotal, 0, 1_000_000) ||
    typeof value.pagesNotCheckedTruncated !== "boolean" ||
    !Array.isArray(value.pagesNotCheckedUrls) ||
    !Array.isArray(value.selectedPages) ||
    !Array.isArray(value.checks) ||
    !Array.isArray(value.categorySummary)
  ) return null;
  if (value.pagesDiscovered < value.pagesChecked) return null;
  const expectedCoverage = value.pagesChecked === value.pagesSelected ? "sample_complete" : "sample_partial";
  if (value.coverageStatus !== expectedCoverage) return null;

  const selectedPages = value.selectedPages
    .slice(0, MAX_V3_SELECTED_PAGES)
    .flatMap(sanitizeSelectedPageV3);
  if (selectedPages.length !== value.pagesSelected) return null;
  const checkedPages = Array.isArray(value.checkedPages)
    ? value.checkedPages.slice(0, MAX_CHECKED_PAGES).flatMap(sanitizeCheckedPage)
    : [];
  const pagesNotCheckedUrls = uniqueUrls(value.pagesNotCheckedUrls, MAX_UNCHECKED_URLS);
  const pagesNotCheckedReturned = pagesNotCheckedUrls.length;
  if (pagesNotCheckedReturned > value.pagesNotCheckedTotal) return null;
  const checks = value.checks.slice(0, MAX_V3_CHECKS).flatMap(sanitizeCheckV3);
  const categorySummary = value.categorySummary
    .slice(0, MAX_V3_CATEGORIES)
    .flatMap(sanitizeCategorySummaryV3);
  const resultSummary = sanitizeResultSummaryV3(value.resultSummary);
  if (!resultSummary) return null;

  return {
    resultVersion: 3,
    contractVersion: 2,
    engineVersion,
    auditId,
    createdAt,
    target,
    pagesDiscovered: value.pagesDiscovered,
    pagesSelected: value.pagesSelected,
    pagesChecked: value.pagesChecked,
    pagesNotCheckedTotal: value.pagesNotCheckedTotal,
    pagesNotCheckedReturned,
    pagesNotCheckedTruncated: value.pagesNotCheckedTotal > pagesNotCheckedReturned,
    pagesNotCheckedUrls,
    coverageStatus: expectedCoverage,
    selectedPages,
    checkedPages,
    checks,
    categorySummary,
    resultSummary,
  };
}

function sanitizeSelectedPageV3(value: unknown): Record<string, unknown>[] {
  if (!isRecord(value)) return [];
  const url = publicUrl(value.url);
  const pageType = typeof value.pageType === "string" && PAGE_TYPE_VALUES.has(value.pageType)
    ? value.pageType
    : null;
  const selectionReason = typeof value.selectionReason === "string" && SELECTION_REASON_VALUES.has(value.selectionReason)
    ? value.selectionReason
    : null;
  const templateFamily = text(value.templateFamily, 160);
  const locale = value.locale === null
    ? null
    : typeof value.locale === "string" && /^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/iu.test(value.locale)
      ? value.locale.toLowerCase()
      : undefined;
  if (!url || !pageType || !selectionReason || templateFamily === null || locale === undefined) return [];
  return [{ url, pageType, selectionReason, templateFamily, locale }];
}

function sanitizeCheckV3(value: unknown): Record<string, unknown>[] {
  if (!isRecord(value)) return [];
  const checkId = typeof value.checkId === "string" && /^[a-z0-9][a-z0-9-]{0,79}$/u.test(value.checkId)
    ? value.checkId
    : null;
  const category = typeof value.category === "string" && CATEGORY_VALUES.has(value.category)
    ? value.category
    : null;
  const status = typeof value.status === "string" && CHECK_STATUS_VALUES.has(value.status)
    ? value.status
    : null;
  const severity = typeof value.severity === "string" && SEVERITY_VALUES.has(value.severity)
    ? value.severity
    : null;
  const title = text(value.title, 300);
  const expected = text(value.expected, 1_000);
  const explanation = text(value.explanation, 1_000);
  const automationLimit = text(value.automationLimit, 1_000);
  if (!checkId || !integer(value.checkVersion, 1, 100) || !category || !status || !severity ||
      title === null || expected === null || explanation === null || automationLimit === null) return [];
  const urlEvidence = Array.isArray(value.urlEvidence)
    ? value.urlEvidence.slice(0, MAX_V3_CHECK_EVIDENCE).flatMap(sanitizeEvidence)
    : [];
  return [{
    checkId,
    checkVersion: value.checkVersion,
    category,
    title,
    status,
    value: sanitizeBoundedValue(value.value),
    expected,
    severity,
    urlEvidence,
    explanation,
    automationLimit,
  }];
}

function sanitizeCategorySummaryV3(value: unknown): Record<string, unknown>[] {
  if (!isRecord(value) || typeof value.category !== "string" || !CATEGORY_VALUES.has(value.category)) return [];
  const counts = sanitizeStatusCountsV3(value);
  if (!counts || !integer(value.total, 0, MAX_V3_CHECKS)) return [];
  return [{ category: value.category, total: value.total, ...counts }];
}

function sanitizeResultSummaryV3(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  const headline = text(value.headline, 500);
  const counts = sanitizeStatusCountsV3(value);
  if (headline === null || !counts || !integer(value.totalChecks, 0, MAX_V3_CHECKS) ||
      !integer(value.completedChecks, 0, value.totalChecks)) return null;
  return { headline, totalChecks: value.totalChecks, completedChecks: value.completedChecks, ...counts };
}

function sanitizeStatusCountsV3(value: Record<string, unknown>): Record<string, number> | null {
  const result: Record<string, number> = {};
  for (const status of CHECK_STATUS_VALUES) {
    const count = value[status];
    if (!integer(count, 0, MAX_V3_CHECKS)) return null;
    result[status] = count;
  }
  return result;
}

function sanitizeBoundedValue(value: unknown, depth = 0): unknown {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") return text(value, 500);
  if (depth >= 3) return null;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeBoundedValue(item, depth + 1));
  if (!isRecord(value)) return null;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => /^[A-Za-z0-9_-]{1,80}$/u.test(key))
      .slice(0, 20)
      .map(([key, child]) => [key, sanitizeBoundedValue(child, depth + 1)]),
  );
}

function isoTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 40) return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : null;
}

function sanitizeCoverage(value: unknown): Record<string, number> | null {
  if (!isRecord(value) ||
      !integer(value.pageLimit, 1, 10) ||
      !integer(value.plannedPages, 0, value.pageLimit) ||
      !integer(value.checkedPages, 0, value.pageLimit) ||
      !finiteNumber(value.ratio, 0, 1) ||
      value.checkedPages > value.plannedPages) return null;
  return {
    pageLimit: value.pageLimit,
    plannedPages: value.plannedPages,
    checkedPages: value.checkedPages,
    ratio: value.ratio,
  };
}

function sanitizeIssueCounts(value: unknown): Record<string, number> | null {
  if (!isRecord(value)) return null;
  const counts: Record<string, number> = {};
  let total = 0;
  for (const severity of SEVERITY_VALUES) {
    const count = value[severity];
    if (!integer(count, 0, 1_000_000)) return null;
    counts[severity] = count;
    total += count;
  }
  return { ...counts, total };
}

function sanitizeSummary(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  const headline = text(value.headline, 300);
  if (headline === null || !Array.isArray(value.facts)) return null;
  const facts = value.facts.slice(0, 8).flatMap((fact) => {
    const sanitized = text(fact, 500);
    return sanitized === null ? [] : [sanitized];
  });
  return { headline, facts };
}

function sanitizeCategory(value: unknown): Record<string, unknown>[] {
  if (!isRecord(value)) return [];
  const name = text(value.name, 160);
  const explanation = text(value.explanation, 1_000);
  if (name === null || explanation === null) return [];
  const risk = value.risk === "unknown" ? "not_checked" : value.risk;
  if (risk !== "low" && risk !== "medium" && risk !== "high" && risk !== "not_checked") return [];
  const status = risk === "not_checked" ? "not_checked" : "checked";
  if (status === "not_checked") {
    const reason = text(value.reason, 1_000) ?? explanation;
    return [{ name, risk, status, explanation, reason }];
  }
  return [{ name, risk, status, explanation }];
}

function sanitizeIssueGroup(value: unknown): Record<string, unknown>[] {
  if (!isRecord(value)) return [];
  const code = typeof value.code === "string" && /^[A-Z][A-Z0-9_]{0,79}$/u.test(value.code)
    ? value.code
    : null;
  const category = typeof value.category === "string" && CATEGORY_VALUES.has(value.category)
    ? value.category
    : null;
  const severity = typeof value.severity === "string" && SEVERITY_VALUES.has(value.severity)
    ? value.severity
    : null;
  const title = text(value.title, 300);
  const why = text(value.why, 1_000);
  const fix = text(value.fix, 1_000);
  const acceptance = text(value.acceptance, 1_000);
  if (!code || !category || !severity || title === null || why === null || fix === null || acceptance === null) return [];
  const affectedUrls = Array.isArray(value.affectedUrls)
    ? uniqueUrls(value.affectedUrls, MAX_AFFECTED_URLS)
    : [];
  const affectedCount = integer(value.affectedCount, affectedUrls.length, 1_000_000)
    ? value.affectedCount
    : affectedUrls.length;
  const evidence = Array.isArray(value.evidence)
    ? value.evidence.slice(0, MAX_EVIDENCE).flatMap(sanitizeEvidence)
    : [];
  return [{
    code,
    category,
    severity,
    title,
    why,
    fix,
    acceptance,
    affectedCount,
    affectedUrls,
    evidence,
  }];
}

function sanitizeEvidence(value: unknown): Record<string, unknown>[] {
  if (!isRecord(value)) return [];
  const observation = text(value.observation, 1_000);
  if (observation === null) return [];
  const url = publicUrl(value.url);
  return [{ ...(url ? { url } : {}), observation }];
}

function sanitizeCheckedPage(value: unknown): Record<string, unknown>[] {
  if (!isRecord(value)) return [];
  const url = publicUrl(value.url);
  const finalUrl = publicUrl(value.finalUrl);
  const http = sanitizeHttp(value.http);
  const title = sanitizeTextSignal(value.title);
  const description = sanitizeTextSignal(value.description);
  const h1 = sanitizeH1(value.h1);
  const canonical = sanitizeCanonical(value.canonical);
  const sitemap = sanitizeSitemap(value.sitemap);
  const internalLinks = sanitizeInternalLinks(value.internalLinks);
  if (!url || !finalUrl || !http || !title || !description || !h1 ||
      typeof value.noindex !== "boolean" || !canonical || !sitemap || !internalLinks) return [];
  return [{
    url,
    finalUrl,
    http,
    title,
    description,
    h1,
    noindex: value.noindex,
    canonical,
    sitemap,
    internalLinks,
  }];
}

function sanitizeHttp(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value) || !integer(value.status, 100, 599) ||
      typeof value.ok !== "boolean" || !integer(value.redirectCount, 0, 20)) return null;
  return { status: value.status, ok: value.ok, redirectCount: value.redirectCount };
}

function sanitizeTextSignal(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value) || (value.value !== null && typeof value.value !== "string") ||
      typeof value.present !== "boolean" || !integer(value.length, 0, 100_000) ||
      typeof value.optimal !== "boolean") return null;
  const sanitizedValue = value.value === null ? null : text(value.value, 1_000);
  if (value.value !== null && sanitizedValue === null) return null;
  return { value: sanitizedValue, present: value.present, length: value.length, optimal: value.optimal };
}

function sanitizeH1(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value) || !integer(value.count, 0, 10_000) || !Array.isArray(value.values)) return null;
  const values = value.values.slice(0, 5).flatMap((item) => {
    const sanitized = text(item, 500);
    return sanitized === null ? [] : [sanitized];
  });
  return { count: value.count, values };
}

function sanitizeCanonical(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value) || typeof value.valid !== "boolean" ||
      (value.selfReferential !== null && typeof value.selfReferential !== "boolean")) return null;
  const url = value.url === null ? null : publicUrl(value.url);
  if (value.url !== null && !url) return null;
  return { url, valid: value.valid, selfReferential: value.selfReferential };
}

function sanitizeSitemap(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  if (value.status === "checked" && typeof value.included === "boolean") {
    return { status: "checked", included: value.included };
  }
  const reason = text(value.reason, 500);
  if (value.status === "not_checked" && value.included === null && reason !== null) {
    return { status: "not_checked", included: null, reason };
  }
  return null;
}

function sanitizeInternalLinks(value: unknown): Record<string, number> | null {
  if (!isRecord(value) || !integer(value.outgoing, 0, 1_000_000) ||
      !integer(value.incomingFromCheckedPages, 0, MAX_CHECKED_PAGES)) return null;
  return { outgoing: value.outgoing, incomingFromCheckedPages: value.incomingFromCheckedPages };
}

function sanitizeIndexability(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value) || !integer(value.checkedPages, 0, MAX_CHECKED_PAGES) ||
      !integer(value.indexablePages, 0, value.checkedPages) ||
      !integer(value.noindexPages, 0, value.checkedPages) ||
      !integer(value.httpErrorPages, 0, value.checkedPages)) return null;
  if (value.status === "checked" && value.checkedPages > 0 && finiteNumber(value.ratio, 0, 1)) {
    return {
      status: "checked",
      checkedPages: value.checkedPages,
      indexablePages: value.indexablePages,
      noindexPages: value.noindexPages,
      httpErrorPages: value.httpErrorPages,
      ratio: value.ratio,
    };
  }
  const reason = text(value.reason, 500);
  if (value.status === "not_checked" && value.checkedPages === 0 && value.ratio === null && reason !== null) {
    return {
      status: "not_checked",
      checkedPages: 0,
      indexablePages: 0,
      noindexPages: 0,
      httpErrorPages: 0,
      ratio: null,
      reason,
    };
  }
  return null;
}

function uniqueUrls(values: readonly unknown[], limit: number): string[] {
  const output: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const url = publicUrl(value);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    output.push(url);
    if (output.length >= limit) break;
  }
  return output;
}

function textArray(value: unknown, limit: number, maxLength: number): string[] | null {
  if (!Array.isArray(value)) return null;
  const output: string[] = [];
  for (const item of value.slice(0, limit)) {
    const sanitized = text(item, maxLength);
    if (sanitized === null) return null;
    output.push(sanitized);
  }
  return output;
}

function enumArray(value: unknown, allowed: ReadonlySet<string>, limit: number): string[] | null {
  if (!Array.isArray(value)) return null;
  const output: string[] = [];
  for (const item of value.slice(0, limit)) {
    if (typeof item !== "string" || !allowed.has(item)) return null;
    output.push(item);
  }
  return output;
}

function publicUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2_048) return null;
  try {
    const url = new URL(value);
    if ((url.protocol !== "http:" && url.protocol !== "https:") ||
        url.username || url.password || !url.hostname) return null;
    url.search = "";
    url.hash = "";
    const result = url.href;
    return result.length <= 1_000 ? result : null;
  } catch {
    return null;
  }
}

function text(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  return redactPublicText(
    value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/gu, " "),
  ).slice(0, maxLength);
}

function redactPublicText(value: string): string {
  const withoutUrlQueries = value.replace(/https?:\/\/[^\s<>"']+/giu, (match) => {
    const suffix = match.match(/[),.;:!?]+$/u)?.[0] ?? "";
    const rawUrl = suffix ? match.slice(0, -suffix.length) : match;
    return `${publicUrl(rawUrl) ?? "[URL скрыт]"}${suffix}`;
  });
  return withoutUrlQueries.replace(
    /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/giu,
    "[e-mail скрыт]",
  );
}

function finiteNumber(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function integer(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  return value;
}
