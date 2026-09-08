import type {
  AuditCategory,
  AuditIssueSeverity,
  PageAnalysis,
  PerformanceAuditInput,
  RobotsInfo,
  SitemapInfo,
} from "./types";
import { auditCheckCopy } from "./report-content";
import { normalizeTargetUrl } from "./url";

export type AuditCheckStatusV2 =
  | "pass"
  | "warning"
  | "fail"
  | "not_run"
  | "insufficient_data";

export interface AuditCheckEvidenceV2 {
  readonly url: string;
  readonly observation: string;
}

export interface AuditCheckDefinitionV2 {
  readonly checkId: string;
  readonly checkVersion: number;
  readonly category: AuditCategory;
  readonly title: string;
  readonly expected: string;
  readonly severity: AuditIssueSeverity;
  readonly source: "page" | "discovery" | "lighthouse" | "target";
  readonly automationLimit: string;
}

export interface AuditCheckResultV2 {
  readonly checkId: string;
  readonly checkVersion: number;
  readonly category: AuditCategory;
  readonly title: string;
  readonly status: AuditCheckStatusV2;
  readonly value: unknown;
  readonly expected: string;
  readonly severity: AuditIssueSeverity;
  readonly urlEvidence: readonly AuditCheckEvidenceV2[];
  readonly explanation: string;
  readonly automationLimit: string;
}

export interface EvaluateAuditChecksV2Input {
  readonly targetUrl: string | URL;
  readonly pages: readonly PageAnalysis[];
  readonly robots?: RobotsInfo | null;
  readonly sitemap?: SitemapInfo | null;
  readonly performance?: PerformanceAuditInput | null;
}

const PAGE_LIMIT = "Вывод относится только к выбранным и успешно загруженным публичным страницам.";
const DISCOVERY_LIMIT = "Проверяется публичный ответ файла; данные кабинетов поисковых систем недоступны.";
const LIGHTHOUSE_LIMIT = "Метрика доступна только когда отдельный запуск Lighthouse завершился корректно.";

function definition(
  checkId: string,
  category: AuditCategory,
  title: string,
  expected: string,
  severity: AuditIssueSeverity,
  source: AuditCheckDefinitionV2["source"],
  automationLimit: string,
): AuditCheckDefinitionV2 {
  const copy = auditCheckCopy("ru", { checkId, status: "pass", title, expected, automationLimit });
  return { checkId, checkVersion: 1, category, title: copy.title, expected: copy.expected, severity, source, automationLimit: copy.automationLimit };
}

