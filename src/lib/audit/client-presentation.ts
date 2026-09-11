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

export type AuditClientPage = {
  url: string;
  typeLabel: string;
  selectionReason: string;
  indexability: string;
  issues: readonly AuditClientIssue[];
};

export type AuditClientPresentation = {
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
  };
  exclusions: readonly {
    reason: "search_page" | "closed_section" | "technical_page" | "parameterized_url" | "redirect" | "confirmed_duplicate" | "service_url" | "technical_object" | "duplicate_template" | "other";
    label: string;
    count: number;
  }[];
  issues: readonly AuditClientIssue[];
  strengths: readonly string[];
  pages: readonly AuditClientPage[];
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
  const actionable = aggregateActionableChecks(checks)
    .filter(({ check, affectedUrls }) => check.checkId !== "breadcrumbs" || affectedBreadcrumbRecommendationApplies(check, affectedUrls, checkedPages));
  const performanceObservation = record(root.performanceObservation);
  const issues = actionable.map(({ check, affectedUrls }) => clientIssue(check, locale, performanceObservation, affectedUrls));
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
    };
  }).filter((page) => page.url);
  const resources = records(root.technicalResources);
  const technicalFileSummary = record(root.technicalFileSummary);
  const publicTechnicalResources = resources.flatMap((resource) => {
    const type = string(resource.resourceType);
    const statusCode = integer(resource.statusCode);
    if ((type !== "robots" && type !== "sitemap") || statusCode < 200 || statusCode >= 300) return [];
    const facts = type === "robots" ? record(technicalFileSummary.robots) : record(technicalFileSummary.sitemap);
    const details = technicalFileDetails(type as "robots" | "sitemap", facts, locale, { htmlFound, eligible });
    return [{
      type: type as "robots" | "sitemap",
      label: type === "robots" ? "robots.txt" : "sitemap.xml",
      url: cleanUrl(string(resource.finalUrl) || string(resource.url)),
      statusCode,
      details,
    }];
  });
  const { additionalFiles, additionalDocuments } = additionalResourceCounts(resources);
  const counts = countIssueKinds(issues);
  const exclusions = normalizeExclusions(root.exclusionSummary, excluded, locale);
  const scope = clientScopeSummary(htmlFound, record(technicalFileSummary.sitemap), locale);
  const nextStep = locale === "ru" ? {
    primary: "Получить полный аудит сайта",
    secondary: "Повторить бесплатную проверку",
    note: "Повторная бесплатная проверка снова ограничена выборкой до 10 страниц.",
  } : {
    primary: "Get a full website audit",
    secondary: "Repeat the free check",
    note: "A repeated free check is still limited to a sample of up to 10 pages.",
  };

  return deepFreeze({
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
    },
    exclusions,
    issues,
    strengths: buildStrengths(checks, checkedPages, publicTechnicalResources, locale),
    pages,
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
    const storedDetails = strings(item.details).map((detail) => normalizeStoredTechnicalDetail(detail, locale));
    const facts = record(type === "robots" ? storedTechnicalFileSummary.robots : storedTechnicalFileSummary.sitemap);
    const details = Object.keys(facts).length
      ? technicalFileDetails(type as "robots" | "sitemap", facts, locale, storedCoverage)
      : storedDetails;
    return [{ type: type as "robots" | "sitemap", label: string(item.label), url, statusCode, details }];
  });
  const recomputedAdditionalResources = additionalResourceCounts(records(root.technicalResources));
  const additionalResources = string(candidate.additionalFilesBasis) === "classified_resources"
    ? {
        additionalFiles: integer(candidate.additionalFiles),
        additionalDocuments: integer(candidate.additionalDocuments),
      }
    : recomputedAdditionalResources;
  return deepFreeze({
    summary: {
      htmlFound: storedHtmlFound,
      ...storedScope,
      checkedLabel: locale === "ru" ? "Подробно проверено страниц" : "Pages checked in detail",
      findingsLabel: findingSummaryLabel({
        critical: integer(summary.critical),
        review: integer(summary.review),
        optional: integer(summary.optional),
      }, locale),
      eligible: integer(summary.eligible),
      excluded: integer(summary.excluded),
      selected: integer(summary.selected),
      checked: integer(summary.checked),
      notCompleted: integer(summary.notCompleted),
      outsideSample: integer(summary.outsideSample),
      critical: integer(summary.critical),
      review: integer(summary.review),
      optional: integer(summary.optional),
    },
    exclusions: normalizeExclusions(candidate.exclusions, integer(summary.excluded), locale),
    issues,
    strengths: strings(candidate.strengths),
    pages,
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

function normalizeStoredScopeLabel(label: string, locale: AuditLocale): string {
  if (locale === "ru" && label === "Обработано для анализа") return "Предварительно просмотрено адресов";
  if (locale === "en" && label === "Processed for analysis") return "Addresses previewed";
  return label || (locale === "ru" ? "Найдено HTML-страниц" : "HTML pages found");
}

function normalizeStoredTechnicalDetail(detail: string, locale: AuditLocale): string {
  if (locale !== "ru") return detail;
  return detail
    .replace(/Для предварительного анализа обработано (\d+) URL/gu, "Предварительно просмотрено $1 адресов")
    .replace(/остальные (\d+) URL не загружались/gu, "остальные $1 адресов не загружались");
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
    return parts.join(" · ") || "No issues requiring attention";
  }
  const parts = [
    ...(counts.critical > 0 ? [`${counts.critical} ${russianCountWord(counts.critical, "критическая проблема", "критические проблемы", "критических проблем")}`] : []),
    ...(counts.review > 0 ? [`${counts.review} ${russianCountWord(counts.review, "вывод требует проверки", "вывода требуют проверки", "выводов требуют проверки")}`] : []),
    ...(counts.optional > 0 ? [`${counts.optional} ${russianCountWord(counts.optional, "возможное улучшение", "возможных улучшения", "возможных улучшений")}`] : []),
  ];
  return parts.join(" · ") || "Нет пунктов, требующих внимания";
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
    const page = performancePageLabel(check.targetUrl, locale);
    return {
      checkId: check.checkId,
      kind,
      title: ru ? `Мобильная производительность ${page}` : `Mobile performance of the ${page}`,
      url: check.targetUrl,
      affectedUrls,
      whatFound: ru
        ? `В лабораторном тесте измерена мобильная производительность ${page}.`
        : `A laboratory mobile-performance measurement was completed for the ${page}.`,
      whyImportant: ru
        ? "По результатам теста показатель требует внимания, но итоговый балл сам по себе не указывает на конкретную причину."
        : "The result needs attention, but the total score alone does not identify the cause of lower performance.",
      howChecked: runCount === 1
        ? ru ? "Лабораторный тест Google Lighthouse в мобильном профиле: один запуск." : "One Google Lighthouse run using a laboratory mobile profile."
        : ru ? `${runCount} запуска Google Lighthouse в мобильном лабораторном профиле.` : `${runCount} Google Lighthouse runs using a laboratory mobile profile.`,
      reliability: runCount === 1
        ? ru ? "Это предварительный лабораторный результат одного запуска; он не описывает опыт всех посетителей." : "This is an early result. One run does not represent the speed experienced by every real visitor."
        : ru ? "Это лабораторные измерения. Они не отражают скорость у всех реальных посетителей." : "These are laboratory measurements and do not represent the speed experienced by every real visitor.",
      nextStep: ru
        ? "Повторите тест 2–3 раза в одинаковых условиях. Если результат повторяется, изучите отдельные показатели."
        : "Repeat the test 2–3 times under the same conditions. If the result remains similar, review the separate metrics and identify what needs further investigation.",
      details: performanceDetails(performanceObservation, locale, score),
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
  score?: string,
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
  if (score) details.push({ label: ru ? "Оценка производительности" : "Performance score", value: `${score} ${ru ? "из" : "out of"} 100` });
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

function performancePageLabel(targetUrl: string, locale: AuditLocale): string {
  const path = urlPath(targetUrl);
  const homepage = path === "/";
  if (locale === "ru") return homepage ? "главной страницы" : `страницы ${path}`;
  return homepage ? "homepage" : `page ${path}`;
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
    strengths.push(locale === "ru" ? `Все ${checked} проверенных страниц открылись без серверных ошибок.` : `All ${checked} checked pages opened without a server error.`);
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

function affectedBreadcrumbRecommendationApplies(
  check: NormalizedCheck,
  affectedUrls: readonly string[],
  pages: readonly Record<string, unknown>[],
): boolean {
  const candidates = pages.filter((candidate) => affectedUrls.some((affectedUrl) => sameUrl(
    cleanUrl(string(candidate.finalUrl) || string(candidate.url)),
    affectedUrl || check.targetUrl,
  )));
  return candidates.some((page) => new Set(["service", "category", "hub", "detail", "product", "article", "case"])
    .has(string(page.pageType)));
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
