import { crawlSite, type CrawlSiteOptions } from "./crawler";
import { scoreAudit } from "./scoring";
import type {
  AuditCategory,
  AuditGrade,
  AuditIssue,
  AuditIssueSeverity,
  CategoryScore,
  FullAuditResult,
  PageAnalysis,
  PerformanceAuditInput,
  PublicAuditCategory,
  PublicAuditIndexability,
  PublicAuditIssueGroup,
  PublicAuditPageResult,
  PublicAuditResult,
  PublicAuditRisk,
  PublicAuditSummary,
} from "./types";
import { normalizeTargetUrl } from "./url";
import { AUDIT_RESULT_VERSION } from "./version";

export interface RunAuditOptions extends CrawlSiteOptions {
  /** Injectable clock keeps integration snapshots stable. */
  readonly now?: () => Date;
  /** Optional Lighthouse/PageSpeed measurements; no synthetic fallback is used. */
  readonly performance?: PerformanceAuditInput | null;
}

const SEVERITY_ORDER: Readonly<Record<AuditIssueSeverity, number>> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

const PUBLIC_AUDIT_PAGE_LIMIT = 10;
const PUBLIC_UNCHECKED_URL_LIMIT = 25;
const PUBLIC_ISSUE_GROUP_LIMIT = 20;
const PUBLIC_AFFECTED_URL_LIMIT = 10;
const PUBLIC_EVIDENCE_LIMIT = 5;

type PublicAuditLocale = "ru" | "en";

const PUBLIC_CATEGORY_NAMES: Readonly<Record<PublicAuditLocale, Readonly<Record<AuditCategory, string>>>> = {
  ru: {
    technicalIndexing: "Техническая доступность и индексация",
    structureOnPage: "Содержание и структура страницы",
    performanceMobile: "Скорость и мобильная версия",
    trustStructuredData: "Доверие и структурированные данные",
    contentImages: "Контент и изображения",
  },
  en: {
    technicalIndexing: "Technical access and indexing",
    structureOnPage: "Structure and on-page signals",
    performanceMobile: "Performance and mobile experience",
    trustStructuredData: "Trust and structured data",
    contentImages: "Content and images",
  },
};

export async function runAudit(
  input: string | URL,
  options: RunAuditOptions = {},
): Promise<FullAuditResult> {
  const target = normalizeTargetUrl(input);
  const now = options.now ?? (() => new Date());
  const startedAt = now().toISOString();
  await options.onEvent?.({ type: "audit:start" });

  const plannedPages = normalizePageLimit(options.maxPages);
  const crawl = await crawlSite(target, { ...options, maxPages: plannedPages });
  const measuredScore = scoreAudit({
    targetUrl: crawl.finalUrl,
    pages: crawl.pages,
    pagesDiscovered: crawl.pagesDiscovered,
    plannedPages,
    robots: crawl.robots,
    sitemap: crawl.sitemap,
    performance: options.performance,
  });
  const score = options.signal?.aborted && !measuredScore.partial
    ? { ...measuredScore, partial: true }
    : measuredScore;
  const issues = [...crawl.pages.flatMap((page) => page.issues), ...siteIssues(crawl)]
    .sort(compareIssues);
  const issueCounts = countIssues(issues);
  const grade = gradeForScore(score.total);
  const interpretation = interpretationForGrade(grade);
  const finishedAt = now().toISOString();
  const result: FullAuditResult = {
    resultVersion: AUDIT_RESULT_VERSION,
    targetUrl: crawl.targetUrl,
    finalUrl: crawl.finalUrl,
    pageLimit: plannedPages,
    score,
    grade,
    interpretation,
    pagesChecked: crawl.pagesChecked,
    pagesDiscovered: crawl.pagesDiscovered,
    partial: score.partial,
    coverage: score.coverage,
    issueCounts,
    pages: crawl.pages,
    discoveredUrls: crawl.discoveredUrls,
    issues,
    robots: crawl.robots,
    sitemap: crawl.sitemap,
    performance: options.performance ?? null,
    startedAt,
    finishedAt,
  };
  await options.onEvent?.({
    type: "audit:complete",
    score: score.total,
    pages: crawl.pagesChecked,
    pagesChecked: crawl.pagesChecked,
    pagesDiscovered: crawl.pagesDiscovered,
    partial: score.partial,
  });
  return result;
}

