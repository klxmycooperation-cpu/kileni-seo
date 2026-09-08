import type { Locale } from "../../config/site";
import { glossaryTerms } from "../../content/glossary";
import { glossaryDetailPath } from "../seo/glossary-metadata";

type LocalizedTooltip = Readonly<Record<Locale, string>>;

const GLOSSARY_TOOLTIPS: Readonly<Record<string, LocalizedTooltip>> = {
  url: { ru: "Адрес страницы", en: "Page web address" },
  "http-status": { ru: "Ответ сервера", en: "Server response code" },
  lighthouse: { ru: "Проверка Google", en: "Google page check" },
  "seo-audit": { ru: "Проверка сайта", en: "Search readiness review" },
  indexing: { ru: "Добавление в поиск", en: "Stored in search" },
  crawling: { ru: "Обход страниц", en: "Page discovery scan" },
  "search-crawler": { ru: "Робот поисковика", en: "Search engine robot" },
  "robots-txt": { ru: "Правила для роботов", en: "Crawler access rules" },
  sitemap: { ru: "Карта страниц", en: "Website page map" },
  canonical: { ru: "Основной адрес страницы", en: "Preferred page address" },
  redirect: { ru: "Переадресация страницы", en: "Page forwarding rule" },
  "http-404": { ru: "Страница не найдена", en: "Page not found" },
  title: { ru: "Заголовок в поиске", en: "Search result title" },
  description: { ru: "Описание в поиске", en: "Search result summary" },
  "heading-h1": { ru: "Главный заголовок", en: "Main page heading" },
  "meta-tags": { ru: "Данные для поиска", en: "Search page details" },
  "on-page": { ru: "Настройки самой страницы", en: "On-page search setup" },
  "internal-link": { ru: "Ссылка внутри сайта", en: "Same-site page link" },
  "internal-linking": { ru: "Связи страниц сайта", en: "Links between pages" },
  "duplicate-page": { ru: "Повтор страницы", en: "Repeated page content" },
  "schema-org": { ru: "Словарь разметки сайта", en: "Website markup vocabulary" },
  "structured-data": { ru: "Пояснения для роботов", en: "Machine-readable page facts" },
  "json-ld": { ru: "Формат разметки данных", en: "Structured data format" },
  "core-web-vitals": { ru: "Показатели удобства страницы", en: "Page experience signals" },
  lcp: { ru: "Скорость главного блока", en: "Main content speed" },
  cls: { ru: "Стабильность макета страницы", en: "Page layout stability" },
  tbt: { ru: "Время блокировки страницы", en: "Page blocking time" },
  inp: { ru: "Скорость реакции страницы", en: "Page response speed" },
  ctr: { ru: "Доля переходов", en: "Click through rate" },
  conversion: { ru: "Доля целевых действий", en: "Completed action rate" },
  "search-semantics": { ru: "Темы поисковых запросов", en: "Search query topics" },
  "query-cluster": { ru: "Группа похожих запросов", en: "Similar query group" },
  "semantic-core": { ru: "Список поисковых запросов", en: "Target keyword set" },
  "query-clustering": { ru: "Группировка похожих запросов", en: "Grouping similar queries" },
  "search-intent": { ru: "Цель поискового запроса", en: "Purpose behind query" },
  "page-cannibalisation": { ru: "Конкуренция страниц сайта", en: "Pages competing together" },
  "landing-page": { ru: "Страница для запроса", en: "Target search page" },
  "product-feed": { ru: "Файл с товарами", en: "Product data file" },
  "product-attribute": { ru: "Характеристика товара", en: "Product detail field" },
  sku: { ru: "Код варианта товара", en: "Product variant code" },
  "product-card": { ru: "Страница одного товара", en: "Single product page" },
  "rich-content": { ru: "Расширенное описание товара", en: "Enhanced product content" },
  "ab-testing": { ru: "Сравнение двух вариантов", en: "Compare two versions" },
  "acceptance-criterion": { ru: "Условие готовой работы", en: "Definition of done" },
};

const MATCH_ALIASES: Readonly<Record<string, Readonly<Partial<Record<Locale, readonly string[]>>>>> = {
  "http-status": {
    ru: ["HTTP 2xx", "HTTP 200", "код ответа", "коды ответа"],
    en: ["HTTP 2xx", "HTTP 200", "HTTP status", "status code"],
  },
  indexing: {
    ru: ["индексация", "индексации", "индексацию"],
  },
  lighthouse: {
    ru: ["Lighthouse", "оценка Lighthouse"],
    en: ["Lighthouse", "Lighthouse score"],
  },
  "search-crawler": {
    ru: ["поисковый робот", "поискового робота", "поисковым роботом"],
  },
  "robots-txt": {
    ru: ["robots.txt", "файл robots.txt"],
    en: ["robots.txt", "robots.txt file"],
  },
  url: {
    ru: ["URL", "URL-адрес"],
    en: ["URL", "web URL"],
  },
};

export type GlossaryLinkEntry = {
  slug: string;
  term: string;
  tooltip: string;
  aliases: readonly string[];
};