/** The versioned list of checks the current engine can actually evaluate. */
export const AUDIT_CHECK_REGISTRY_V2: readonly AuditCheckDefinitionV2[] = Object.freeze([
  definition("status", "technicalIndexing", "Ответы страниц", "Каждая выбранная страница отвечает HTTP 2xx.", "critical", "page", PAGE_LIMIT),
  definition("indexable", "technicalIndexing", "Разрешение на индексацию", "На страницах нет запрета noindex.", "high", "page", PAGE_LIMIT),
  definition("canonical", "technicalIndexing", "Основной адрес страницы", "Canonical корректен и указывает на проверяемую страницу.", "medium", "page", PAGE_LIMIT),
  definition("robots-access", "technicalIndexing", "Доступ в robots.txt", "Правила robots.txt не запрещают обход главной страницы.", "high", "discovery", DISCOVERY_LIMIT),
  definition("robots-file", "technicalIndexing", "Файл robots.txt", "Файл robots.txt доступен и читается.", "low", "discovery", DISCOVERY_LIMIT),
  definition("sitemap", "technicalIndexing", "Карта сайта XML", "Найдена читаемая карта сайта с URL.", "medium", "discovery", DISCOVERY_LIMIT),
  definition("charset", "technicalIndexing", "Кодировка текста", "На каждой странице явно указана кодировка.", "medium", "page", PAGE_LIMIT),
  definition("titles", "structureOnPage", "Заголовки для выдачи", "У каждой страницы есть понятный title длиной 30–60 символов.", "high", "page", PAGE_LIMIT),
  definition("title-uniqueness", "structureOnPage", "Уникальность title", "У выбранных страниц разные title.", "medium", "page", PAGE_LIMIT),
  definition("h1", "structureOnPage", "Главный заголовок", "На каждой странице ровно один H1.", "high", "page", PAGE_LIMIT),
  definition("heading-hierarchy", "structureOnPage", "Порядок подзаголовков", "Уровни заголовков идут без пропусков.", "low", "page", PAGE_LIMIT),
  definition("internal-links", "structureOnPage", "Внутренние переходы", "На странице есть полезные ссылки на другие разделы сайта.", "medium", "page", PAGE_LIMIT),
  definition("broken-internal-links", "structureOnPage", "Работа внутренних ссылок", "Проверенные внутренние ссылки не ведут на ошибку.", "high", "page", "Проверяются только цели, которые также вошли в выбранную выборку."),
  definition("language", "structureOnPage", "Язык документа", "В HTML каждой страницы указан язык.", "low", "page", PAGE_LIMIT),
  definition("performance", "performanceMobile", "Оценка скорости Lighthouse", "Lighthouse Performance не ниже 90.", "medium", "lighthouse", LIGHTHOUSE_LIMIT),
  definition("fcp", "performanceMobile", "Появление первого содержимого", "First Contentful Paint не больше 1,8 секунды.", "low", "lighthouse", LIGHTHOUSE_LIMIT),
  definition("lcp", "performanceMobile", "Появление основного содержимого", "Largest Contentful Paint не больше 2,5 секунды.", "high", "lighthouse", LIGHTHOUSE_LIMIT),
  definition("cls", "performanceMobile", "Сдвиги элементов", "Cumulative Layout Shift не больше 0,1.", "medium", "lighthouse", LIGHTHOUSE_LIMIT),
  definition("tbt", "performanceMobile", "Блокировка интерфейса", "Total Blocking Time не больше 200 мс.", "medium", "lighthouse", LIGHTHOUSE_LIMIT),
  definition("accessibility", "performanceMobile", "Доступность Lighthouse", "Lighthouse Accessibility не ниже 90.", "medium", "lighthouse", LIGHTHOUSE_LIMIT),
  definition("viewport", "performanceMobile", "Отображение на телефоне", "На каждой странице задан mobile viewport.", "high", "page", PAGE_LIMIT),
  definition("https", "trustStructuredData", "Защищённое соединение", "Проверяемый адрес использует HTTPS.", "high", "target", "Проверяется только протокол указанного публичного адреса."),
  definition("mixed-content", "trustStructuredData", "Ресурсы по HTTPS", "HTTPS-страницы не загружают ресурсы по HTTP.", "high", "page", PAGE_LIMIT),
  definition("security-headers", "trustStructuredData", "Защитные заголовки", "Сервер передаёт шесть базовых защитных HTTP-заголовков.", "medium", "page", PAGE_LIMIT),
  definition("json-ld", "trustStructuredData", "Машиночитаемые данные", "Подходящая JSON-LD-разметка существует и не содержит синтаксических ошибок.", "medium", "page", "Автоматическая проверка подтверждает наличие и синтаксис, но не достоверность заявленных данных."),
  definition("open-graph", "trustStructuredData", "Превью ссылок", "Заполнены og:title, og:description, og:image и og:url.", "low", "page", PAGE_LIMIT),
  definition("descriptions", "contentImages", "Описания для выдачи", "У каждой страницы есть meta description длиной 70–160 символов.", "medium", "page", PAGE_LIMIT),
  definition("content-depth", "contentImages", "Объём видимого содержания", "На странице достаточно видимого текста для её задачи.", "low", "page", "Количество слов не оценивает полезность, точность или экспертность текста."),
  definition("image-alt", "contentImages", "Описания изображений", "У каждого значимого изображения есть alt.", "medium", "page", "Пустой alt может быть корректен для декоративного изображения; смысл изображения автоматически не определяется."),
  definition("image-dimensions", "contentImages", "Зарезервированное место изображений", "Для изображений указаны width и height.", "low", "page", PAGE_LIMIT),
]);