function normalizePageLimit(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return PUBLIC_AUDIT_PAGE_LIMIT;
  return Math.max(1, Math.min(PUBLIC_AUDIT_PAGE_LIMIT, Math.floor(value)));
}

/** Produces a bounded, query-free evidence DTO allowed outside the paid audit. */
export function toPublicAuditResult(result: FullAuditResult, locale: PublicAuditLocale = "ru"): PublicAuditResult {
  const plannedPages = Math.min(result.pageLimit, Math.max(result.pagesDiscovered, result.pagesChecked));
  const coverageRatio = plannedPages === 0 ? 0 : roundRatio(result.pagesChecked / plannedPages);
  const checkedPages = publicCheckedPages(result, locale);
  const indexability = publicIndexability(result.pages, locale);
  const issueCounts = {
    ...result.issueCounts,
    total: Object.values(result.issueCounts).reduce((sum, count) => sum + count, 0),
  };
  return {
    resultVersion: result.resultVersion,
    finalUrl: publicUrl(result.finalUrl),
    score: result.score.total,
    grade: result.grade,
    interpretation: interpretationForGrade(result.grade, locale),
    pagesChecked: result.pagesChecked,
    pagesDiscovered: result.pagesDiscovered,
    partial: result.partial,
    coverage: {
      pageLimit: result.pageLimit,
      plannedPages,
      checkedPages: result.pagesChecked,
      ratio: coverageRatio,
    },
    issueCounts,
    summary: publicSummary(result, indexability, issueCounts.total, locale),
    categories: Object.values(result.score.categories).map((category) => publicCategory(category, locale)),
    issueGroups: publicIssueGroups(result.issues, locale),
    checkedPages,
    indexability,
    uncheckedUrls: publicUncheckedUrls(result),
  };
}

export function gradeForScore(score: number): AuditGrade {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";
  if (score >= 30) return "D";
  return "E";
}

export function interpretationForGrade(grade: AuditGrade, locale: PublicAuditLocale = "ru"): string {
  const interpretations: Readonly<Record<PublicAuditLocale, Readonly<Record<AuditGrade, string>>>> = {
    ru: {
      A: "Сильное техническое состояние",
      B: "Хорошее состояние, нужны точечные улучшения",
      C: "В проверенной выборке есть заметные задачи",
      D: "Высокий SEO-риск",
      E: "Критическое состояние",
    },
    en: {
      A: "Strong technical condition",
      B: "Good condition with targeted improvements needed",
      C: "The checked sample contains notable tasks",
      D: "High SEO risk",
      E: "Critical condition",
    },
  };
  return interpretations[locale][grade];
}

function publicCategory(category: CategoryScore, locale: PublicAuditLocale): PublicAuditCategory {
  const risk = publicRisk(category);
  const status = risk === "not_checked" ? "not_checked" : "checked";
  const reason = status === "not_checked" ? notCheckedReason(category, locale) : undefined;
  return {
    name: PUBLIC_CATEGORY_NAMES[locale][category.category],
    risk,
    status,
    explanation: reason ?? publicExplanation(risk, locale),
    ...(reason ? { reason } : {}),
  };
}

function publicRisk(category: CategoryScore): PublicAuditRisk {
  const totalWeight = category.checks.reduce((sum, check) => sum + check.weight, 0);
  const observedWeight = category.checks.reduce(
    (sum, check) => sum + (check.applicable ? check.weight : 0),
    0,
  );
  if (totalWeight === 0 || observedWeight / totalWeight < 0.25) return "not_checked";
  const ratio = category.maxScore === 0 ? 0 : category.score / category.maxScore;
  if (ratio >= 0.8) return "low";
  if (ratio >= 0.55) return "medium";
  return "high";
}

function publicExplanation(risk: PublicAuditRisk, locale: PublicAuditLocale): string {
  const explanations: Readonly<Record<PublicAuditLocale, Readonly<Record<PublicAuditRisk, string>>>> = {
    ru: {
      low: "Базовые публичные сигналы выглядят устойчиво.",
      medium: "Есть общие зоны риска для расширенной проверки.",
      high: "Направление требует приоритетной углублённой проверки.",
      not_checked: "Проверка не выполнена: доступных измерений недостаточно.",
    },
    en: {
      low: "The basic public signals appear stable.",
      medium: "This area contains broader risks that need a deeper review.",
      high: "This area needs a priority in-depth review.",
      not_checked: "Not checked: there are not enough available measurements.",
    },
  };
  return explanations[locale][risk];
}

