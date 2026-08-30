const CATEGORY_VALUES = new Set([
  "technicalIndexing",
  "structureOnPage",
  "performanceMobile",
  "trustStructuredData",
  "contentImages",
]);
const SEVERITY_VALUES = new Set(["critical", "high", "medium", "low", "info"]);
const MAX_CHECKED_PAGES = 10;
const MAX_ISSUE_GROUPS = 20;
const MAX_AFFECTED_URLS = 10;
const MAX_EVIDENCE = 5;
const MAX_UNCHECKED_URLS = 25;

/** Accepts both stored legacy summaries and the bounded v2 evidence contract. */
export function sanitizePublicAuditResult(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  const result: Record<string, unknown> = {};
  if (integer(value.resultVersion, 1, 100)) result.resultVersion = value.resultVersion;
  const finalUrl = publicUrl(value.finalUrl);
  if (finalUrl) result.finalUrl = finalUrl;
  if (finiteNumber(value.score, 0, 100)) result.score = value.score;
  if (typeof value.grade === "string" && /^[A-E]$/u.test(value.grade)) result.grade = value.grade;
  const interpretation = text(value.interpretation, 500);
  if (interpretation !== null) result.interpretation = interpretation;
  if (integer(value.pagesChecked, 0, 1_000_000)) result.pagesChecked = value.pagesChecked;
  if (integer(value.pagesDiscovered, 0, 1_000_000)) result.pagesDiscovered = value.pagesDiscovered;
  if (typeof value.partial === "boolean") result.partial = value.partial;

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
  return Object.keys(result).length > 0 ? result : null;
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