export type GlossaryTextMatch = GlossaryLinkEntry & {
  start: number;
  end: number;
};

export function getGlossaryLinkEntries(locale: Locale): GlossaryLinkEntry[] {
  return glossaryTerms.map((term) => {
    const localizedAliases = MATCH_ALIASES[term.slug]?.[locale] ?? [];
    return {
      slug: term.slug,
      term: term[locale].term,
      tooltip: GLOSSARY_TOOLTIPS[term.slug]?.[locale] ?? "",
      aliases: uniqueStrings([term[locale].term, ...localizedAliases]),
    };
  });
}

export function countTooltipWords(value: string): number {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}

/**
 * Find at most one non-overlapping occurrence of each term in a semantic text
 * block. The earliest match wins; a longer alias wins when two terms start at
 * the same character (for example “Internal linking” over “Internal link”).
 */
export function findGlossaryTextMatches(
  value: string,
  entries: readonly GlossaryLinkEntry[],
  locale: Locale,
): GlossaryTextMatch[] {
  const matches: GlossaryTextMatch[] = [];
  const used = new Set<string>();
  let cursor = 0;

  while (cursor < value.length) {
    let next: GlossaryTextMatch | null = null;

    for (const entry of entries) {
      if (used.has(entry.slug)) continue;
      for (const alias of entry.aliases) {
        const candidate = findAlias(value, alias, cursor, locale);
        if (!candidate) continue;
        if (
          next === null
          || candidate.start < next.start
          || (candidate.start === next.start && candidate.end - candidate.start > next.end - next.start)
        ) {
          next = { ...entry, ...candidate };
        }
      }
    }

    if (!next) break;
    matches.push(next);
    used.add(next.slug);
    cursor = next.end;
  }

  return matches;
}

export function buildGlossaryReturnTarget(pathname: string, sourceId: string): string | null {
  if (!isSafeSourceId(sourceId)) return null;
  if (!isSafePublicPath(pathname)) return null;
  return `${normalizePublicPath(pathname)}#${sourceId}`;
}

export function sanitizeGlossaryReturnTarget(value: string | null | undefined): string | null {
  if (!value || value.length > 500 || value.includes("\\") || /[\u0000-\u001f\u007f]/u.test(value)) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;

  let parsed: URL;
  try {
    parsed = new URL(value, "https://kileni-return.invalid");
  } catch {
    return null;
  }

  if (parsed.origin !== "https://kileni-return.invalid" || parsed.search) return null;
  let sourceId: string;
  try {
    sourceId = decodeURIComponent(parsed.hash.slice(1));
  } catch {
    return null;
  }
  if (!isSafeSourceId(sourceId)) return null;
  if (!isSafePublicPath(parsed.pathname)) return null;
  return `${normalizePublicPath(parsed.pathname)}${parsed.hash}`;
}

export function buildGlossaryHref(locale: Locale, slug: string, returnTarget: string): string {
  const safeReturnTarget = sanitizeGlossaryReturnTarget(returnTarget);
  const path = glossaryDetailPath(locale, slug);
  if (!safeReturnTarget) return path;
  return `${path}?${new URLSearchParams({ from: safeReturnTarget }).toString()}`;
}

function findAlias(
  value: string,
  alias: string,
  cursor: number,
  locale: Locale,
): { start: number; end: number } | null {
  const localeName = locale === "ru" ? "ru-RU" : "en-GB";
  const haystack = value.toLocaleLowerCase(localeName);
  const needle = alias.toLocaleLowerCase(localeName);
  let start = haystack.indexOf(needle, cursor);

  while (start >= 0) {
    const end = start + needle.length;
    if (hasTermBoundaries(value, start, end, alias)) return { start, end };
    start = haystack.indexOf(needle, start + 1);
  }
  return null;
}

function hasTermBoundaries(value: string, start: number, end: number, alias: string): boolean {
  const first = alias[0] ?? "";
  const last = alias.at(-1) ?? "";
  const before = start > 0 ? value[start - 1] : "";
  const after = end < value.length ? value[end] : "";
  if (isWordCharacter(first) && isWordCharacter(before)) return false;
  if (isWordCharacter(last) && isWordCharacter(after)) return false;
  return true;
}

function isWordCharacter(value: string): boolean {
  return /[\p{L}\p{N}_]/u.test(value);
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((left, right) => right.length - left.length);
}

function isSafeSourceId(value: string): boolean {
  return /^glossary-source-\d+$/u.test(value);
}

function isSafePublicPath(value: string): boolean {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return false;
  const normalized = normalizePublicPath(value);
  if (normalized.startsWith("/audit/") || normalized.startsWith("/en/audit/")) {
    return /^\/(?:en\/)?audit\/[A-Za-z0-9_-]{20,256}$/u.test(normalized);
  }
  return ![
    "/admin",
    "/api",
    "/_next",
    "/audit",
    "/en/audit",
    "/glossary",
    "/en/glossary",
  ].some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
}

function normalizePublicPath(value: string): string {
  const path = value.split(/[?#]/u, 1)[0] || "/";
  return path.startsWith("/") ? path : `/${path}`;
}