function notCheckedReason(category: CategoryScore, locale: PublicAuditLocale): string {
  const unavailable = category.checks.filter((check) => !check.applicable).map((check) => check.label);
  if (unavailable.length === 0) return publicExplanation("not_checked", locale);
  const labels = unavailable.slice(0, 4).join(", ");
  return locale === "ru"
    ? `Не проверено без внешних измерений: ${labels}.`
    : `Not checked without external measurements: ${labels}.`;
}

function publicCheckedPages(result: FullAuditResult, locale: PublicAuditLocale): PublicAuditPageResult[] {
  const sitemapUrls = new Set(result.sitemap.urls.map(publicUrl));
  const incoming = new Map<string, number>();
  for (const source of result.pages) {
    const targets = new Set(source.links.internalUrls.map(publicUrl));
    for (const target of targets) incoming.set(target, (incoming.get(target) ?? 0) + 1);
  }
  const sitemapUnavailableReason = locale === "ru"
    ? "XML sitemap не найдена или не была прочитана."
    : "The XML sitemap was not found or could not be read.";
  return result.pages.slice(0, PUBLIC_AUDIT_PAGE_LIMIT).map((page) => {
    const requestedUrl = publicUrl(page.transport?.requestedUrl ?? page.url);
    const finalUrl = publicUrl(page.transport?.finalUrl ?? page.url);
    const sitemap = result.sitemap.status === "found"
      ? { status: "checked" as const, included: sitemapUrls.has(finalUrl) || sitemapUrls.has(requestedUrl) }
      : { status: "not_checked" as const, included: null, reason: sitemapUnavailableReason };
    return {
      url: requestedUrl,
      finalUrl,
      http: {
        status: page.status,
        ok: page.status >= 200 && page.status < 300,
        redirectCount: page.transport?.redirects.length ?? 0,
      },
      title: publicTextSignal(page.title),
      description: publicTextSignal(page.description),
      h1: { count: page.h1.count, values: page.h1.values.slice(0, 5).map(publicEvidenceText) },
      noindex: page.indexing.noindex,
      canonical: {
        url: page.canonical.valid && page.canonical.url ? publicUrl(page.canonical.url) : null,
        valid: page.canonical.valid,
        selfReferential: page.canonical.selfReferential,
      },
      sitemap,
      internalLinks: {
        outgoing: page.links.internalCount,
        incomingFromCheckedPages: incoming.get(finalUrl) ?? incoming.get(requestedUrl) ?? 0,
      },
    };
  });
}

function publicTextSignal(signal: PageAnalysis["title"]): PublicAuditPageResult["title"] {
  return {
    value: signal.value === null ? null : publicEvidenceText(signal.value),
    present: signal.present,
    length: signal.length,
    optimal: signal.optimal,
  };
}

function publicIndexability(
  pages: readonly PageAnalysis[],
  locale: PublicAuditLocale,
): PublicAuditIndexability {
  if (pages.length === 0) {
    return {
      status: "not_checked",
      checkedPages: 0,
      indexablePages: 0,
      noindexPages: 0,
      httpErrorPages: 0,
      ratio: null,
      reason: locale === "ru"
        ? "Не удалось загрузить ни одной HTML-страницы."
        : "No HTML page could be loaded.",
    };
  }
  const indexablePages = pages.filter(
    (page) => page.status >= 200 && page.status < 300 && !page.indexing.noindex,
  ).length;
  return {
    status: "checked",
    checkedPages: pages.length,
    indexablePages,
    noindexPages: pages.filter((page) => page.indexing.noindex).length,
    httpErrorPages: pages.filter((page) => page.status >= 400).length,
    ratio: roundRatio(indexablePages / pages.length),
  };
}

