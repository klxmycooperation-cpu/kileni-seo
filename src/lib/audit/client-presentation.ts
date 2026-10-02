import { normalizeLighthouseObservation } from "./lighthouse-observation";
import type { LighthouseRunStatus } from "./types";

export type AuditClientIssueKind = "critical" | "review" | "optional";

export type AuditClientIssue = {
  checkId: string;
  kind: AuditClientIssueKind;
  title: string;
  url: string;
  affectedUrls: readonly string[];
  whatFound: string;
  whyImportant: string;
  howChecked: string;
  reliability: string;
  nextStep: string;
  details?: readonly { label: string; value: string }[];
};

export type AuditClientEvidence<T> = {
  readonly status: "available" | "unavailable";
  readonly value: T | null;
  readonly reason?: string;
};

export type AuditClientPageEvidence = {
  readonly checkedAt: AuditClientEvidence<string>;
  readonly httpStatus: AuditClientEvidence<number>;
  readonly redirects: AuditClientEvidence<{ readonly count: number; readonly chain: readonly string[] }>;
  readonly title: AuditClientEvidence<{ readonly present: boolean; readonly text: string | null; readonly length: number }>;
  readonly h1: AuditClientEvidence<{ readonly count: number; readonly values: readonly string[] }>;
  readonly canonical: AuditClientEvidence<{ readonly url: string | null; readonly valid: boolean; readonly selfReferential: boolean | null }>;
  readonly robots: AuditClientEvidence<{ readonly allowed: boolean | null; readonly noindex: boolean; readonly meta: string | null; readonly header: string | null }>;
  readonly hreflang: AuditClientEvidence<readonly { readonly language: string; readonly url: string }[]>;
  readonly schema: AuditClientEvidence<{ readonly total: number; readonly valid: number; readonly invalid: number; readonly types: readonly string[] }>;
  readonly internalLinks: AuditClientEvidence<number>;
  readonly actualIndexing: AuditClientEvidence<never>;
};

export type AuditClientPage = {
  url: string;
  typeLabel: string;
  selectionReason: string;
  indexability: string;
  issues: readonly AuditClientIssue[];
  evidence: AuditClientPageEvidence;
};

export type AuditClientCoverageGroup = {
  readonly group: "home" | "commercial_service" | "catalog_sections" | "articles" | "cases" | "glossary_methodology" | "contacts_conversion" | "utility_legal" | "other";
  readonly label: string;
  readonly found: number;
  readonly eligible: number;
  readonly selected: number;
  readonly checked: number;
  readonly unchecked: number;
  readonly coverageStatus: "available" | "unavailable";
};

export type AuditClientUrlDecision = {
  readonly url: string;
  readonly finalUrl: string;
  readonly resourceType: string;
  readonly group: AuditClientCoverageGroup["group"] | null;
  readonly groupLabel: string;
  readonly outcome: "selected" | "unchecked" | "excluded";
  readonly outcomeLabel: string;
  readonly reason: string;
  readonly source: "root" | "link" | "sitemap" | "priority" | "technical" | "unknown";
  readonly sourceLabel: string;
  readonly selectedUrl?: string;
  readonly selectionReason?: string;
  readonly primaryUrl?: string;
};

export type AuditClientTechnicalFile = {
  readonly type: "robots" | "sitemap";
  readonly label: string;
  readonly status: "available" | "unavailable";
  readonly url: string;
  readonly finalUrl: string | null;
  readonly statusCode: number | null;
  readonly loadedAt: string | null;
  readonly reason: string | null;
  readonly facts: readonly string[];
};

export type AuditClientPerformance = {
  readonly status: LighthouseRunStatus;
  readonly label: string;
  readonly targetUrl: string | null;
  readonly capturedAt: string | null;
  readonly profile: string | null;
  readonly runCount: number;
  readonly score: number | null;
  readonly fcpMs: number | null;
  readonly lcpMs: number | null;
  readonly cls: number | null;
  readonly tbtMs: number | null;
  readonly speedIndexMs: number | null;
  readonly lighthouseVersion: string | null;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly durationMs: number | null;
  readonly source: string | null;
  readonly errorCode: string | null;
  readonly reason: string;
};

export type AuditClientExternalMetric = {
  readonly id: "actual_indexing" | "rankings" | "impressions" | "ctr" | "traffic" | "leads" | "conversions";
  readonly label: string;
  readonly status: "unavailable";
  readonly reason: string;
};

export type AuditClientPresentation = {
  readonly modelVersion: 2;
  readonly conclusion: string;
  summary: {
    htmlFound: number;
    scopeLabel: string;
    scopeValue: number;
    checkedLabel: string;
    findingsLabel: string;
    eligible: number;
    excluded: number;
    selected: number;
    checked: number;
    notCompleted: number;
    outsideSample: number;
    critical: number;
    review: number;
    optional: number;
    unverifiedGroups: number;
    unavailableExternalMetrics: number;
  };
  exclusions: readonly {
    reason: "search_page" | "closed_section" | "technical_page" | "parameterized_url" | "redirect" | "confirmed_duplicate" | "service_url" | "technical_object" | "duplicate_template" | "other";
    label: string;
    count: number;
  }[];
  issues: readonly AuditClientIssue[];
  strengths: readonly string[];
  pages: readonly AuditClientPage[];
  coverageGroups: readonly AuditClientCoverageGroup[];
  urlDecisions: readonly AuditClientUrlDecision[];
  technicalFiles: readonly AuditClientTechnicalFile[];
  performance: AuditClientPerformance;
  externalMetrics: readonly AuditClientExternalMetric[];
  publicTechnicalResources: readonly {
    type: "robots" | "sitemap";
    label: string;
    url: string;
    statusCode: number;
    details: readonly string[];
  }[];
  additionalFiles: number;
  additionalDocuments: number;
  additionalFilesBasis: "classified_resources";
  nextStep: {
    primary: string;
    secondary: string;
    note: string;
  };
  limitations: readonly string[];
  disclaimer: string;
};

type AuditLocale = "ru" | "en";

type NormalizedCheck = {
  checkId: string;
  title: string;
  status: string;
  severity: string;
  category: string;
  targetUrl: string;
  reason: string;
  publicExplanation: string;
  automationLimit: string;
};

/**
 * The single client-facing interpretation of an audit snapshot.
 * It deliberately groups engine operations into site conclusions and is used
 * by web, PDF and admin so their counts and recommendations cannot drift.
 */