export function evaluateAuditChecksV2(
  input: EvaluateAuditChecksV2Input,
): readonly AuditCheckResultV2[] {
  return AUDIT_CHECK_REGISTRY_V2.map((check) => evaluateCheck(check, input));
}

function evaluateCheck(
  check: AuditCheckDefinitionV2,
  input: EvaluateAuditChecksV2Input,
): AuditCheckResultV2 {
  switch (check.checkId) {
    case "status":
      return pageResult(check, input.pages, (page) => {
        if (page.status >= 200 && page.status < 300) return observation("pass", `HTTP ${page.status}`);
        if (page.status >= 300 && page.status < 400) return observation("warning", `HTTP ${page.status}`);
        return observation("fail", `HTTP ${page.status}`);
      });
    case "indexable":
      return pageResult(check, input.pages, (page) =>
        page.indexing.noindex
          ? observation("fail", "Найден запрет noindex")
          : observation("pass", "Запрета noindex нет"));
    case "canonical":
      return pageResult(check, input.pages, (page) => {
        if (!page.canonical.url || !page.canonical.valid) return observation("fail", "Canonical отсутствует или записан с ошибкой");
        if (page.canonical.selfReferential !== true) return observation("warning", `Canonical: ${page.canonical.url}`);
        return observation("pass", `Canonical: ${page.canonical.url}`);
      });
    case "robots-access":
      if (!input.robots || input.robots.allowedRoot === null) return unavailable(check, "insufficient_data", "Не удалось подтвердить правила доступа robots.txt.");
      return result(check, input.robots.allowedRoot ? "pass" : "fail", input.robots.allowedRoot, [{ url: input.robots.url, observation: input.robots.allowedRoot ? "Обход главной страницы разрешён" : "Обход главной страницы запрещён" }]);
    case "robots-file":
      if (!input.robots || input.robots.status === "error") return unavailable(check, "insufficient_data", "Файл robots.txt не удалось прочитать.");
      return result(check, input.robots.status === "found" ? "pass" : "warning", input.robots.status, [{ url: input.robots.url, observation: input.robots.status === "found" ? `HTTP ${input.robots.httpStatus ?? 200}` : "Файл не найден" }]);
    case "sitemap":
      if (!input.sitemap || input.sitemap.status === "error") return unavailable(check, "insufficient_data", "Карту сайта не удалось прочитать.");
      return result(
        check,
        input.sitemap.status === "found" && input.sitemap.urls.length > 0 ? "pass" : "warning",
        { status: input.sitemap.status, urls: input.sitemap.urls.length, filesVisited: input.sitemap.filesVisited },
        [],
      );
    case "charset":
      return pageResult(check, input.pages, (page) => page.charset ? observation("pass", `Кодировка: ${page.charset}`) : observation("fail", "Кодировка не указана"));
    case "titles":
      return pageResult(check, input.pages, (page) => {
        if (!page.title.present) return observation("fail", "Title отсутствует");
        return page.title.optimal ? observation("pass", `Title: ${page.title.length} символов`) : observation("warning", `Title: ${page.title.length} символов`);
      });
    case "title-uniqueness":
      return titleUniquenessResult(check, input.pages);
    case "h1":
      return pageResult(check, input.pages, (page) => {
        if (page.h1.count === 0) return observation("fail", "H1 отсутствует");
        if (page.h1.count > 1) return observation("warning", `H1: ${page.h1.count}`);
        return observation("pass", "H1: 1");
      });
    case "heading-hierarchy":
      return pageResult(check, input.pages, (page) => page.headingStructure === undefined
        ? observation("insufficient_data", "Структура заголовков не была собрана")
        : page.headingStructure.hierarchyValid
          ? observation("pass", "Порядок уровней не нарушен")
          : observation("warning", "Найден пропуск уровня заголовка"));
    case "internal-links":
      return pageResult(check, input.pages, (page) => page.links.internalCount > 0
        ? observation("pass", `Внутренних ссылок: ${page.links.internalCount}`)
        : observation("warning", "Внутренние ссылки не найдены"));
    case "broken-internal-links":
      return internalLinkHealthResult(check, input.pages);
    case "language":
      return pageResult(check, input.pages, (page) => page.language.present
        ? observation("pass", `Язык: ${page.language.value ?? "указан"}`)
        : observation("fail", "Язык документа не указан"));
    case "performance":
      return lighthouseScoreResult(check, input.performance?.performance);
    case "fcp":
      return lighthouseTimingResult(check, input.performance?.fcpMs, 1_800, 3_000, "мс");
    case "lcp":
      return lighthouseTimingResult(check, input.performance?.lcpMs, 2_500, 4_000, "мс");
    case "cls":
      return lighthouseTimingResult(check, input.performance?.cls, 0.1, 0.25, "");
    case "tbt":
      return lighthouseTimingResult(check, input.performance?.tbtMs, 200, 600, "мс");
    case "accessibility":
      return lighthouseScoreResult(check, input.performance?.accessibility);
    case "viewport":
      return pageResult(check, input.pages, (page) => page.viewport ? observation("pass", "Viewport задан") : observation("fail", "Viewport отсутствует"));
    case "https": {
      const target = normalizeTargetUrl(input.targetUrl);
      return result(check, target.protocol === "https:" ? "pass" : "fail", target.protocol, [{ url: target.href, observation: `Протокол: ${target.protocol}` }]);
    }
    case "mixed-content":
      return pageResult(check, input.pages, (page) => page.mixedContent === undefined
        ? observation("insufficient_data", "Данные о подключаемых ресурсах не собраны")
        : page.mixedContent.count === 0
          ? observation("pass", "HTTP-ресурсы не найдены")
          : observation("fail", `HTTP-ресурсов: ${page.mixedContent.count}`));
    case "security-headers":
      return pageResult(check, input.pages, (page) => {
        const total = page.securityHeaders.present.length + page.securityHeaders.missing.length;
        if (total === 0) return observation("insufficient_data", "Защитные заголовки не были собраны");
        if (page.securityHeaders.missing.length === 0) return observation("pass", `Передано ${total} из ${total}`);
        if (page.securityHeaders.present.length >= page.securityHeaders.missing.length) return observation("warning", `Передано ${page.securityHeaders.present.length} из ${total}`);
        return observation("fail", `Передано ${page.securityHeaders.present.length} из ${total}`);
      });
    case "json-ld":
      return pageResult(check, input.pages, (page) => {
        if (page.structuredData.invalid > 0) return observation("fail", `Ошибочных блоков: ${page.structuredData.invalid}`);
        if (page.structuredData.total === 0) return observation("warning", "JSON-LD не найден");
        return observation("pass", `Корректных блоков: ${page.structuredData.valid}`);
      });
    case "open-graph":
      return pageResult(check, input.pages, (page) => {
        const fields = Math.round(page.openGraph.coverage * 4);
        if (page.openGraph.coverage >= 1) return observation("pass", `Заполнено ${fields} из 4 полей`);
        if (page.openGraph.coverage >= 0.5) return observation("warning", `Заполнено ${fields} из 4 полей`);
        return observation("fail", `Заполнено ${fields} из 4 полей`);
      });
    case "descriptions":
      return pageResult(check, input.pages, (page) => {
        if (!page.description.present) return observation("fail", "Meta description отсутствует");
        return page.description.optimal ? observation("pass", `Description: ${page.description.length} символов`) : observation("warning", `Description: ${page.description.length} символов`);
      });
    case "content-depth":
      return pageResult(check, input.pages, (page) => page.content === undefined
        ? observation("insufficient_data", "Видимый текст не был собран")
        : page.content.thin
          ? observation("warning", `Примерно слов: ${page.content.wordCount}`)
          : observation("pass", `Примерно слов: ${page.content.wordCount}`));
    case "image-alt":
      return pageResult(check, input.pages, (page) => {
        if (page.images.total === 0) return observation("pass", "Изображений нет");
        if (page.images.missingAlt === 0) return observation("pass", `С alt: ${page.images.withAlt} из ${page.images.total}`);
        if (page.images.missingAlt < page.images.total) return observation("warning", `Без alt: ${page.images.missingAlt} из ${page.images.total}`);
        return observation("fail", `Без alt: ${page.images.missingAlt} из ${page.images.total}`);
      });
    case "image-dimensions":
      return pageResult(check, input.pages, (page) => {
        if (page.images.missingDimensions === undefined) return observation("insufficient_data", "Размеры изображений не были собраны");
        if (page.images.total === 0 || page.images.missingDimensions === 0) return observation("pass", "У всех изображений зарезервировано место");
        if (page.images.missingDimensions < page.images.total) return observation("warning", `Без размеров: ${page.images.missingDimensions} из ${page.images.total}`);
        return observation("fail", `Без размеров: ${page.images.missingDimensions} из ${page.images.total}`);
      });
    default:
      return unavailable(check, "insufficient_data", "Для проверки нет обработчика текущей версии движка.");
  }
}