function publicSummary(
  result: FullAuditResult,
  indexability: PublicAuditIndexability,
  totalIssues: number,
  locale: PublicAuditLocale,
): PublicAuditSummary {
  const highPriority = result.issueCounts.critical + result.issueCounts.high;
  const headline = locale === "ru"
    ? highPriority > 0
      ? `В выборке найдено приоритетных проблем: ${highPriority}`
      : totalIssues > 0
        ? `В выборке найдено замечаний: ${totalIssues}`
        : "В проверенной выборке явных проблем не найдено"
    : highPriority > 0
      ? `Priority issues found in the sample: ${highPriority}`
      : totalIssues > 0
        ? `Issues found in the sample: ${totalIssues}`
        : "No evident issues were found in the checked sample";
  const facts = locale === "ru"
    ? [
        `Проверено страниц: ${result.pagesChecked}; всего обнаружено URL: ${result.pagesDiscovered}.`,
        indexability.status === "checked"
          ? `Индексируемы в выборке: ${indexability.indexablePages} из ${indexability.checkedPages}; noindex: ${indexability.noindexPages}; HTTP-ошибок: ${indexability.httpErrorPages}.`
          : indexability.reason,
        `Проблемы по важности: critical ${result.issueCounts.critical}, high ${result.issueCounts.high}, medium ${result.issueCounts.medium}, low ${result.issueCounts.low}.`,
      ]
    : [
        `Pages checked: ${result.pagesChecked}; URLs discovered: ${result.pagesDiscovered}.`,
        indexability.status === "checked"
          ? `Indexable in the sample: ${indexability.indexablePages} of ${indexability.checkedPages}; noindex: ${indexability.noindexPages}; HTTP errors: ${indexability.httpErrorPages}.`
          : indexability.reason,
        `Issues by severity: critical ${result.issueCounts.critical}, high ${result.issueCounts.high}, medium ${result.issueCounts.medium}, low ${result.issueCounts.low}.`,
      ];
  return { headline, facts };
}

function publicIssueGroups(
  issues: readonly AuditIssue[],
  locale: PublicAuditLocale,
): PublicAuditIssueGroup[] {
  const grouped = new Map<string, AuditIssue[]>();
  for (const issue of issues) {
    const group = grouped.get(issue.code) ?? [];
    group.push(issue);
    grouped.set(issue.code, group);
  }
  return [...grouped.values()].slice(0, PUBLIC_ISSUE_GROUP_LIMIT).map((group) => {
    const first = group[0] as AuditIssue;
    const affectedUrls = [...new Set(group.flatMap((issue) => issue.url ? [publicUrl(issue.url)] : []))];
    return {
      code: first.code,
      category: first.category,
      severity: group.reduce(
        (highest, issue) => SEVERITY_ORDER[issue.severity] < SEVERITY_ORDER[highest] ? issue.severity : highest,
        first.severity,
      ),
      title: publicEvidenceText(first.title),
      why: publicEvidenceText(first.description),
      fix: publicEvidenceText(first.recommendation),
      acceptance: locale === "ru"
        ? `Повторная проверка не находит проблему «${first.title}» на затронутых URL.`
        : `A repeat check no longer finds “${first.title}” on the affected URLs.`,
      affectedCount: affectedUrls.length,
      affectedUrls: affectedUrls.slice(0, PUBLIC_AFFECTED_URL_LIMIT),
      evidence: group.slice(0, PUBLIC_EVIDENCE_LIMIT).map((issue) => ({
        ...(issue.url ? { url: publicUrl(issue.url) } : {}),
        observation: publicEvidenceText(issue.description),
      })),
    };
  });
}

function publicUncheckedUrls(result: FullAuditResult): string[] {
  const checked = new Set(result.pages.flatMap((page) => [
    publicUrl(page.url),
    publicUrl(page.transport?.requestedUrl ?? page.url),
    publicUrl(page.transport?.finalUrl ?? page.url),
  ]));
  const output: string[] = [];
  const seen = new Set<string>();
  for (const rawUrl of result.discoveredUrls) {
    const url = publicUrl(rawUrl);
    if (checked.has(url) || seen.has(url)) continue;
    seen.add(url);
    output.push(url);
    if (output.length >= PUBLIC_UNCHECKED_URL_LIMIT) break;
  }
  return output;
}

function publicUrl(value: string): string {
  const url = new URL(value);
  url.username = "";
  url.password = "";
  url.search = "";
  url.hash = "";
  return url.href;
}

function publicEvidenceText(value: string): string {
  const withoutUrlQueries = value.replace(/https?:\/\/[^\s<>"']+/giu, (match) => {
    const suffix = match.match(/[),.;:!?]+$/u)?.[0] ?? "";
    const rawUrl = suffix ? match.slice(0, -suffix.length) : match;
    try {
      return `${publicUrl(rawUrl)}${suffix}`;
    } catch {
      return `[URL скрыт]${suffix}`;
    }
  });
  return withoutUrlQueries.replace(
    /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/giu,
    "[e-mail скрыт]",
  );
}

