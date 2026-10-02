import { load } from "cheerio";

import type { AuditIssue, PageAnalysis, TextSignal } from "./types";
import { normalizeTargetUrl } from "./url";

export type HeaderInput = Headers | Readonly<Record<string, string>>;

export interface AnalyzePageInput {
  readonly url: string | URL;
  readonly status: number;
  readonly html: string;
  readonly headers?: HeaderInput;
  readonly requestedUrl?: string;
  readonly redirects?: readonly string[];
  readonly responseTimeMs?: number;
  readonly checkedAt?: string;
  readonly depth?: number;
}

const SECURITY_HEADERS = [
  "content-security-policy",
  "strict-transport-security",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "x-frame-options",
] as const;

export function analyzePage(input: AnalyzePageInput): PageAnalysis {
  const pageUrl = normalizeTargetUrl(input.url);
  const $ = load(input.html);
  const headers = normalizeHeaders(input.headers);
  const title = textSignal($("head > title").first().text(), 30, 60, 2_000);
  const description = textSignal(
    $('meta[name="description" i]').first().attr("content"),
    70,
    160,
  );
  const h1Values = $("h1")
    .toArray()
    .map((element) => normalizeText($(element).text()))
    .filter(Boolean);
  const canonical = analyzeCanonical(
    $('link[rel~="canonical" i]').first().attr("href"),
    pageUrl,
  );
  const directives = collectRobotsDirectives($, headers);
  const languageValue = normalizeText($("html").attr("lang"));
  const hreflang = analyzeHreflang($, pageUrl);
  const viewport = $('meta[name="viewport" i]').length > 0;
  const charset = extractCharset($, headers);
  const links = analyzeLinks($, pageUrl);
  const images = analyzeImages($);
  const structuredData = analyzeStructuredData($);
  const openGraph = analyzeOpenGraph($);
  const presentSecurityHeaders = SECURITY_HEADERS.filter((header) => headers.has(header));
  const missingSecurityHeaders = SECURITY_HEADERS.filter((header) => !headers.has(header));
  const headingLevels = $("h1,h2,h3,h4,h5,h6").toArray().map((element) => Number(element.tagName.slice(1)));
  const contentRoot = $("body").clone();
  contentRoot.find("script,style,noscript,svg,template").remove();
  const normalizedVisibleText = normalizeText(contentRoot.text());
  const wordCount = normalizedVisibleText.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
  const favicon = $('link[rel~="icon" i], link[rel="shortcut icon" i]').length > 0;
  const mixedContentCount = pageUrl.protocol === "https:"
    ? $('img[src^="http:" i], script[src^="http:" i], iframe[src^="http:" i], source[src^="http:" i], audio[src^="http:" i], video[src^="http:" i], link[href^="http:" i]').length
    : 0;
  const forms = analyzeForms($);

  const partial: Omit<PageAnalysis, "issues"> = {
    url: pageUrl.href,
    status: input.status,
    title,
    description,
    h1: { count: $("h1").length, values: h1Values },
    headingStructure: {
      h2Count: $("h2").length,
      h3Count: $("h3").length,
      hierarchyValid: headingLevels.every((level, index) => index === 0 || level <= (headingLevels[index - 1] ?? level) + 1),
    },
    canonical,
    indexing: {
      noindex: directives.has("noindex") || directives.has("none"),
      nofollow: directives.has("nofollow") || directives.has("none"),
      metaRobots: normalizeText($('meta[name="robots" i]').first().attr("content")) || null,
      xRobotsTag: headers.get("x-robots-tag") ?? null,
      actual: "unavailable",
    },
    language: { present: languageValue.length > 0, value: languageValue || null },
    hreflang,
    templateSignature: analyzeTemplateSignature($),
    viewport,
    charset,
    links,
    images,
    structuredData,
    openGraph,
    securityHeaders: {
      present: presentSecurityHeaders,
      missing: missingSecurityHeaders,
    },
    content: {
      wordCount,
      thin: wordCount < 100,
      fingerprint: stableTextFingerprint(normalizedVisibleText),
    },
    favicon,
    mixedContent: { count: mixedContentCount },
    forms,
    transport: {
      requestedUrl: input.requestedUrl ?? pageUrl.href,
      finalUrl: pageUrl.href,
      redirects: input.redirects ?? [],
      redirectCount: (input.redirects ?? []).length,
      responseTimeMs: input.responseTimeMs ?? null,
      checkedAt: validTimestamp(input.checkedAt) ?? "not_recorded",
      depth: Math.max(0, input.depth ?? 0),
      contentType: headers.get("content-type") ?? null,
    },
  };

  return { ...partial, issues: buildIssues(partial) };
}