export function buildAuditClientPresentation(value: unknown, locale: AuditLocale = "ru"): AuditClientPresentation {
  const root = record(value);
  const stored = storedClientPresentation(root, locale);
  if (stored) return stored;
  const inventory = record(root.inventorySummary);
  const reportedChecked = firstInteger(root.pagesChecked, inventory.checked);
  const reportedSelected = firstInteger(root.pagesSelected, inventory.selected, reportedChecked);
  const reportedEligible = firstInteger(root.pagesEligible, inventory.eligibleHtml, reportedSelected);
  const reportedHtml = firstInteger(inventory.htmlFound, root.pagesDiscovered, reportedEligible);
  const checked = Math.min(reportedChecked, reportedSelected);
  const selected = Math.max(checked, Math.min(reportedSelected, reportedEligible));
  const eligible = Math.max(selected, Math.min(reportedEligible, reportedHtml));
  const htmlFound = Math.max(eligible, reportedHtml);
  const excluded = Math.max(0, htmlFound - eligible);
  const notCompleted = Math.max(0, selected - checked);
  const outsideSample = Math.max(0, eligible - selected);
  const checks = records(root.checks).map(normalizeCheck).filter((check) => check.checkId);
  const checkedPages = records(root.checkedPages);
  const selectedByUrl = new Map(records(root.selectedPages).flatMap((page) => {
    const url = cleanUrl(string(page.url));
    return url ? [[urlKey(url), {
      pageType: string(page.pageType),
      selectionReason: string(page.selectionReason),
      locale: string(page.locale),
    }] as const] : [];
  }));
  const performance = buildClientPerformance(root, checks, locale);
  const actionable = aggregateActionableChecks(checks)
    // The absence of BreadcrumbList is not an error by itself. A future
    // recommendation may be shown only when the product has independent
    // evidence that the page is part of a visible hierarchy.
    .filter(({ check }) => check.checkId !== "breadcrumbs")
    .filter(({ check }) => check.checkId !== "performance" || performanceCanSupportFinding(performance));
  const performanceObservation = record(root.performanceObservation);
  const issues = actionable.map(({ check, affectedUrls }) => clientIssue(
    check,
    locale,
    check.checkId === "performance" ? performanceAsObservation(performance) : performanceObservation,
    affectedUrls,
  ));
  const pages = checkedPages.map((page) => {
    const url = cleanUrl(string(page.finalUrl) || string(page.url));
    const selected = selectedByUrl.get(urlKey(url));
    const observedPageType = string(page.pageType);
    const pageType = observedPageType && observedPageType !== "unknown"
      ? observedPageType
      : selected?.pageType || observedPageType;
    return {
      url,
      typeLabel: pageTypeLabel(pageType, url, locale, selected?.selectionReason, selected?.locale),
      selectionReason: selectionReasonLabel(selected?.selectionReason ?? "additional_important", locale),
      indexability: page.noindex === true
        ? locale === "ru" ? "На странице найден явный запрет на индексирование." : "An explicit indexing block was found on the page."
        : locale === "ru"
          ? "Явный технический запрет на индексирование не обнаружен. Фактическое наличие страницы в Яндексе или Google без поисковых кабинетов не проверялось."
          : "No explicit technical indexing block was found. Actual inclusion in search engines was not checked without search-console access.",
      issues: issues.filter((issue) => issue.affectedUrls.some((affectedUrl) => sameUrl(affectedUrl, url))),
      evidence: buildPageEvidence(page, locale),
    };
  }).filter((page) => page.url);
  const resources = records(root.technicalResources);
  const technicalFileSummary = record(root.technicalFileSummary);
  const publicTechnicalResources = resources.flatMap((resource) => {
    const type = string(resource.resourceType);
    const statusCode = integer(resource.statusCode);
    if ((type !== "robots" && type !== "sitemap") || statusCode < 200 || statusCode >= 300) return [];
    const facts = type === "robots" ? record(technicalFileSummary.robots) : record(technicalFileSummary.sitemap);
    if (!Object.keys(facts).length) return [];
    const details = technicalFileDetails(type as "robots" | "sitemap", facts, locale, { htmlFound, eligible });
    return [{
      type: type as "robots" | "sitemap",
      label: type === "robots" ? "robots.txt" : "sitemap.xml",
      url: cleanUrl(string(resource.finalUrl) || string(resource.url)),
      statusCode,
      details,
    }];
  });
  const storedResourceTotals = record(root.technicalResourceTotals);
  const countedResources = additionalResourceCounts(resources);
  const additionalFiles = optionalInteger(storedResourceTotals.additionalFiles) ?? countedResources.additionalFiles;
  const additionalDocuments = optionalInteger(storedResourceTotals.additionalDocuments) ?? countedResources.additionalDocuments;
  const counts = countIssueKinds(issues);
  const exclusions = normalizeExclusions(root.exclusionSummary, excluded, locale);
  const scope = clientScopeSummary(htmlFound, record(technicalFileSummary.sitemap), locale);
  const coverageGroups = buildClientCoverageGroups(root.coverageGroups, locale);
  const urlDecisions = buildClientUrlDecisions(root, records(root.selectedPages), locale);
  const technicalFiles = buildClientTechnicalFiles(technicalFileSummary, locale, { htmlFound, eligible });
  const externalMetrics = buildExternalMetrics(locale);
  const nextStep = locale === "ru" ? {
    primary: "Заказать технический SEO-аудит",
    secondary: "Повторить бесплатную проверку",
    note: "Повторная бесплатная проверка снова ограничена выборкой до 10 страниц.",
  } : {
    primary: "Request a technical SEO audit",
    secondary: "Repeat the free check",
    note: "A repeated free check is still limited to a sample of up to 10 pages.",
  };

  return deepFreeze({
    modelVersion: 2,
    conclusion: conclusionLabel(checked, counts.critical, locale),
    summary: {
      htmlFound,
      ...scope,
      checkedLabel: locale === "ru" ? "Подробно проверено страниц" : "Pages checked in detail",
      findingsLabel: findingSummaryLabel(counts, locale),
      eligible,
      excluded,
      selected,
      checked,
      notCompleted,
      outsideSample,
      critical: counts.critical,
      review: counts.review,
      optional: counts.optional,
      unverifiedGroups: coverageGroups.filter((group) => group.coverageStatus === "available" && group.unchecked > 0).length,
      unavailableExternalMetrics: externalMetrics.length,
    },
    exclusions,
    issues,
    strengths: buildStrengths(checks, checkedPages, publicTechnicalResources, locale),
    pages,
    coverageGroups,
    urlDecisions,
    technicalFiles,
    performance,
    externalMetrics,
    publicTechnicalResources,
    additionalFiles,
    additionalDocuments,
    additionalFilesBasis: "classified_resources",
    nextStep,
    limitations: buildLimitations(checked, locale),
    disclaimer: locale === "ru"
      ? "Это автоматическая проверка публичной части сайта по методике KILENI. Она не заменяет данные Яндекс Вебмастера, Google Search Console, систем аналитики и полный ручной аудит."
      : "This is an automated check of the public website using the KILENI method. It does not replace search-console data, analytics, or a full manual audit.",
  });
}

function storedClientPresentation(
  root: Record<string, unknown>,
  locale: AuditLocale,
): AuditClientPresentation | null {
  const candidate = record(record(root.clientPresentationByLocale)[locale]);
  const summary = record(candidate.summary);
  const nextStep = record(candidate.nextStep);
  if (!Object.keys(candidate).length || !Array.isArray(candidate.issues) || !Array.isArray(candidate.pages) ||
      !Array.isArray(candidate.strengths) || !Array.isArray(candidate.publicTechnicalResources) ||
      !Array.isArray(candidate.exclusions) || !Array.isArray(candidate.limitations)) return null;
  const issues = records(candidate.issues).flatMap((item) => {
    const kind = string(item.kind);
    const checkId = string(item.checkId);
    const url = cleanUrl(string(item.url));
    if (!checkId || !url || !["critical", "review", "optional"].includes(kind)) return [];
    const details = records(item.details).flatMap((detail) => {
      const label = string(detail.label);
      const value = string(detail.value);
      return label && value ? [{ label, value }] : [];
    });
    return [{
      checkId,
      kind: kind as AuditClientIssueKind,
      title: string(item.title),
      url,
      affectedUrls: uniquePublicUrls(item.affectedUrls, url),
      whatFound: string(item.whatFound),
      whyImportant: string(item.whyImportant),
      howChecked: string(item.howChecked),
      reliability: string(item.reliability),
      nextStep: string(item.nextStep),
      ...(details.length ? { details } : {}),
    }];
  });
  const selectedByUrl = new Map(records(root.selectedPages).flatMap((page) => {
    const url = cleanUrl(string(page.url));
    return url ? [[urlKey(url), {
      pageType: string(page.pageType),
      selectionReason: string(page.selectionReason),
      locale: string(page.locale),
    }] as const] : [];
  }));
  const checkedByUrl = new Map(records(root.checkedPages).flatMap((page) => {
    const url = cleanUrl(string(page.finalUrl) || string(page.url));
    return url ? [[urlKey(url), page] as const] : [];
  }));
  const pages = records(candidate.pages).flatMap((item) => {
    const url = cleanUrl(string(item.url));
    if (!url) return [];
    const selected = selectedByUrl.get(urlKey(url));
    const missingPrimaryLocaleType = selected?.selectionReason === "primary_locale_type_missing";
    return [{
      url,
      typeLabel: missingPrimaryLocaleType
        ? pageTypeLabel(selected.pageType, url, locale, selected.selectionReason, selected.locale)
        : string(item.typeLabel),
      selectionReason: missingPrimaryLocaleType
        ? selectionReasonLabel(selected.selectionReason, locale)
        : string(item.selectionReason),
      indexability: string(item.indexability),
      issues: issues.filter((issue) => issue.affectedUrls.some((affectedUrl) => sameUrl(affectedUrl, url))),
      evidence: buildPageEvidence(checkedByUrl.get(urlKey(url)) ?? {}, locale),
    }];
  });
  const storedTechnicalFileSummary = record(root.technicalFileSummary);
  const storedHtmlFound = integer(summary.htmlFound);
  const storedSitemapFacts = record(storedTechnicalFileSummary.sitemap);
  const storedScope = Object.keys(storedSitemapFacts).length > 0
    ? clientScopeSummary(storedHtmlFound, storedSitemapFacts, locale)
    : {
        scopeLabel: normalizeStoredScopeLabel(string(summary.scopeLabel), locale),
        scopeValue: optionalInteger(summary.scopeValue) ?? storedHtmlFound,
      };
  const storedCoverage = {
    htmlFound: storedHtmlFound,
    eligible: integer(summary.eligible),
  };
  const resources = records(candidate.publicTechnicalResources).flatMap((item) => {
    const type = string(item.type);
    const url = cleanUrl(string(item.url));
    const statusCode = integer(item.statusCode);
    if (!url || statusCode < 200 || statusCode >= 300 || (type !== "robots" && type !== "sitemap")) return [];
    const facts = record(type === "robots" ? storedTechnicalFileSummary.robots : storedTechnicalFileSummary.sitemap);
    if (!Object.keys(facts).length) return [];
    const details = technicalFileDetails(type as "robots" | "sitemap", facts, locale, storedCoverage);
    return [{ type: type as "robots" | "sitemap", label: string(item.label), url, statusCode, details }];
  });
  const recomputedAdditionalResources = additionalResourceCounts(records(root.technicalResources));
  const additionalResources = string(candidate.additionalFilesBasis) === "classified_resources"
    ? {
        additionalFiles: integer(candidate.additionalFiles),
        additionalDocuments: integer(candidate.additionalDocuments),
      }
    : recomputedAdditionalResources;
  const coverageGroups = buildClientCoverageGroups(root.coverageGroups, locale);
  const urlDecisions = buildClientUrlDecisions(root, records(root.selectedPages), locale);
  const technicalFiles = buildClientTechnicalFiles(storedTechnicalFileSummary, locale, storedCoverage);
  const checks = records(root.checks).map(normalizeCheck).filter((check) => check.checkId);
  const performance = buildClientPerformance(root, checks, locale, record(candidate.performance));
  const consistentIssues = issues.filter((issue) => issue.checkId !== "performance" || performanceCanSupportFinding(performance));
  const consistentCounts = countIssueKinds(consistentIssues);
  const externalMetrics = buildExternalMetrics(locale);
  return deepFreeze({
    modelVersion: 2,
    conclusion: conclusionLabel(integer(summary.checked), consistentCounts.critical, locale),
    summary: {
      htmlFound: storedHtmlFound,
      ...storedScope,
      checkedLabel: locale === "ru" ? "Подробно проверено страниц" : "Pages checked in detail",
      findingsLabel: findingSummaryLabel(consistentCounts, locale),
      eligible: integer(summary.eligible),
      excluded: integer(summary.excluded),
      selected: integer(summary.selected),
      checked: integer(summary.checked),
      notCompleted: integer(summary.notCompleted),
      outsideSample: integer(summary.outsideSample),
      ...consistentCounts,
      unverifiedGroups: coverageGroups.filter((group) => group.coverageStatus === "available" && group.unchecked > 0).length,
      unavailableExternalMetrics: externalMetrics.length,
    },
    exclusions: normalizeExclusions(candidate.exclusions, integer(summary.excluded), locale),
    issues: consistentIssues,
    strengths: strings(candidate.strengths),
    pages,
    coverageGroups,
    urlDecisions,
    technicalFiles,
    performance,
    externalMetrics,
    publicTechnicalResources: resources,
    additionalFiles: additionalResources.additionalFiles,
    additionalDocuments: additionalResources.additionalDocuments,
    additionalFilesBasis: "classified_resources",
    nextStep: {
      primary: string(nextStep.primary),
      secondary: string(nextStep.secondary),
      note: string(nextStep.note),
    },
    limitations: strings(candidate.limitations),
    disclaimer: string(candidate.disclaimer),
  });
}