interface PageObservation {
  readonly status: AuditCheckStatusV2;
  readonly observation: string;
}

function observation(status: AuditCheckStatusV2, text: string): PageObservation {
  return { status, observation: text };
}

function pageResult(
  check: AuditCheckDefinitionV2,
  pages: readonly PageAnalysis[],
  inspect: (page: PageAnalysis) => PageObservation,
): AuditCheckResultV2 {
  if (pages.length === 0) {
    return unavailable(check, "insufficient_data", "Нет успешно загруженных страниц для этой проверки.");
  }
  const observations = pages.map((page) => ({ page, ...inspect(page) }));
  const status = aggregateStatus(observations.map((item) => item.status));
  const passing = observations.filter((item) => item.status === "pass").length;
  const evidencePool = observations.filter((item) => item.status !== "pass");
  const evidence = (evidencePool.length > 0 ? evidencePool : observations.slice(0, 1)).map((item) => ({
    url: item.page.url,
    observation: item.observation,
  }));
  return result(check, status, { passing, checked: pages.length }, evidence);
}

function titleUniquenessResult(
  check: AuditCheckDefinitionV2,
  pages: readonly PageAnalysis[],
): AuditCheckResultV2 {
  if (pages.length < 2) return unavailable(check, "insufficient_data", "Для сравнения title нужны минимум две страницы.");
  if (pages.some((page) => !page.title.value)) return unavailable(check, "insufficient_data", "Не на всех страницах есть title для сравнения.");
  const groups = groupBy(pages, (page) => page.title.value?.trim().toLocaleLowerCase("ru") ?? "");
  const duplicates = [...groups.values()].filter((group) => group.length > 1);
  return result(
    check,
    duplicates.length === 0 ? "pass" : "fail",
    { unique: groups.size, checked: pages.length, duplicateGroups: duplicates.length },
    duplicates.flatMap((group) => group.map((page) => ({ url: page.url, observation: `Повторяется title: ${page.title.value ?? ""}` }))),
  );
}