export function stableTextFingerprint(value: string): string {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193) >>> 0;
    second = Math.imul(second ^ (code + index), 0x85ebca6b) >>> 0;
  }
  return `${value.length}:${first.toString(16).padStart(8, "0")}${second.toString(16).padStart(8, "0")}`;
}

function analyzeHreflang(
  $: ReturnType<typeof load>,
  pageUrl: URL,
): NonNullable<PageAnalysis["hreflang"]> {
  const alternates: Array<{ language: string; url: string }> = [];
  $('link[rel~="alternate" i][hreflang][href]').each((_index, element) => {
    const language = normalizeText($(element).attr("hreflang")).toLowerCase();
    const href = $(element).attr("href")?.trim();
    if (!language || !href) return;
    try {
      alternates.push({ language, url: normalizeTargetUrl(new URL(href, pageUrl)).href });
    } catch {
      // Invalid alternate URLs are omitted from the usable hreflang set.
    }
  });
  return alternates;
}

function analyzeTemplateSignature($: ReturnType<typeof load>): string {
  const children = $("body").children().toArray().slice(0, 12)
    .map((element) => element.tagName.toLowerCase())
    .join(".");
  const markers = ["nav", "main", "article", "aside", "form", "table"]
    .map((tag) => `${tag}${$(tag).length}`)
    .join("-");
  return `dom-${children || "empty"}-${markers}`;
}

function analyzeCanonical(
  rawCanonical: string | undefined,
  pageUrl: URL,
): PageAnalysis["canonical"] {
  if (!rawCanonical?.trim()) {
    return { url: null, valid: false, selfReferential: null };
  }
  try {
    const canonical = normalizeTargetUrl(new URL(rawCanonical.trim(), pageUrl));
    return {
      url: canonical.href,
      valid: true,
      selfReferential: canonical.href === pageUrl.href,
    };
  } catch {
    return { url: rawCanonical.trim(), valid: false, selfReferential: null };
  }
}

function analyzeLinks($: ReturnType<typeof load>, pageUrl: URL): PageAnalysis["links"] {
  const internal = new Set<string>();
  let externalCount = 0;
  let parameterizedCount = 0;
  $("a[href]").each((_index, element) => {
    const href = $(element).attr("href")?.trim();
    if (!href || href.startsWith("#")) return;
    try {
      const resolved = normalizeTargetUrl(new URL(href, pageUrl));
      if (resolved.hostname === pageUrl.hostname) {
        internal.add(resolved.href);
        if (resolved.search) parameterizedCount += 1;
      } else {
        externalCount += 1;
      }
    } catch {
      // Non-web links (mailto:, tel:, javascript:) are not crawl links.
    }
  });
  return {
    internalCount: internal.size,
    externalCount,
    internalUrls: [...internal],
    parameterizedCount,
  };
}

function analyzeImages($: ReturnType<typeof load>): PageAnalysis["images"] {
  let withAlt = 0;
  let missingAlt = 0;
  let emptyAlt = 0;
  let missingDimensions = 0;
  $("img").each((_index, element) => {
    const alt = $(element).attr("alt");
    if (alt === undefined) {
      missingAlt += 1;
    } else {
      withAlt += 1;
      if (alt.trim() === "") emptyAlt += 1;
    }
    if (!$(element).attr("width") || !$(element).attr("height")) missingDimensions += 1;
  });
  return { total: $("img").length, withAlt, missingAlt, emptyAlt, missingDimensions };
}