function roundRatio(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 10_000) / 10_000;
}

function siteIssues(crawl: Awaited<ReturnType<typeof crawlSite>>): readonly AuditIssue[] {
  const issues: AuditIssue[] = [];
  if (crawl.robots.status === "missing") {
    issues.push({
      code: "ROBOTS_MISSING",
      category: "technicalIndexing",
      severity: "low",
      title: "robots.txt не найден",
      description: "Сайт не опубликовал robots.txt.",
      recommendation: "Добавьте robots.txt со ссылкой на sitemap.",
      url: crawl.robots.url,
    });
  } else if (crawl.robots.status === "error") {
    issues.push({
      code: "ROBOTS_UNAVAILABLE",
      category: "technicalIndexing",
      severity: "medium",
      title: "robots.txt недоступен",
      description: crawl.robots.error ?? "Не удалось проверить robots.txt.",
      recommendation: "Проверьте HTTP-ответ robots.txt.",
      url: crawl.robots.url,
    });
  }
  if (crawl.sitemap.status === "missing") {
    issues.push({
      code: "SITEMAP_MISSING",
      category: "technicalIndexing",
      severity: "medium",
      title: "Sitemap не найден",
      description: "Ни robots.txt, ни /sitemap.xml не дали карту сайта.",
      recommendation: "Опубликуйте XML sitemap и укажите её в robots.txt.",
    });
  } else if (crawl.sitemap.status === "error") {
    issues.push({
      code: "SITEMAP_UNAVAILABLE",
      category: "technicalIndexing",
      severity: "medium",
      title: "Sitemap недоступен",
      description: crawl.sitemap.errors.join("; ") || "Не удалось прочитать sitemap.",
      recommendation: "Проверьте XML и HTTP-ответ sitemap.",
    });
  }
  for (const failure of crawl.failures) {
    issues.push({
      code: "CRAWL_FETCH_FAILED",
      category: "technicalIndexing",
      severity: "medium",
      title: "Страница недоступна для аудита",
      description: failure.error,
      recommendation: "Проверьте URL, HTTP-ответ и доступность сайта.",
      url: failure.url,
    });
  }
  const linkedUrls = new Set(crawl.pages.flatMap((page) => page.links.internalUrls));
  const sitemapUrls = new Set(crawl.sitemap.urls);
  for (const page of crawl.pages) {
    if (page.status < 400) continue;
    const internal404 = linkedUrls.has(page.url) && (page.status === 404 || page.status === 410);
    issues.push({
      code: internal404 ? "INTERNAL_404" : "HTTP_ERROR_STATUS",
      category: "technicalIndexing",
      severity: page.status >= 500 ? "high" : "medium",
      title: internal404 ? "Битая внутренняя ссылка" : "Ошибка HTTP",
      description: `Страница вернула HTTP ${page.status}.`,
      recommendation: internal404
        ? "Исправьте или удалите внутреннюю ссылку и настройте корректный редирект при необходимости."
        : "Проверьте доступность страницы и её HTTP-ответ.",
      url: page.url,
    });
  }
  for (const page of crawl.pages) {
    if (page.transport && page.transport.redirects.length > 0 && linkedUrls.has(page.transport.requestedUrl)) {
      issues.push({
        code: "INTERNAL_REDIRECT",
        category: "structureOnPage",
        severity: "low",
        title: "Внутренняя ссылка ведёт через редирект",
        description: `Переходов в цепочке: ${page.transport.redirects.length}.`,
        recommendation: "Обновите внутреннюю ссылку на финальный канонический URL.",
        url: page.transport.requestedUrl,
      });
    }
    if ((page.transport?.responseTimeMs ?? 0) > 3_000) {
      issues.push({
        code: "SLOW_HTML_RESPONSE",
        category: "performanceMobile",
        severity: "medium",
        title: "Медленный ответ HTML",
        description: `Ответ получен примерно за ${page.transport?.responseTimeMs ?? 0} мс.`,
        recommendation: "Проверьте TTFB, серверное кеширование и цепочку формирования страницы.",
        url: page.url,
      });
    }
    if (crawl.sitemap.status === "found" && page.url !== crawl.finalUrl) {
      if (sitemapUrls.has(page.url) && !linkedUrls.has(page.url)) {
        issues.push({
          code: "SITEMAP_ORPHAN_PAGE",
          category: "structureOnPage",
          severity: "medium",
          title: "Страница sitemap без найденной внутренней ссылки",
          description: "URL присутствует в sitemap, но входящая внутренняя ссылка в проверенной выборке не найдена.",
          recommendation: "Добавьте уместную внутреннюю ссылку или исключите служебную страницу из sitemap.",
          url: page.url,
        });
      } else if (!sitemapUrls.has(page.url)) {
        issues.push({
          code: "PAGE_OUTSIDE_SITEMAP",
          category: "technicalIndexing",
          severity: "low",
          title: "Внутренняя страница отсутствует в sitemap",
          description: "Проверенная индексируемая страница не найдена в XML sitemap.",
          recommendation: "Добавьте каноническую индексируемую страницу в sitemap либо осознанно закройте её от индексации.",
          url: page.url,
        });
      }
    }
  }
  issues.push(...duplicateIssues(crawl.pages, "title", (page) => page.title.value));
  issues.push(...duplicateIssues(crawl.pages, "description", (page) => page.description.value));
  issues.push(...duplicateIssues(crawl.pages, "h1", (page) => page.h1.count === 1 ? page.h1.values[0] ?? null : null));
  const schemaTypes = new Set(crawl.pages.flatMap((page) => page.structuredData.types));
  if (!schemaTypes.has("WebSite") && !schemaTypes.has("Organization") && !schemaTypes.has("LocalBusiness")) {
    issues.push({
      code: "SITE_IDENTITY_SCHEMA_MISSING",
      category: "trustStructuredData",
      severity: "low",
      title: "Не найдена базовая разметка сайта или организации",
      description: "В проверенной выборке нет WebSite, Organization или LocalBusiness.",
      recommendation: "Добавьте только фактически достоверную разметку WebSite и подходящего типа организации.",
      url: crawl.finalUrl,
    });
  }
  if (crawl.pages.length > 1 && !schemaTypes.has("BreadcrumbList")) {
    issues.push({
      code: "BREADCRUMBS_SCHEMA_MISSING",
      category: "trustStructuredData",
      severity: "low",
      title: "Не найдена разметка хлебных крошек",
      description: "На многостраничном сайте в проверенной выборке нет BreadcrumbList.",
      recommendation: "Если у страниц есть иерархия, добавьте достоверный BreadcrumbList.",
      url: crawl.finalUrl,
    });
  }
  return issues;
}