function internalLinkHealthResult(
  check: AuditCheckDefinitionV2,
  pages: readonly PageAnalysis[],
): AuditCheckResultV2 {
  if (pages.length === 0) return unavailable(check, "insufficient_data", "Нет страниц для проверки внутренних ссылок.");
  const targets = new Map<string, PageAnalysis>();
  for (const page of pages) {
    targets.set(normalizeComparableUrl(page.url), page);
    if (page.transport?.requestedUrl) targets.set(normalizeComparableUrl(page.transport.requestedUrl), page);
  }
  const observedTargets = pages.flatMap((page) => page.links.internalUrls)
    .map((url) => targets.get(normalizeComparableUrl(url)))
    .filter((page): page is PageAnalysis => page !== undefined);
  if (observedTargets.length === 0) {
    return unavailable(check, "insufficient_data", "Цели внутренних ссылок не попали в выбранную выборку.");
  }
  const broken = observedTargets.filter((page) => page.status < 200 || page.status >= 400);
  const redirected = observedTargets.filter((page) => (page.transport?.redirects.length ?? 0) > 0);
  const status: AuditCheckStatusV2 = broken.length > 0 ? "fail" : redirected.length > 0 ? "warning" : "pass";
  return result(check, status, { observed: observedTargets.length, broken: broken.length, redirected: redirected.length }, [
    ...broken.map((page) => ({ url: page.url, observation: `HTTP ${page.status}` })),
    ...redirected.map((page) => ({ url: page.url, observation: `Переходов: ${page.transport?.redirects.length ?? 0}` })),
  ]);
}