function analyzeForms($: ReturnType<typeof load>): NonNullable<PageAnalysis["forms"]> {
  const controls = $("form input:not([type=hidden]):not([type=submit]):not([type=button]), form select, form textarea").toArray();
  let labeledControls = 0;
  let visibleConsent = false;
  for (const control of controls) {
    const element = $(control);
    const id = element.attr("id");
    const externalLabel = id
      ? $("label[for]").toArray().find((candidate) => $(candidate).attr("for") === id)
      : undefined;
    const label = element.closest("label").text() || (externalLabel ? $(externalLabel).text() : "");
    if (normalizeText(label) || element.attr("aria-label") || element.attr("aria-labelledby")) labeledControls += 1;
    if ((element.attr("type") ?? "").toLowerCase() === "checkbox" && /(?:соглас|персональн|privacy|consent|data processing)/iu.test(label)) visibleConsent = true;
  }
  const getMethodCount = $("form").toArray().filter((form) => {
    const method = ($(form).attr("method") ?? "get").toLowerCase();
    return method === "get";
  }).length;
  const passwordInputCount = $('form input[type="password" i]').length;
  const loginForm = $("form").toArray().some((form) => {
    const element = $(form);
    if (element.find('input[type="password" i]').length === 0) return false;
    const signal = normalizeText([
      element.attr("action"),
      element.attr("id"),
      element.attr("class"),
      element.text(),
    ].filter(Boolean).join(" "));
    return /(?:login|log in|sign in|signin|вход|войти|авторизац)/iu.test(signal)
      || element.find('input[type="email" i], input[name*="email" i], input[name*="user" i], input[autocomplete="username" i]').length > 0;
  });
  return {
    total: $("form").length,
    getMethodCount,
    controls: controls.length,
    labeledControls,
    visibleConsent,
    passwordInputCount,
    loginForm,
  };
}

function analyzeStructuredData(
  $: ReturnType<typeof load>,
): PageAnalysis["structuredData"] {
  let valid = 0;
  let invalid = 0;
  const types = new Set<string>();
  const scripts = $('script[type="application/ld+json" i]').toArray();
  for (const script of scripts) {
    try {
      const parsed: unknown = JSON.parse($(script).text());
      valid += 1;
      collectJsonLdTypes(parsed, types, 0);
    } catch {
      invalid += 1;
    }
  }
  const breadcrumbList = analyzeBreadcrumbLists($);
  return {
    total: scripts.length,
    valid,
    invalid,
    types: [...types].sort(),
    ...(breadcrumbList.valid > 0 || breadcrumbList.invalid > 0 ? { breadcrumbList } : {}),
  };
}

function analyzeBreadcrumbLists($: ReturnType<typeof load>): { valid: number; invalid: number } {
  let valid = 0;
  let invalid = 0;
  for (const script of $('script[type="application/ld+json" i]').toArray()) {
    try {
      const parsed: unknown = JSON.parse($(script).text());
      const values = Array.isArray(parsed) ? parsed : [parsed];
      for (const value of values) {
        if (!value || typeof value !== "object" || (value as Record<string, unknown>)["@type"] !== "BreadcrumbList") continue;
        const entries = (value as Record<string, unknown>).itemListElement;
        const validEntries = Array.isArray(entries) && entries.length > 0 && entries.every((entry) => {
          if (!entry || typeof entry !== "object") return false;
          const record = entry as Record<string, unknown>;
          return Number.isInteger(record.position) && typeof record.name === "string" && record.name.trim().length > 0;
        });
        if (validEntries) valid += 1; else invalid += 1;
      }
    } catch {
      // Malformed JSON is counted by structuredData.invalid, not as a valid breadcrumb.
    }
  }
  return { valid, invalid };
}

function collectJsonLdTypes(value: unknown, types: Set<string>, depth: number): void {
  if (depth > 20 || value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) collectJsonLdTypes(item, types, depth + 1);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === "@type") {
      if (typeof child === "string") types.add(child);
      if (Array.isArray(child)) {
        for (const item of child) if (typeof item === "string") types.add(item);
      }
    }
    collectJsonLdTypes(child, types, depth + 1);
  }
}

function analyzeOpenGraph($: ReturnType<typeof load>): PageAnalysis["openGraph"] {
  const read = (property: string): string | null =>
    normalizeText($(`meta[property="${property}" i]`).first().attr("content")) || null;
  const title = read("og:title");
  const description = read("og:description");
  const image = read("og:image");
  const url = read("og:url");
  const coverage = [title, description, image, url].filter(Boolean).length / 4;
  return { title, description, image, url, coverage };
}