const CLIENT_COVERAGE_GROUPS = [
  "home",
  "commercial_service",
  "catalog_sections",
  "articles",
  "cases",
  "glossary_methodology",
  "contacts_conversion",
  "utility_legal",
  "other",
] as const satisfies readonly AuditClientCoverageGroup["group"][];

function conclusionLabel(checked: number, critical: number, locale: AuditLocale): string {
  if (checked <= 0) return locale === "ru"
    ? "Проверенных URL нет, поэтому вывод о критических проблемах не сделан."
    : "No URLs were checked, so no conclusion about critical problems was made.";
  if (critical > 0) return locale === "ru"
    ? `На проверенных URL найдено критических проблем: ${critical}.`
    : `Critical problems found on the checked URLs: ${critical}.`;
  return locale === "ru"
    ? "На проверенных URL критических проблем по доступным автоматическим проверкам не обнаружено."
    : "No critical problems were found on the checked URLs by the available automated checks.";
}

function buildPageEvidence(page: Record<string, unknown>, locale: AuditLocale): AuditClientPageEvidence {
  const unavailable = locale === "ru"
    ? "Этот факт не был сохранён в результате проверки."
    : "This fact was not saved in the audit result.";
  const checkedAt = string(page.checkedAt);
  const checkedAtValue = checkedAt && checkedAt !== "not_recorded" ? isoTimestamp(checkedAt) : null;
  const statusCode = pageStatus(page);
  const redirectCount = optionalInteger(page.redirectCount);
  const redirects = Array.isArray(page.redirects)
    ? uniquePublicUrls(page.redirects, "").filter(Boolean)
    : null;
  const title = record(page.title);
  const h1 = record(page.h1);
  const canonical = record(page.canonical);
  const hreflang = Array.isArray(page.hreflang)
    ? records(page.hreflang).flatMap((item) => {
        const language = string(item.language);
        const url = cleanUrl(string(item.url));
        return language && url ? [{ language, url }] : [];
      })
    : null;
  const schema = record(page.structuredData);
  const internalLinkCount = optionalInteger(page.internalLinkCount);
  const canonicalUrl = page.canonical && typeof page.canonical === "string"
    ? cleanUrl(page.canonical)
    : cleanUrl(string(canonical.url));
  return {
    checkedAt: checkedAtValue
      ? { status: "available", value: checkedAtValue }
      : { status: "unavailable", value: null, reason: unavailable },
    httpStatus: statusCode >= 100
      ? { status: "available", value: statusCode }
      : { status: "unavailable", value: null, reason: unavailable },
    redirects: redirectCount !== null || redirects !== null
      ? { status: "available", value: { count: redirectCount ?? redirects?.length ?? 0, chain: redirects ?? [] } }
      : { status: "unavailable", value: null, reason: unavailable },
    title: Object.keys(title).length
      ? { status: "available", value: { present: title.present === true, text: nullableString(title.value), length: integer(title.length) } }
      : { status: "unavailable", value: null, reason: unavailable },
    h1: Object.keys(h1).length
      ? { status: "available", value: { count: integer(h1.count), values: strings(h1.values) } }
      : { status: "unavailable", value: null, reason: unavailable },
    canonical: Object.keys(canonical).length || typeof page.canonical === "string"
      ? {
          status: "available",
          value: {
            url: canonicalUrl || null,
            valid: canonical.valid !== false,
            selfReferential: typeof canonical.selfReferential === "boolean" ? canonical.selfReferential : null,
          },
        }
      : { status: "unavailable", value: null, reason: unavailable },
    robots: typeof page.noindex === "boolean"
      ? {
          status: "available",
          value: {
            allowed: typeof page.robotsAllowed === "boolean" ? page.robotsAllowed : null,
            noindex: page.noindex,
            meta: nullableString(page.metaRobots),
            header: nullableString(page.xRobotsTag),
          },
        }
      : { status: "unavailable", value: null, reason: unavailable },
    hreflang: hreflang !== null
      ? { status: "available", value: hreflang }
      : { status: "unavailable", value: null, reason: unavailable },
    schema: Object.keys(schema).length
      ? {
          status: "available",
          value: {
            total: integer(schema.total),
            valid: integer(schema.valid),
            invalid: integer(schema.invalid),
            types: strings(schema.types),
          },
        }
      : { status: "unavailable", value: null, reason: unavailable },
    internalLinks: internalLinkCount !== null
      ? { status: "available", value: internalLinkCount }
      : { status: "unavailable", value: null, reason: unavailable },
    actualIndexing: {
      status: "unavailable",
      value: null,
      reason: locale === "ru"
        ? "Фактическое индексирование нельзя подтвердить без Яндекс Вебмастера или Google Search Console."
        : "Actual search indexing cannot be confirmed without Yandex Webmaster or Google Search Console.",
    },
  };
}

function buildClientCoverageGroups(value: unknown, locale: AuditLocale): AuditClientCoverageGroup[] {
  const byGroup = new Map(records(value).flatMap((item) => {
    const group = string(item.group);
    return CLIENT_COVERAGE_GROUPS.includes(group as AuditClientCoverageGroup["group"])
      ? [[group as AuditClientCoverageGroup["group"], item] as const]
      : [];
  }));
  return CLIENT_COVERAGE_GROUPS.map((group) => {
    const item = byGroup.get(group);
    return {
      group,
      label: coverageGroupLabel(group, locale),
      found: item ? integer(item.found) : 0,
      eligible: item ? integer(item.eligible) : 0,
      selected: item ? integer(item.selected) : 0,
      checked: item ? integer(item.checked) : 0,
      unchecked: item ? integer(item.unchecked) : 0,
      coverageStatus: item ? "available" as const : "unavailable" as const,
    };
  });
}

function coverageGroupLabel(group: AuditClientCoverageGroup["group"], locale: AuditLocale): string {
  const labels: Record<AuditClientCoverageGroup["group"], readonly [string, string]> = {
    home: ["Главная страница", "Homepage"],
    commercial_service: ["Коммерческие страницы и услуги", "Commercial and service pages"],
    catalog_sections: ["Разделы каталога", "Catalogue sections"],
    articles: ["Статьи", "Articles"],
    cases: ["Кейсы", "Case studies"],
    glossary_methodology: ["Словарь и методика", "Glossary and methodology"],
    contacts_conversion: ["Контакты и страницы обращения", "Contact and enquiry pages"],
    utility_legal: ["Служебные и правовые страницы", "Utility and legal pages"],
    other: ["Другие страницы", "Other pages"],
  };
  return labels[group][locale === "ru" ? 0 : 1];
}