function lighthouseScoreResult(
  check: AuditCheckDefinitionV2,
  rawValue: number | null | undefined,
): AuditCheckResultV2 {
  if (rawValue === null || rawValue === undefined) return unavailable(check, "not_run", "Эта проверка Lighthouse не запускалась.");
  if (!Number.isFinite(rawValue) || rawValue < 0) return unavailable(check, "insufficient_data", "Lighthouse вернул некорректное значение.");
  const value = rawValue <= 1 ? rawValue * 100 : rawValue;
  const status: AuditCheckStatusV2 = value >= 90 ? "pass" : value >= 50 ? "warning" : "fail";
  return result(check, status, Math.round(value * 10) / 10, []);
}

function lighthouseTimingResult(
  check: AuditCheckDefinitionV2,
  value: number | null | undefined,
  good: number,
  poor: number,
  unit: string,
): AuditCheckResultV2 {
  if (value === null || value === undefined) return unavailable(check, "not_run", "Эта проверка Lighthouse не запускалась.");
  if (!Number.isFinite(value) || value < 0) return unavailable(check, "insufficient_data", "Lighthouse вернул некорректное значение.");
  const status: AuditCheckStatusV2 = value <= good ? "pass" : value <= poor ? "warning" : "fail";
  return result(check, status, value, [{ url: "lighthouse://landing-page", observation: `${value}${unit ? ` ${unit}` : ""}` }]);
}

function aggregateStatus(statuses: readonly AuditCheckStatusV2[]): AuditCheckStatusV2 {
  if (statuses.includes("fail")) return "fail";
  if (statuses.includes("warning")) return "warning";
  if (statuses.includes("insufficient_data")) return "insufficient_data";
  if (statuses.includes("not_run")) return "not_run";
  return "pass";
}

function result(
  check: AuditCheckDefinitionV2,
  status: AuditCheckStatusV2,
  value: unknown,
  urlEvidence: readonly AuditCheckEvidenceV2[],
  explanation?: string,
): AuditCheckResultV2 {
  const copy = auditCheckCopy("ru", {
    checkId: check.checkId,
    status,
    value,
    title: check.title,
    expected: check.expected,
    explanation,
    automationLimit: check.automationLimit,
    urlEvidence,
  });
  return {
    checkId: check.checkId,
    checkVersion: check.checkVersion,
    category: check.category,
    title: copy.title,
    status,
    value,
    expected: copy.expected,
    severity: check.severity,
    urlEvidence,
    explanation: copy.explanation,
    automationLimit: copy.automationLimit,
  };
}

function unavailable(
  check: AuditCheckDefinitionV2,
  status: Extract<AuditCheckStatusV2, "not_run" | "insufficient_data">,
  explanation: string,
): AuditCheckResultV2 {
  return result(check, status, null, [], explanation);
}

function normalizeComparableUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.href;
  } catch {
    return value;
  }
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