function collectRobotsDirectives(
  $: ReturnType<typeof load>,
  headers: ReadonlyMap<string, string>,
): ReadonlySet<string> {
  const directives = new Set<string>();
  const values: string[] = [];
  $('meta[name="robots" i], meta[name="googlebot" i]').each((_index, element) => {
    values.push($(element).attr("content") ?? "");
  });
  values.push(headers.get("x-robots-tag") ?? "");
  for (const value of values) {
    for (const directive of value.toLowerCase().split(/[\s,]+/)) {
      if (directive) directives.add(directive);
    }
  }
  return directives;
}

function extractCharset(
  $: ReturnType<typeof load>,
  headers: ReadonlyMap<string, string>,
): string | null {
  const direct = $('meta[charset]').first().attr("charset");
  if (direct) return direct.trim().toLowerCase();
  const httpEquiv = $('meta[http-equiv="content-type" i]').first().attr("content");
  const metaMatch = httpEquiv?.match(/charset\s*=\s*([^;\s]+)/i)?.[1];
  if (metaMatch) return metaMatch.toLowerCase();
  return headers
    .get("content-type")
    ?.match(/charset\s*=\s*["']?([^;\s"']+)/i)?.[1]
    ?.toLowerCase() ?? null;
}

function textSignal(
  rawValue: string | undefined,
  minimum: number,
  maximum: number,
  valueLimit = 1_000,
): TextSignal {
  const value = normalizeText(rawValue).slice(0, valueLimit);
  return {
    value: value || null,
    present: value.length > 0,
    length: value.length,
    optimal: value.length >= minimum && value.length <= maximum,
  };
}

function validTimestamp(value: string | undefined): string | null {
  if (!value) return null;
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp.toISOString();
}

function normalizeText(value: string | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function normalizeHeaders(input?: HeaderInput): ReadonlyMap<string, string> {
  const headers = new Map<string, string>();
  if (!input) return headers;
  if ("forEach" in input && typeof input.forEach === "function") {
    input.forEach((value: string, key: string) => headers.set(key.toLowerCase(), value));
  } else {
    for (const [key, value] of Object.entries(input)) {
      headers.set(key.toLowerCase(), value);
    }
  }
  return headers;
}

function buildIssues(page: Omit<PageAnalysis, "issues">): readonly AuditIssue[] {
  const issues: AuditIssue[] = [];
  const add = (
    code: string,
    category: AuditIssue["category"],
    severity: AuditIssue["severity"],
    title: string,
    description: string,
    recommendation: string,
  ) => issues.push({ code, category, severity, title, description, recommendation, url: page.url });

  if (!page.title.present) add("TITLE_MISSING", "structureOnPage", "high", "Нет title", "Страница не содержит title.", "Добавьте уникальный title длиной 30–60 символов.");
  else if (!page.title.optimal) add("TITLE_LENGTH", "structureOnPage", "low", "Длина title неоптимальна", `Длина title: ${page.title.length}.`, "Сократите или расширьте title до 30–60 символов.");
  if (!page.description.present) add("DESCRIPTION_MISSING", "contentImages", "medium", "Нет meta description", "Страница не содержит meta description.", "Добавьте описание длиной 70–160 символов.");
  else if (!page.description.optimal) add("DESCRIPTION_LENGTH", "contentImages", "low", "Длина description неоптимальна", `Длина description: ${page.description.length}.`, "Приведите description к длине 70–160 символов.");
  if (page.h1.count === 0) add("H1_MISSING", "structureOnPage", "high", "Нет H1", "На странице нет главного заголовка.", "Добавьте один содержательный H1.");
  else if (page.h1.count > 1) add("H1_MULTIPLE", "structureOnPage", "medium", "Несколько H1", `Найдено H1: ${page.h1.count}.`, "Оставьте один основной H1.");
  if (page.headingStructure && !page.headingStructure.hierarchyValid) add("HEADING_HIERARCHY", "structureOnPage", "low", "Нарушена иерархия заголовков", "Уровни заголовков пропускаются.", "Выстройте последовательную иерархию H1–H3 без пропусков уровней.");
  if (!page.canonical.url) add("CANONICAL_MISSING", "technicalIndexing", "low", "Нет canonical", "Не указан канонический URL.", "Добавьте rel=canonical.");
  else if (!page.canonical.valid) add("CANONICAL_INVALID", "technicalIndexing", "medium", "Некорректный canonical", "Canonical не является HTTP(S) URL.", "Исправьте canonical URL.");
  if (page.indexing.noindex) add("PAGE_NOINDEX", "technicalIndexing", "high", "Страница закрыта от индексации", "Robots meta содержит noindex.", "Уберите noindex, если страница должна ранжироваться.");
  if (!page.language.present) add("LANG_MISSING", "structureOnPage", "low", "Не указан язык", "У html нет lang.", "Добавьте атрибут lang к html.");
  if (!page.viewport) add("VIEWPORT_MISSING", "performanceMobile", "medium", "Нет viewport", "Не задан mobile viewport.", "Добавьте meta viewport.");
  if (!page.charset) add("CHARSET_MISSING", "technicalIndexing", "medium", "Не указана кодировка", "Кодировка HTML не найдена.", "Укажите UTF-8 в HTTP или meta charset.");
  if (page.images.missingAlt > 0) add("IMAGE_ALT_MISSING", "contentImages", "medium", "У изображений нет alt", `Без alt: ${page.images.missingAlt}.`, "Добавьте alt всем значимым изображениям.");
  if ((page.images.missingDimensions ?? 0) > 0) add("IMAGE_DIMENSIONS_MISSING", "contentImages", "low", "Не заданы размеры изображений", `Без width/height: ${page.images.missingDimensions}.`, "Задайте width и height для снижения layout shift.");
  if (page.structuredData.invalid > 0) add("JSON_LD_INVALID", "trustStructuredData", "medium", "Ошибка JSON-LD", `Невалидных блоков: ${page.structuredData.invalid}.`, "Исправьте JSON-LD.");
  if (page.structuredData.total === 0) add("JSON_LD_MISSING", "trustStructuredData", "low", "Нет JSON-LD", "Структурированные данные JSON-LD не найдены.", "Добавьте уместную разметку и проверяйте её фактическую достоверность.");
  if (page.openGraph.coverage < 1) add("OPEN_GRAPH_INCOMPLETE", "trustStructuredData", "low", "OpenGraph неполон", `Заполнено ${Math.round(page.openGraph.coverage * 4)} из 4 полей.`, "Добавьте og:title, og:description, og:image и og:url.");
  if (page.securityHeaders.missing.length > 0) add("SECURITY_HEADERS_MISSING", "trustStructuredData", "low", "Нет security headers", `Отсутствуют: ${page.securityHeaders.missing.join(", ")}.`, "Настройте защитные HTTP-заголовки.");
  if (page.content?.thin) add("THIN_CONTENT", "contentImages", "low", "Мало видимого текста", `Найдено примерно ${page.content.wordCount} слов.`, "Проверьте, достаточно ли странице уникального полезного содержания для её задачи.");
  if (page.favicon === false) add("FAVICON_MISSING", "trustStructuredData", "low", "Не найден favicon", "В HTML не обнаружена ссылка на favicon.", "Добавьте link rel=icon.");
  if ((page.mixedContent?.count ?? 0) > 0) add("MIXED_CONTENT", "trustStructuredData", "high", "Смешанный контент", `HTTP-ресурсов на HTTPS-странице: ${page.mixedContent?.count ?? 0}.`, "Переведите все подключаемые ресурсы на HTTPS.");
  if ((page.links.parameterizedCount ?? 0) > 20) add("PARAMETER_LINKS_EXCESSIVE", "structureOnPage", "low", "Много ссылок с параметрами", `Ссылок с query-параметрами: ${page.links.parameterizedCount}.`, "Проверьте фасетную навигацию, canonical и правила индексации параметров.");
  if (page.links.internalCount > 200) add("INTERNAL_LINKS_EXCESSIVE", "structureOnPage", "low", "Слишком много внутренних ссылок", `Уникальных внутренних ссылок: ${page.links.internalCount}.`, "Сократите шаблонные ссылки и оставьте полезную навигацию.");
  if ((page.forms?.getMethodCount ?? 0) > 0) add("FORM_GET_METHOD", "trustStructuredData", "low", "Форма использует GET", `GET-форм: ${page.forms?.getMethodCount ?? 0}.`, "Не передавайте персональные данные формы через URL; используйте POST там, где это уместно.");
  if (page.forms && page.forms.controls > page.forms.labeledControls) add("FORM_LABELS_MISSING", "trustStructuredData", "low", "Не все поля формы подписаны", `Подписано ${page.forms.labeledControls} из ${page.forms.controls} полей.`, "Свяжите каждое поле с label или доступным aria-именем.");
  return issues;
}