function buildClientUrlDecisions(
  root: Record<string, unknown>,
  selectedPages: readonly Record<string, unknown>[],
  locale: AuditLocale,
): AuditClientUrlDecision[] {
  const raw = records(root.discoveredUrlDecisions);
  if (raw.length) return raw.flatMap((item) => clientUrlDecision(item, locale));

  const checkedKeys = new Set(records(root.checkedPages).flatMap((page) => {
    const url = cleanUrl(string(page.finalUrl) || string(page.url));
    return url ? [urlKey(url)] : [];
  }));
  const selected = selectedPages.flatMap((page) => {
    const url = cleanUrl(string(page.url));
    if (!url) return [];
    return clientUrlDecision({
      url,
      finalUrl: url,
      resourceType: "html",
      group: null,
      outcome: "selected",
      reason: checkedKeys.has(urlKey(url)) ? "selected_and_checked" : "selected_not_completed",
      source: "unknown",
      selectedUrl: url,
      selectionReason: string(page.selectionReason),
    }, locale);
  });
  const unchecked = strings(root.pagesNotCheckedUrls).flatMap((url) => clientUrlDecision({
    url,
    finalUrl: url,
    resourceType: "html",
    group: null,
    outcome: "unchecked",
    reason: "not_selected_within_limit",
    source: "unknown",
  }, locale));
  const excluded = records(root.excludedPages).flatMap((page) => clientUrlDecision({
    url: page.url,
    finalUrl: page.url,
    resourceType: "html",
    group: null,
    outcome: "excluded",
    reason: page.reason,
    source: "unknown",
    primaryUrl: page.primaryUrl,
  }, locale));
  return [...selected, ...unchecked, ...excluded];
}

function clientUrlDecision(item: Record<string, unknown>, locale: AuditLocale): AuditClientUrlDecision[] {
  const url = cleanUrl(string(item.url));
  const finalUrl = cleanUrl(string(item.finalUrl) || url);
  const outcome = string(item.outcome);
  if (!url || !finalUrl || !["selected", "unchecked", "excluded"].includes(outcome)) return [];
  const rawGroup = string(item.group);
  const group = CLIENT_COVERAGE_GROUPS.includes(rawGroup as AuditClientCoverageGroup["group"])
    ? rawGroup as AuditClientCoverageGroup["group"]
    : null;
  const rawSource = string(item.source);
  const source = (["root", "link", "sitemap", "priority", "technical", "unknown"].includes(rawSource)
    ? rawSource
    : "unknown") as AuditClientUrlDecision["source"];
  const rawReason = string(item.reason);
  const selectionReason = string(item.selectionReason);
  return [{
    url,
    finalUrl,
    resourceType: string(item.resourceType) || "html",
    group,
    groupLabel: group ? coverageGroupLabel(group, locale) : (locale === "ru" ? "Группа не сохранена" : "Group not saved"),
    outcome: outcome as AuditClientUrlDecision["outcome"],
    outcomeLabel: decisionOutcomeLabel(outcome as AuditClientUrlDecision["outcome"], locale),
    reason: decisionReasonLabel(rawReason, locale),
    source,
    sourceLabel: discoverySourceLabel(source, locale),
    ...(cleanUrl(string(item.selectedUrl)) ? { selectedUrl: cleanUrl(string(item.selectedUrl)) } : {}),
    ...(selectionReason ? { selectionReason: selectionReasonLabel(selectionReason, locale) } : {}),
    ...(cleanUrl(string(item.primaryUrl)) ? { primaryUrl: cleanUrl(string(item.primaryUrl)) } : {}),
  }];
}

function decisionOutcomeLabel(outcome: AuditClientUrlDecision["outcome"], locale: AuditLocale): string {
  if (locale === "en") return outcome === "selected" ? "Selected" : outcome === "unchecked" ? "Not selected" : "Excluded";
  return outcome === "selected" ? "Выбран" : outcome === "unchecked" ? "Не выбран" : "Исключён";
}

function decisionReasonLabel(reason: string, locale: AuditLocale): string {
  const labels: Record<string, readonly [string, string]> = {
    selected_and_checked: ["Адрес выбран и подробно проверен.", "The URL was selected and checked in detail."],
    selected_not_completed: ["Адрес выбран, но подробную проверку завершить не удалось.", "The URL was selected, but the detailed check could not be completed."],
    not_selected_within_limit: ["Адрес не выбран из-за лимита бесплатной проверки.", "The URL was not selected because of the free-check limit."],
    search_page: ["Страница внутреннего поиска исключена из выборки.", "The internal search page was excluded from the sample."],
    closed_section: ["Закрытый раздел исключён из публичной проверки.", "The restricted area was excluded from the public check."],
    technical_page: ["Служебная или правовая страница исключена из выборки.", "The utility or legal page was excluded from the sample."],
    parameterized_url: ["Адрес с параметрами исключён, чтобы не проверять вариант той же страницы повторно.", "The parameterized URL was excluded to avoid checking another variant of the same page."],
    redirect: ["Адрес перенаправляет на другую страницу и не проверяется отдельно.", "The URL redirects to another page and is not checked separately."],
    confirmed_duplicate: ["Подтверждённый дубликат не проверяется повторно.", "The confirmed duplicate is not checked again."],
    service_url: ["Служебный адрес исключён из выборки.", "The utility URL was excluded from the sample."],
    technical_object: ["Технический файл не входит в выборку HTML-страниц.", "The technical file is outside the HTML-page sample."],
    duplicate_template: ["Повторяющийся вариант страницы не выбран в ограниченную выборку.", "The repeated page variant was not selected for the limited sample."],
    other: ["В результате сохранена другая причина исключения.", "Another exclusion reason was saved in the result."],
  };
  const label = labels[reason];
  if (label) return label[locale === "ru" ? 0 : 1];
  return reason || (locale === "ru" ? "Причина не была сохранена." : "The reason was not saved.");
}

function discoverySourceLabel(source: AuditClientUrlDecision["source"], locale: AuditLocale): string {
  const labels: Record<AuditClientUrlDecision["source"], readonly [string, string]> = {
    root: ["Стартовый адрес", "Starting URL"],
    link: ["Ссылка на сайте", "On-site link"],
    sitemap: ["sitemap.xml", "sitemap.xml"],
    priority: ["Адрес, переданный для проверки", "URL submitted for checking"],
    technical: ["Технический файл", "Technical file"],
    unknown: ["Источник не был сохранён", "Source was not saved"],
  };
  return labels[source][locale === "ru" ? 0 : 1];
}

function buildClientTechnicalFiles(
  summary: Record<string, unknown>,
  locale: AuditLocale,
  coverage: { readonly htmlFound: number; readonly eligible: number },
): AuditClientTechnicalFile[] {
  return (["robots", "sitemap"] as const).map((type) => {
    const facts = record(summary[type]);
    const url = cleanUrl(string(facts.url));
    const statusCode = optionalInteger(facts.statusCode);
    const completed = type === "robots" ? facts.read === true : facts.parsed === true;
    const status = completed ? "available" as const : "unavailable" as const;
    const reason = status === "unavailable"
      ? string(facts.reason) || (locale === "ru"
          ? `${type === "robots" ? "robots.txt" : "sitemap.xml"} не удалось подтвердить по сохранённым данным.`
          : `${type === "robots" ? "robots.txt" : "sitemap.xml"} could not be confirmed from the saved data.`)
      : null;
    return {
      type,
      label: type === "robots" ? "robots.txt" : "sitemap.xml",
      status,
      url: url || "",
      finalUrl: cleanUrl(string(facts.finalUrl)) || null,
      statusCode,
      loadedAt: isoTimestamp(string(facts.loadedAt)),
      reason,
      facts: Object.keys(facts).length ? technicalFileDetails(type, facts, locale, coverage) : [],
    };
  });
}

function buildClientPerformance(
  root: Record<string, unknown>,
  checks: readonly NormalizedCheck[],
  locale: AuditLocale,
  storedPerformance: Record<string, unknown> = {},
): AuditClientPerformance {
  const rootObservation = record(root.performanceObservation);
  const source = Object.keys(rootObservation).length ? rootObservation : storedPerformance;
  const observation = normalizeLighthouseObservation(source);
  const performanceCheck = checks.find((check) => check.checkId === "performance");
  const score = finite(observation.performance);
  const status = observation.status ?? "legacy_unknown";
  const normalizedScore = score === null ? legacyScore(performanceCheck, storedPerformance) : Math.round(score <= 1 ? score * 100 : score);
  const profile = string(observation.profile) || string(observation.strategy) || null;
  return {
    status,
    label: performanceLabel(status, locale),
    targetUrl: cleanUrl(string(observation.finalUrl) || (normalizedScore !== null ? performanceCheck?.targetUrl : "") || string(root.target)) || null,
    capturedAt: isoTimestamp(string(observation.capturedAt)),
    profile,
    runCount: Math.max(0, integer(observation.runCount)),
    score: lighthouseStatusHasMeasurement(status) ? normalizedScore : null,
    fcpMs: finite(observation.fcpMs),
    lcpMs: finite(observation.lcpMs),
    cls: finite(observation.cls),
    tbtMs: finite(observation.tbtMs),
    speedIndexMs: finite(observation.speedIndexMs),
    lighthouseVersion: string(observation.lighthouseVersion) || null,
    startedAt: isoTimestamp(string(observation.startedAt)),
    completedAt: isoTimestamp(string(observation.completedAt)),
    durationMs: finite(observation.durationMs),
    source: string(observation.source) || null,
    errorCode: string(observation.errorCode) || null,
    reason: performanceReason(status, normalizedScore, profile, locale),
  };
}