function duplicateIssues(
  pages: Awaited<ReturnType<typeof crawlSite>>["pages"],
  kind: "title" | "description" | "h1",
  read: (page: Awaited<ReturnType<typeof crawlSite>>["pages"][number]) => string | null,
): AuditIssue[] {
  const groups = new Map<string, typeof pages[number][]>();
  for (const page of pages) {
    const raw = read(page)?.replace(/\s+/gu, " ").trim();
    if (!raw) continue;
    const key = raw.toLocaleLowerCase("ru");
    const group = groups.get(key) ?? [];
    group.push(page);
    groups.set(key, group);
  }
  const labels = { title: "title", description: "description", h1: "H1" } as const;
  const codes = { title: "TITLE_DUPLICATE", description: "DESCRIPTION_DUPLICATE", h1: "H1_DUPLICATE" } as const;
  return [...groups.values()].filter((group) => group.length > 1).flatMap((group) => group.map((page) => ({
    code: codes[kind],
    category: kind === "description" ? "contentImages" as const : "structureOnPage" as const,
    severity: kind === "title" ? "medium" as const : "low" as const,
    title: `Повторяющийся ${labels[kind]}`,
    description: `Одинаковое значение найдено на ${group.length} страницах.`,
    recommendation: `Сделайте ${labels[kind]} уникальным и соответствующим содержанию страницы.`,
    url: page.url,
  })));
}

function countIssues(
  issues: readonly AuditIssue[],
): Readonly<Record<AuditIssueSeverity, number>> {
  const counts: Record<AuditIssueSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  for (const issue of issues) counts[issue.severity] += 1;
  return counts;
}

function compareIssues(left: AuditIssue, right: AuditIssue): number {
  return (
    SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity] ||
    left.code.localeCompare(right.code, "en") ||
    (left.url ?? "").localeCompare(right.url ?? "", "en")
  );
}