function lighthouseStatusHasMeasurement(status: LighthouseRunStatus): boolean {
  return status === "completed" || status === "legacy_summary_only" || status === "not_persisted";
}

function performanceCanSupportFinding(performance: AuditClientPerformance): boolean {
  return lighthouseStatusHasMeasurement(performance.status) && performance.score !== null;
}

function performanceAsObservation(performance: AuditClientPerformance): Record<string, unknown> {
  return {
    status: performance.status,
    performance: performance.score,
    profile: performance.profile,
    capturedAt: performance.capturedAt,
    runCount: performance.runCount,
    lighthouseVersion: performance.lighthouseVersion,
    lcpMs: performance.lcpMs,
    cls: performance.cls,
    tbtMs: performance.tbtMs,
  };
}

function legacyScore(check: NormalizedCheck | undefined, stored: Record<string, unknown>): number | null {
  const direct = finite(stored.score);
  if (direct !== null) return Math.round(direct <= 1 ? direct * 100 : direct);
  const match = check?.reason.match(/(\d{1,3})\s*(?:из|of|\/)\s*100/iu)?.[1];
  return match ? Number(match) : null;
}

function performanceLabel(status: LighthouseRunStatus, locale: AuditLocale): string {
  if (locale === "en") {
    const labels: Record<LighthouseRunStatus, string> = {
      not_requested: "Lighthouse was not requested",
      running: "Lighthouse is running",
      completed: "Lighthouse laboratory check",
      failed: "Lighthouse check failed",
      timed_out: "Lighthouse check timed out",
      legacy_summary_only: "Saved Lighthouse summary",
      not_persisted: "Unsaved local run",
      legacy_unknown: "No saved Lighthouse data",
    };
    return labels[status];
  }
  const labels: Record<LighthouseRunStatus, string> = {
    not_requested: "Проверка Lighthouse не запрашивалась",
    running: "Проверка Lighthouse выполняется",
    completed: "Лабораторная проверка Lighthouse",
    failed: "Проверка Lighthouse завершилась ошибкой",
    timed_out: "Проверка Lighthouse не уложилась во время",
    legacy_summary_only: "Сохранённый итог Lighthouse",
    not_persisted: "Локальный несохранённый запуск",
    legacy_unknown: "Нет сохранённых данных Lighthouse",
  };
  return labels[status];
}

function performanceReason(status: LighthouseRunStatus, score: number | null, profile: string | null, locale: AuditLocale): string {
  if (locale === "en") {
    if (status === "completed") return `The Lighthouse laboratory check completed using the ${profile ?? "saved"} profile.${score === null ? "" : ` Final score: ${score} out of 100.`} This is a preliminary result and does not replace real-user data.`;
    if (status === "legacy_summary_only") return `A previous Lighthouse result was saved${score === null ? "" : `: ${score} out of 100`}. Detailed metrics, timing and run conditions are unavailable in this snapshot. Run the check again for a complete result.`;
    if (status === "not_persisted") return "Lighthouse completed in this local session, but the result is not stored without persistent storage. Details will be unavailable after refresh or in another browser.";
    if (status === "failed") return "The speed check could not be completed. This does not mean the page is slow. Run it again and use the diagnostic code from the server log if the error repeats.";
    if (status === "timed_out") return "The speed check did not finish in time. No result was produced and it does not affect the audit outcome.";
    if (status === "running") return "The Lighthouse check is still running; no score is available yet.";
    if (status === "not_requested") return "Lighthouse was not requested for this audit, so no laboratory score is available.";
    return "This saved result contains no Lighthouse data. It is unknown whether the check was run. Run the audit again for a current measurement.";
  }
  if (status === "completed") return `Лабораторная проверка Lighthouse выполнена в ${profile === "desktop" ? "профиле компьютера" : "мобильном профиле"}.${score === null ? "" : ` Итоговый балл: ${score} из 100.`} Это предварительный результат: он зависит от условий запуска и не заменяет данные реальных пользователей.`;
  if (status === "legacy_summary_only") return `Сохранён итог ранее выполненного запуска Lighthouse${score === null ? "" : `: ${score} из 100`}. В этом снимке не сохранены подробные метрики, время и условия запуска. Чтобы получить полный результат, повторите проверку.`;
  if (status === "not_persisted") return "Lighthouse успешно выполнился в текущем локальном сеансе, но результат не сохраняется без подключённого хранилища. После обновления страницы или открытия ссылки подробные данные будут недоступны.";
  if (status === "failed") return "Проверку скорости не удалось завершить. Это не означает, что страница медленная. Повторите запуск; если ошибка повторится, используйте код диагностики из технического журнала.";
  if (status === "timed_out") return "Проверка скорости не завершилась за отведённое время. Результат не получен и не должен влиять на итог аудита.";
  if (status === "running") return "Проверка Lighthouse ещё выполняется. Итоговый балл пока недоступен.";
  if (status === "not_requested") return "Проверка Lighthouse для этого аудита не запрашивалась, поэтому лабораторного балла нет.";
  return "В этом сохранённом результате нет данных о проверке Lighthouse. Неизвестно, запускалась ли она. Повторите проверку, чтобы получить актуальное измерение.";
}

function buildExternalMetrics(locale: AuditLocale): AuditClientExternalMetric[] {
  const values: readonly [AuditClientExternalMetric["id"], string, string][] = locale === "ru" ? [
    ["actual_indexing", "Фактическое индексирование", "Нужен доступ к Яндекс Вебмастеру или Google Search Console."],
    ["rankings", "Позиции по запросам", "Нужны данные поискового кабинета и согласованный список запросов."],
    ["impressions", "Показы в поиске", "Нужны данные Яндекс Вебмастера или Google Search Console."],
    ["ctr", "Доля переходов из поиска (CTR)", "Нужны данные поискового кабинета."],
    ["traffic", "Посещаемость", "Нужен доступ к системе аналитики."],
    ["leads", "Заявки", "Нужен доступ к аналитике и данным формы или CRM."],
    ["conversions", "Конверсии", "Нужны цели аналитики и данные о целевых действиях."],
  ] : [
    ["actual_indexing", "Actual search indexing", "Yandex Webmaster or Google Search Console access is required."],
    ["rankings", "Search rankings", "Search-console data and an agreed query list are required."],
    ["impressions", "Search impressions", "Yandex Webmaster or Google Search Console data is required."],
    ["ctr", "Search click-through rate (CTR)", "Search-console data is required."],
    ["traffic", "Traffic", "Analytics access is required."],
    ["leads", "Leads", "Analytics and form or CRM data are required."],
    ["conversions", "Conversions", "Analytics goals and conversion-event data are required."],
  ];
  return values.map(([id, label, reason]) => ({ id, label, status: "unavailable", reason }));
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isoTimestamp(value: string): string | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function normalizeStoredScopeLabel(label: string, locale: AuditLocale): string {
  if (locale === "ru" && label === "Обработано для анализа") return "Предварительно просмотрено адресов";
  if (locale === "en" && label === "Processed for analysis") return "Addresses previewed";
  return label || (locale === "ru" ? "Найдено HTML-страниц" : "HTML pages found");
}

function additionalResourceCounts(resources: readonly Record<string, unknown>[]): {
  readonly additionalFiles: number;
  readonly additionalDocuments: number;
} {
  const clientVisibleTypes = new Set(["document", "image", "script"]);
  return {
    additionalFiles: resources.filter((resource) => clientVisibleTypes.has(string(resource.resourceType))).length,
    additionalDocuments: resources.filter((resource) => string(resource.resourceType) === "document").length,
  };
}

function technicalFileDetails(
  type: "robots" | "sitemap",
  facts: Record<string, unknown>,
  locale: AuditLocale,
  coverage?: { readonly htmlFound: number; readonly eligible: number },
): string[] {
  const ru = locale === "ru";
  if (type === "robots") {
    const details: string[] = [];
    if (facts.read === true) details.push(ru ? "Файл прочитан." : "The file was read.");
    if (facts.selectedPagesNotBlocked === true) details.push(ru
      ? "Важные выбранные страницы не заблокированы правилами файла."
      : "The important selected pages are not blocked by its rules.");
    if (facts.selectedPagesNotBlocked === false) details.push(ru
      ? "Правила файла блокируют хотя бы одну выбранную страницу."
      : "Its rules block at least one selected page.");
    return details;
  }

  const details: string[] = [];
  if (facts.parsed === true) details.push(ru ? "XML разобран." : "The XML was parsed.");
  const discoveredUrls = integer(facts.discoveredUrls);
  if (discoveredUrls > 0) {
    const htmlFound = coverage ? integer(coverage.htmlFound) : 0;
    const eligible = coverage ? Math.min(htmlFound, integer(coverage.eligible)) : 0;
    const loadedUrls = optionalInteger(facts.loadedUrls) ?? htmlFound;
    const remainingUrls = Math.max(0, discoveredUrls - loadedUrls);
    details.push(ru
      ? remainingUrls > 0
        ? `В sitemap найдено ${discoveredUrls} адресов. Предварительно просмотрено ${loadedUrls} адресов; остальные ${remainingUrls} адресов не загружались в рамках бесплатной проверки.`
        : htmlFound > 0
          ? `Все ${discoveredUrls} адресов из sitemap обработаны. Доступных HTML-страниц: ${htmlFound}; подходят для дальнейшего анализа: ${eligible}.`
        : `В sitemap найдено ${discoveredUrls} адресов.`
      : remainingUrls > 0
        ? `The sitemap contains ${discoveredUrls} URLs. ${loadedUrls} addresses were previewed; the remaining ${remainingUrls} were not loaded by the free check.`
        : htmlFound > 0
          ? `All ${discoveredUrls} sitemap URLs were processed. Accessible HTML pages: ${htmlFound}; eligible for further analysis: ${eligible}.`
        : `The sitemap contains ${discoveredUrls} URLs.`);
    const errors = integer(facts.errorUrls);
    const skipped = integer(facts.skippedByTechnicalLimit);
    if (remainingUrls > 0 && (errors > 0 || skipped > 0)) {
      details.push(ru
        ? `Из не загруженных адресов: с ошибкой — ${errors}; пропущено из-за технического лимита — ${skipped}.`
        : `Among URLs that were not loaded: errors — ${errors}; skipped because of the technical limit — ${skipped}.`);
    }
  }
  if (facts.siteUrlsOnly === true) details.push(ru
    ? "Все обнаруженные адреса принадлежат проверяемому сайту."
    : "All discovered URLs belong to the checked website.");
  if (facts.siteUrlsOnly === false) details.push(ru
    ? "Среди обнаруженных адресов есть ссылки на другой сайт."
    : "Some discovered URLs point to another website.");
  return details;
}

function clientScopeSummary(
  htmlFound: number,
  sitemapFacts: Record<string, unknown>,
  locale: AuditLocale,
): { scopeLabel: string; scopeValue: number } {
  const discoveredUrls = integer(sitemapFacts.discoveredUrls);
  const loadedUrls = optionalInteger(sitemapFacts.loadedUrls) ?? htmlFound;
  const partialSitemapProcessing = discoveredUrls > loadedUrls;
  return partialSitemapProcessing
    ? {
        scopeLabel: locale === "ru" ? "Предварительно просмотрено адресов" : "Addresses previewed",
        scopeValue: loadedUrls,
      }
    : {
        scopeLabel: locale === "ru" ? "Найдено HTML-страниц" : "HTML pages found",
        scopeValue: htmlFound,
      };
}

function findingSummaryLabel(
  counts: { readonly critical: number; readonly review: number; readonly optional: number },
  locale: AuditLocale,
): string {
  if (locale === "en") {
    const parts = [
      ...(counts.critical > 0 ? [`${counts.critical} critical ${counts.critical === 1 ? "problem" : "problems"}`] : []),
      ...(counts.review > 0 ? [`${counts.review} preliminary ${counts.review === 1 ? "signal" : "signals"}`] : []),
      ...(counts.optional > 0 ? [`${counts.optional} possible ${counts.optional === 1 ? "improvement" : "improvements"}`] : []),
    ];
    return parts.join("; ") || "No issues requiring attention";
  }
  const parts = [
    ...(counts.critical > 0 ? [`${counts.critical} ${russianCountWord(counts.critical, "критическая проблема", "критические проблемы", "критических проблем")}`] : []),
    ...(counts.review > 0 ? [`${counts.review} ${russianCountWord(counts.review, "вывод требует проверки", "вывода требуют проверки", "выводов требуют проверки")}`] : []),
    ...(counts.optional > 0 ? [`${counts.optional} ${russianCountWord(counts.optional, "возможное улучшение", "возможных улучшения", "возможных улучшений")}`] : []),
  ];
  return parts.join("; ") || "Нет пунктов, требующих внимания";
}

function russianCountWord(count: number, one: string, few: string, many: string): string {
  const mod100 = Math.abs(count) % 100;
  const mod10 = mod100 % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

function normalizeCheck(value: Record<string, unknown>): NormalizedCheck {
  return {
    checkId: string(value.checkId),
    title: string(value.title),
    status: string(value.status),
    severity: string(value.severity),
    category: string(value.category),
    targetUrl: cleanUrl(string(value.targetUrl)),
    reason: string(value.reason) || string(value.explanation),
    publicExplanation: string(value.publicExplanation) || string(value.expected),
    automationLimit: string(value.automationLimit),
  };
}

function aggregateActionableChecks(checks: readonly NormalizedCheck[]): { check: NormalizedCheck; affectedUrls: string[] }[] {
  const groups = new Map<string, { check: NormalizedCheck; affectedUrls: string[] }>();
  checks.forEach((check) => {
    if (check.status !== "warning" && check.status !== "fail") return;
    const normalizedReason = check.reason
      .toLocaleLowerCase("ru")
      .replace(/https?:\/\/\S+/giu, "{url}")
      .replace(/\d+(?:[.,]\d+)?/gu, "{n}")
      .replace(/\s+/gu, " ")
      .trim();
    const key = `${check.checkId}|${check.status}|${normalizedReason}`;
    const group = groups.get(key) ?? { check, affectedUrls: [] };
    if (check.targetUrl && !group.affectedUrls.some((url) => sameUrl(url, check.targetUrl))) group.affectedUrls.push(check.targetUrl);
    groups.set(key, group);
  });
  return [...groups.values()].sort((left, right) => issueOrder(issueKind(left.check)) - issueOrder(issueKind(right.check)));
}

function clientIssue(
  check: NormalizedCheck,
  locale: AuditLocale,
  performanceObservation: Record<string, unknown> = {},
  affectedUrls: readonly string[] = [check.targetUrl],
): AuditClientIssue {
  const kind = issueKind(check);
  if (check.checkId === "performance") {
    const ru = locale === "ru";
    const score = performanceScore(performanceObservation.performance) ?? check.reason.match(/(\d{1,3})\s*(?:из|of|\/)\s*100/iu)?.[1];
    const runCount = Math.max(1, integer(performanceObservation.runCount) || 1);
    return {
      checkId: check.checkId,
      kind,
      title: ru ? "Скорость главной страницы" : "Homepage speed",
      url: check.targetUrl,
      affectedUrls,
      whatFound: score
        ? ru ? `В одном лабораторном мобильном тесте главная страница получила ${score} из 100.` : `In one laboratory mobile test, the homepage scored ${score} out of 100.`
        : ru ? "Один лабораторный мобильный тест показал, что главная страница может загружаться медленнее ожидаемого." : "One laboratory mobile test indicated that the homepage may load more slowly than expected.",
      whyImportant: ru ? "Если основное содержимое появляется долго, часть посетителей может уйти, не дождавшись страницы." : "If the main content appears slowly, some visitors may leave before the page is ready.",
      howChecked: runCount === 1
        ? ru ? "Один запуск Google Lighthouse (лабораторного теста скорости) в мобильном профиле." : "One Google Lighthouse run using a laboratory mobile profile."
        : ru ? `${runCount} запуска Google Lighthouse в мобильном лабораторном профиле.` : `${runCount} Google Lighthouse runs using a laboratory mobile profile.`,
      reliability: runCount === 1
        ? ru ? "Это предварительный результат. Один запуск не отражает скорость у всех реальных посетителей." : "This is an early result. One run does not represent the speed experienced by every real visitor."
        : ru ? "Это лабораторные измерения. Они не отражают скорость у всех реальных посетителей." : "These are laboratory measurements and do not represent the speed experienced by every real visitor.",
      nextStep: ru ? "Повторите тест 2–3 раза в одинаковых условиях. Если результат повторится, проверьте тяжёлые изображения, шрифты и скрипты первого экрана." : "Repeat the test 2–3 times under the same conditions. If the result repeats, inspect heavy images, fonts and above-the-fold scripts.",
      details: performanceDetails(performanceObservation, locale),
    };
  }
  if (check.checkId === "breadcrumbs") {
    const ru = locale === "ru";
    const path = readablePath(check.targetUrl);
    return {
      checkId: check.checkId,
      kind: "optional",
      title: ru ? "Подсказка о месте страницы в структуре сайта" : "A clue to the page's place in the site structure",
      url: check.targetUrl,
      affectedUrls,
      whatFound: ru ? `На странице ${path} не найдена специальная разметка цепочки разделов (BreadcrumbList).` : `No structured section trail (BreadcrumbList) was found on ${path}.`,
      whyImportant: ru ? "Такая подсказка помогает поисковой системе понять место страницы в структуре сайта. Для посетителя её отсутствие не является поломкой." : "This clue can help a search engine understand the page's place in the site structure. Its absence is not a broken feature for visitors.",
      howChecked: ru ? `В сохранённом коде страницы ${path} проверили список специальных меток и не нашли BreadcrumbList.` : `The structured-data markers in the saved code for ${path} were checked and no BreadcrumbList was found.`,
      reliability: ru ? "Сам факт определён надёжно, но улучшение необязательное и имеет смысл только при реальной иерархии разделов." : "The observation itself is reliable, but this improvement is optional and only makes sense when the page has a real hierarchy.",
      nextStep: ru ? "Если страница входит в цепочку разделов, добавьте BreadcrumbList. Если у неё нет реальной иерархии, ничего делать не нужно." : "If the page belongs to a real section trail, add BreadcrumbList. If it has no real hierarchy, no action is needed.",
    };
  }
  if (locale === "en") return englishIssue(check, kind, affectedUrls);
  return {
    checkId: check.checkId,
    kind,
    title: plainCheckTitle(check),
    url: check.targetUrl,
    affectedUrls,
    whatFound: plainObservation(check.reason),
    whyImportant: categoryImpact(check.category),
    howChecked: check.publicExplanation || "Проверили сохранённые данные загруженной страницы.",
    reliability: check.status === "fail"
      ? "Вывод основан на факте, сохранённом во время загрузки страницы. После изменений проверку стоит повторить."
      : "Это автоматический предварительный вывод. Перед изменениями его стоит подтвердить повторной проверкой.",
    nextStep: genericNextStep(check),
  };
}

function performanceDetails(
  observation: Record<string, unknown>,
  locale: AuditLocale,
): { label: string; value: string }[] {
  const ru = locale === "ru";
  const details: { label: string; value: string }[] = [];
  if (observation.profile === "mobile" || observation.profile === "desktop") details.push({
    label: ru ? "Профиль" : "Profile",
    value: observation.profile === "mobile" ? (ru ? "Мобильный" : "Mobile") : (ru ? "Компьютер" : "Desktop"),
  });
  if (typeof observation.capturedAt === "string" && !Number.isNaN(Date.parse(observation.capturedAt))) details.push({
    label: ru ? "Дата и время" : "Date and time",
    value: new Intl.DateTimeFormat(ru ? "ru-RU" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Moscow" }).format(new Date(observation.capturedAt)),
  });
  if (typeof observation.lighthouseVersion === "string" && observation.lighthouseVersion.trim()) details.push({ label: "Lighthouse", value: observation.lighthouseVersion.trim() });
  const lcp = finite(observation.lcpMs);
  const cls = finite(observation.cls);
  const tbt = finite(observation.tbtMs);
  const runs = integer(observation.runCount);
  if (lcp !== null) details.push({ label: ru ? "LCP — появление главного блока" : "LCP", value: `${(lcp / 1000).toFixed(2)} ${ru ? "с" : "s"}` });
  if (cls !== null) details.push({ label: ru ? "CLS — сдвиги элементов" : "CLS", value: String(Math.round(cls * 1_000) / 1_000) });
  if (tbt !== null) details.push({ label: ru ? "TBT — блокировка страницы" : "TBT", value: `${Math.round(tbt)} ${ru ? "мс" : "ms"}` });
  if (runs > 0) details.push({ label: ru ? "Количество запусков" : "Number of runs", value: String(runs) });
  return details;
}

function performanceScore(value: unknown): string | null {
  const raw = finite(value);
  if (raw === null) return null;
  return String(Math.round(raw <= 1 ? raw * 100 : raw));
}

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function englishIssue(check: NormalizedCheck, kind: AuditClientIssueKind, affectedUrls: readonly string[]): AuditClientIssue {
  return {
    checkId: check.checkId,
    kind,
    title: check.title || "Item to review",
    url: check.targetUrl,
    affectedUrls,
    whatFound: check.reason || "The automated check found a difference from the expected state.",
    whyImportant: "This can affect how visitors or search engines understand the page.",
    howChecked: check.publicExplanation || "Saved data from the loaded page was checked.",
    reliability: "This is an automated preliminary conclusion and should be confirmed before making changes.",
    nextStep: "Confirm the finding on the page, make the smallest necessary change, and run the same check again.",
  };
}

function issueKind(check: NormalizedCheck): AuditClientIssueKind {
  // A laboratory speed run is an early signal, not proof of a production
  // outage. Its raw engine threshold must never become a client "critical"
  // label without corroborating real-user or repeated measurements.
  if (check.checkId === "performance") return "review";
  if (check.status === "fail" && (check.severity === "critical" || check.severity === "high")) return "critical";
  if (check.checkId === "breadcrumbs" || check.severity === "low" || check.severity === "info") return "optional";
  return "review";
}

function issueOrder(value: AuditClientIssueKind): number {
  return value === "critical" ? 0 : value === "review" ? 1 : 2;
}

function countIssueKinds(issues: readonly AuditClientIssue[]) {
  return {
    critical: issues.filter((issue) => issue.kind === "critical").length,
    review: issues.filter((issue) => issue.kind === "review").length,
    optional: issues.filter((issue) => issue.kind === "optional").length,
  };
}

function buildStrengths(
  checks: readonly NormalizedCheck[],
  pages: readonly Record<string, unknown>[],
  resources: readonly { type: "robots" | "sitemap" }[],
  locale: AuditLocale,
): string[] {
  const checked = pages.length;
  const strengths: string[] = [];
  if (checked && pages.every((page) => pageStatus(page) >= 200 && pageStatus(page) < 300)) {
    strengths.push(locale === "ru" ? `Во время этой проверки ${checked} URL вернули успешный HTTP-ответ.` : `During this check, ${checked} URLs returned a successful HTTP response.`);
  }
  const allPass = (checkId: string) => new Set(checks
    .filter((check) => check.checkId === checkId && check.status === "pass" && check.targetUrl)
    .map((check) => urlKey(check.targetUrl))).size >= checked;
  if (checked && allPass("title") && allPass("h1")) strengths.push(locale === "ru" ? `Заголовок для поисковой выдачи (Title) и главный заголовок страницы (H1) найдены на всех ${checked} проверенных страницах.` : `A search-result title (Title) and main heading (H1) were found on all ${checked} checked pages.`);
  if (checked && pages.every((page) => page.noindex !== true)) strengths.push(locale === "ru" ? "На проверенных страницах не обнаружен явный запрет на индексирование." : "No explicit indexing block was found on the checked pages.");
  if (resources.some((resource) => resource.type === "robots") && resources.some((resource) => resource.type === "sitemap")) {
    strengths.push(locale === "ru" ? "Файл правил для поисковых роботов (robots.txt) и список страниц сайта (sitemap.xml) доступны и прочитаны." : "robots.txt and sitemap.xml were available and read.");
  }
  return strengths;
}

function buildLimitations(checked: number, locale: AuditLocale): string[] {
  if (locale === "en") return [
    "Search inclusion, positions, impressions and CTR require access to search consoles.",
    "Traffic and enquiries require access to analytics.",
    `The conclusions apply only to the ${checked} selected pages that were checked.`,
    "Closed areas and server-side data were not checked.",
  ];
  return [
    "Индексирование, позиции, показы и долю переходов из поисковой выдачи (CTR) можно определить только с доступом к поисковым кабинетам.",
    "Трафик и заявки можно определить только с доступом к системе аналитики.",
    `Выводы относятся только к ${checked} выбранным и проверенным страницам.`,
    "Закрытые разделы и данные сервера не проверялись.",
  ];
}

function uniquePublicUrls(value: unknown, fallback: string): string[] {
  const source = Array.isArray(value) ? value : [];
  const urls = source.flatMap((item) => {
    const url = cleanUrl(string(item));
    return url ? [url] : [];
  });
  if (fallback && !urls.some((url) => sameUrl(url, fallback))) urls.unshift(fallback);
  return [...new Map(urls.map((url) => [urlKey(url), url])).values()];
}

function pageTypeLabel(
  type: string,
  url: string,
  locale: AuditLocale,
  selectionReason = "",
  pageLocale = "",
): string {
  const path = urlPath(url);
  if (locale === "ru") {
    if (selectionReason === "alternate_locale_control" || type === "alternate_locale") return "Контроль другой языковой версии";
    if (selectionReason === "primary_locale_type_missing") {
      if (pageLocale === "en" && ["commercial", "service"].includes(type)) return "Англоязычная страница услуги";
      if (["commercial", "service"].includes(type)) return "Страница услуги на другом языке";
      return "Страница на другом языке";
    }
    if (path === "/about" || type === "about") return "Страница о компании";
    if (path === "/blog") return "Раздел блога";
    if (/^\/blog\/[^/]+/u.test(path)) return "Статья";
    if (path === "/glossary") return "Словарь терминов";
    if (/^\/glossary\/[^/]+/u.test(path)) return "Термин словаря";
    if (/^\/(?:pricing|prices)(?:\/|$)/u.test(path)) return "Страница с ценами";
    if (/^\/contacts?(?:\/|$)/u.test(path)) return "Контакты";
    if (path === "/brief" || type === "conversion_support") return "Страница для связи";
    const labels: Record<string, string> = {
      homepage: "Главная страница",
      service: "Страница услуги",
      commercial: "Страница услуги",
      category: "Страница раздела",
      hub: "Раздел сайта",
      product: "Карточка товара",
      detail: "Детальная страница",
      article: "Статья",
      case: "Кейс",
      pricing: "Страница с ценами",
      contact: "Контакты",
      legal: "Правовая информация",
      utility: "Служебная страница",
      unique: "Страница с отдельным шаблоном",
      alternate_locale: "Контроль другой языковой версии",
      unknown: "Страница сайта",
    };
    return labels[type] ?? "Страница сайта";
  }
  if (selectionReason === "alternate_locale_control" || type === "alternate_locale") return "Alternate-language control page";
  if (selectionReason === "primary_locale_type_missing") {
    if (pageLocale === "en" && ["commercial", "service"].includes(type)) return "English-language service page";
    if (["commercial", "service"].includes(type)) return "Service page in another language";
    return "Page in another language";
  }
  if (path === "/about" || type === "about") return "About page";
  if (path === "/blog") return "Blog section";
  if (/^\/blog\/[^/]+/u.test(path)) return "Article";
  if (path === "/glossary") return "Glossary";
  if (/^\/glossary\/[^/]+/u.test(path)) return "Glossary term";
  if (/^\/(?:pricing|prices)(?:\/|$)/u.test(path)) return "Pricing page";
  if (/^\/contacts?(?:\/|$)/u.test(path)) return "Contacts";
  if (path === "/brief" || type === "conversion_support") return "Contact brief";
  const labels: Record<string, string> = {
    homepage: "Homepage",
    service: "Service page",
    commercial: "Service page",
    category: "Section page",
    hub: "Site section",
    product: "Product page",
    detail: "Detail page",
    article: "Article",
    case: "Case study",
    pricing: "Pricing page",
    contact: "Contacts",
    legal: "Legal information",
    utility: "Utility page",
    unique: "Page with a distinct template",
    unknown: "Website page",
  };
  return labels[type] ?? "Website page";
}

function selectionReasonLabel(reason: string, locale: AuditLocale): string {
  const ru: Record<string, string> = {
    homepage: "Главная страница задаёт исходную точку проверки.",
    user_target: "Это адрес, который был указан для проверки.",
    priority_url: "Страница отмечена как важная для проверки.",
    primary_commercial: "Проверяем основную коммерческую страницу.",
    commercial_different_template: "У этой страницы другой коммерческий шаблон.",
    conversion_support: "Страница помогает посетителю принять решение или связаться.",
    category_hub: "Проверяем страницу, которая объединяет другие материалы.",
    detail_page: "Проверяем детальную страницу отдельного типа.",
    case_page: "Проверяем отдельный кейс.",
    article_page: "Проверяем отдельную статью.",
    unique_template: "У страницы отдельный шаблон.",
    alternate_locale_control: "Контролируем другую языковую версию.",
    primary_locale_type_missing: "Выбрана как отдельный тип страницы; соответствующая страница основной локали не обнаружена.",
    additional_important: "Страница дополняет выборку другим содержанием.",
  };
  if (locale === "ru") return ru[reason] ?? ru.additional_important!;
  const en: Record<string, string> = {
    homepage: "The homepage is the starting point for the check.",
    user_target: "This is the address submitted for the check.",
    priority_url: "This page was marked as important.",
    primary_commercial: "This is a primary commercial page.",
    commercial_different_template: "This page uses a different commercial template.",
    conversion_support: "This page helps a visitor decide or make contact.",
    category_hub: "This page groups other content.",
    detail_page: "This is a representative detail page.",
    case_page: "This is a representative case study.",
    article_page: "This is a representative article.",
    unique_template: "This page uses a distinct template.",
    alternate_locale_control: "This checks another language version.",
    primary_locale_type_missing: "Selected as a distinct page type because no corresponding page was found in the primary language.",
    additional_important: "This page adds a different kind of content to the sample.",
  };
  return en[reason] ?? en.additional_important!;
}

function normalizeExclusions(
  value: unknown,
  total: number,
  locale: AuditLocale,
): AuditClientPresentation["exclusions"] {
  const allowed = new Set(["search_page", "closed_section", "technical_page", "parameterized_url", "redirect", "confirmed_duplicate", "service_url", "technical_object", "duplicate_template", "other"]);
  const labels: Record<string, { ru: string; en: string }> = {
    search_page: { ru: "Страница поиска", en: "Search page" },
    technical_page: { ru: "Юридические и служебные страницы", en: "Legal and utility pages" },
    parameterized_url: { ru: "URL с параметрами", en: "URL with parameters" },
    redirect: { ru: "Перенаправление", en: "Redirect" },
    confirmed_duplicate: { ru: "Подтверждённый дубликат", en: "Confirmed duplicate" },
    // Immutable legacy snapshots used this broad internal enum for pages that
    // the current model describes to clients as technical pages.
    service_url: { ru: "Техническая страница", en: "Technical page" },
    technical_object: { ru: "Технический объект", en: "Technical object" },
    closed_section: { ru: "Закрытый раздел", en: "Closed area" },
    duplicate_template: { ru: "Дубликат шаблона", en: "Duplicate template" },
    other: { ru: "Другая сохранённая причина", en: "Other recorded reason" },
  };
  let remaining = total;
  const normalized = records(value).flatMap((item) => {
    const reason = string(item.reason);
    const count = Math.min(integer(item.count), remaining);
    if (!allowed.has(reason) || count <= 0) return [];
    remaining -= count;
    return [{
      reason: reason as AuditClientPresentation["exclusions"][number]["reason"],
      label: labels[reason]![locale],
      count,
    }];
  });
  if (remaining > 0) normalized.push({
    reason: "other",
    label: labels.other![locale],
    count: remaining,
  });
  return normalized;
}

function plainCheckTitle(check: NormalizedCheck): string {
  const titles: Record<string, string> = {
    h1: "Главный заголовок страницы",
    title: "Название страницы для поисковой выдачи",
    canonical: "Основной адрес страницы",
    indexability: "Доступность страницы для поиска",
    "page-http": "Открытие страницы",
  };
  return titles[check.checkId] ?? (check.title || "Пункт, который нужно проверить");
}

function plainObservation(value: string): string {
  return value
    .replace(/HTTP\s*2xx/giu, "успешный ответ сервера")
    .replace(/HTTP/giu, "код ответа сервера")
    .trim() || "Автоматическая проверка нашла отличие от ожидаемого состояния.";
}

function categoryImpact(category: string): string {
  if (category === "performanceMobile") return "Это может влиять на скорость загрузки и удобство посетителей.";
  if (category === "technicalIndexing") return "Это может помешать поисковой системе открыть или правильно обработать страницу.";
  if (category === "structureOnPage") return "Из-за этого посетителю и поисковой системе может быть сложнее понять основную тему страницы.";
  if (category === "trustStructuredData") return "Из-за этого поисковая система получает меньше понятных подсказок о содержимом страницы.";
  return "Это может влиять на понятность и качество страницы для посетителей.";
}

function genericNextStep(check: NormalizedCheck): string {
  if (check.checkId === "h1") return "Добавьте один видимый главный заголовок, который прямо называет тему страницы, затем повторите проверку.";
  if (check.checkId === "title") return "Задайте короткое и понятное название страницы для поисковой выдачи, затем повторите проверку.";
  if (check.checkId === "canonical") return "Проверьте основной адрес страницы, исправьте его при необходимости и повторите проверку.";
  return "Сверьте найденный факт со страницей, внесите только необходимое изменение и повторите эту же проверку.";
}

function readablePath(url: string): string {
  const path = urlPath(url);
  return path || "/";
}

function urlPath(value: string): string {
  try {
    return new URL(value).pathname.replace(/\/+$/u, "") || "/";
  } catch {
    return value;
  }
}

function cleanUrl(value: string): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return value;
  }
}

function sameUrl(left: string, right: string): boolean {
  return Boolean(left && right && urlKey(left) === urlKey(right));
}

function urlKey(value: string): string {
  return value.replace(/\/$/u, "");
}

function pageStatus(page: Record<string, unknown>): number {
  return integer(page.statusCode) || integer(record(page.http).status);
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(record).filter((item) => Object.keys(item).length > 0) : [];
}

function string(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.flatMap((item) => typeof item === "string" && item.trim() ? [item.trim()] : [])
    : [];
}

function integer(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

function optionalInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function firstInteger(...values: unknown[]): number {
  for (const value of values) {
    if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  }
  return 0;
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  return value;
}
