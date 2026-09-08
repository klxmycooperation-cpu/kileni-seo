import type { ClassifiedAuditObject } from "./classification";
import type {
  AuditCategory,
  PageAnalysis,
  PerformanceAuditInput,
  RobotsInfo,
  SitemapInfo,
} from "./types";

export type AuditCheckScopeV3 = "site" | "resource" | "page";
export type AuditCheckStatusV3 =
  | "pass"
  | "warning"
  | "fail"
  | "not_applicable"
  | "not_run"
  | "insufficient_data";

export type AuditCheckSeverityV3 = "critical" | "high" | "medium" | "low" | "info";

export interface AuditCheckEvidenceV3 {
  readonly url?: string;
  readonly observation: string;
}

export interface AuditCheckResultV3 {
  readonly checkId: string;
  readonly version: number;
  readonly title: string;
  readonly category: AuditCategory;
  readonly scope: AuditCheckScopeV3;
  readonly status: AuditCheckStatusV3;
  readonly severity: AuditCheckSeverityV3 | null;
  readonly targetUrl?: string;
  readonly reason: string;
  readonly publicExplanation: string;
  readonly automationLimit: string;
  readonly evidence: readonly AuditCheckEvidenceV3[];
}

export interface AuditChecksV3Input {
  readonly targetUrl: string | URL;
  readonly objects: readonly ClassifiedAuditObject[];
  readonly pages: readonly PageAnalysis[];
  readonly robots?: RobotsInfo | null;
  readonly sitemap?: SitemapInfo | null;
  readonly performance?: PerformanceAuditInput | null;
}

interface CheckTargetV3 {
  readonly input: AuditChecksV3Input;
  readonly object?: ClassifiedAuditObject;
  readonly page?: PageAnalysis;
}

interface ApplicabilityV3 {
  readonly applies: boolean;
  readonly reason?: string;
}

interface RunResultV3 {
  readonly status: Exclude<AuditCheckStatusV3, "not_applicable">;
  readonly severity?: AuditCheckSeverityV3 | null;
  readonly reason: string;
  readonly evidence?: readonly AuditCheckEvidenceV3[];
}

export interface AuditCheckDefinitionV3 {
  readonly checkId: string;
  readonly version: number;
  readonly title: string;
  readonly category: AuditCategory;
  readonly scope: AuditCheckScopeV3;
  readonly appliesTo: (context: CheckTargetV3) => ApplicabilityV3;
  readonly run: (context: CheckTargetV3) => RunResultV3;
  readonly severityRules: string;
  readonly publicExplanation: string;
  readonly automationLimit: string;
}

const applies = (): ApplicabilityV3 => ({ applies: true });
const notApplicable = (reason: string): ApplicabilityV3 => ({ applies: false, reason });
const allResources = (context: CheckTargetV3): ApplicabilityV3 =>
  context.object && context.object.resourceType !== "html" ? applies() : notApplicable("Проверка относится к техническим файлам");
const resource = (type: ClassifiedAuditObject["resourceType"]) => (context: CheckTargetV3): ApplicabilityV3 =>
  context.object?.resourceType === type ? applies() : notApplicable(`Проверка относится только к ресурсу ${type}`);
const anyHtml = (context: CheckTargetV3): ApplicabilityV3 =>
  context.object?.resourceType === "html" && context.page ? applies() : notApplicable("Проверка относится только к HTML-страницам");
const seoPage = (context: CheckTargetV3): ApplicabilityV3 => {
  if (!context.object || !context.page) return notApplicable("HTML-страница не загружена");
  if (["auth", "account", "cart", "internal_search", "filter", "legal", "utility"].includes(context.object.pageType ?? "")) {
    return notApplicable("Страница служебная и не получает коммерческие SEO-рекомендации");
  }
  if (context.object.pageType === "unknown" && context.object.classificationConfidence < 0.6) {
    return notApplicable("Тип страницы не определён с достаточной уверенностью");
  }
  return applies();
};
const publicIndexablePage = (context: CheckTargetV3): ApplicabilityV3 => {
  if (!context.object || !context.page) return notApplicable("HTML-страница не загружена");
  if (["auth", "account", "cart", "internal_search", "filter", "legal"].includes(context.object.pageType ?? "")) {
    return notApplicable("Страница служебная и не получает рекомендацию по индексированию");
  }
  return applies();
};

const definitions: AuditCheckDefinitionV3[] = [
  site("https", "Защищённое соединение", "technicalIndexing", (context) => {
    const secure = new URL(context.input.targetUrl).protocol === "https:";
    return result(secure ? "pass" : "fail", secure ? "Сайт открывается по HTTPS" : "Сайт открыт без HTTPS", secure ? null : "high");
  }, "Проверяет протокол стартового адреса.", "Не проверяет срок действия сертификата во всех браузерах."),
  site("host-redirects", "Единый адрес сайта", "technicalIndexing", (context) => {
    const root = context.input.pages[0];
    if (!root) return result("insufficient_data", "Стартовая HTML-страница не загружена");
    return result("pass", root.transport?.redirects.length ? "Переадресация завершилась на одном рабочем адресе" : "Лишняя цепочка переадресаций не обнаружена");
  }, "Проверяет сохранённую цепочку переходов стартовой страницы.", "Не перебирает все варианты поддоменов и протоколов."),
  site("site-access", "Общая доступность", "technicalIndexing", (context) => {
    const pages = context.input.pages;
    if (pages.length === 0) return result("fail", "Не удалось загрузить ни одной выбранной страницы", "high");
    const failed = pages.filter((page) => page.status >= 400);
    return result(failed.length ? "fail" : "pass", failed.length ? `Ошибку ответа вернули страниц: ${failed.length}` : "Выбранные страницы отвечают без HTTP-ошибок", failed.length ? "high" : null, evidence(failed, (page) => `Код ответа ${page.status}`));
  }, "Проверяет HTTP-ответы выбранных страниц.", "Вывод относится только к выбранной выборке."),
  site("robots-access", "Правила обхода сайта", "technicalIndexing", (context) => {
    const robots = context.input.robots;
    if (!robots) return result("not_run", "robots.txt не проверялся");
    if (robots.status !== "found") return result("warning", "robots.txt отсутствует или недоступен", "low");
    if (robots.allowedRoot === false) return result("fail", "robots.txt запрещает обход главной страницы", "high");
    return result("pass", "robots.txt не запрещает обход главной страницы");
  }, "Проверяет правило обхода для главной страницы.", "Не подтверждает фактический обход поисковым роботом."),
  site("robots-important-pages", "Страницы, закрытые в robots.txt", "technicalIndexing", (context) => {
    if (context.input.robots?.status !== "found") return result("not_run", "robots.txt не прочитан");
    const blocked = context.input.objects.filter((item) =>
      item.resourceType === "html" && item.indexabilitySignals.includes("robots_blocked")
    );
    return result(
      blocked.length ? "fail" : "pass",
      blocked.length ? `В robots.txt закрыто адресов из найденного списка: ${blocked.length}` : "Среди найденных HTML-адресов блокировки в robots.txt не обнаружены",
      blocked.length ? "high" : null,
      blocked.slice(0, 3).map((item) => ({ url: item.finalUrl, observation: "Обход запрещён правилом robots.txt" })),
    );
  }, "Сопоставляет найденные HTML-адреса с правилами robots.txt.", "Запрет обхода не равен подтверждённому удалению страницы из поиска."),
  site("language-versions", "Языковые версии", "structureOnPage", (context) => {
    const languages = new Set(context.input.objects.filter((item) => item.resourceType === "html").map((item) => item.language).filter(Boolean));
    return result("pass", languages.size > 1 ? `Обнаружены языковые версии: ${[...languages].join(", ")}` : "Обнаружен один язык страниц");
  }, "Считает языки классифицированных HTML-страниц.", "Не подтверждает правильность регионального таргетинга."),
  external("actual-index", "Фактическое наличие страниц в поиске", "technicalIndexing", "Без Яндекс Вебмастера или Search Console нельзя подтвердить фактическую индексацию."),
  external("search-positions", "Позиции в поиске", "technicalIndexing", "Без поискового кабинета и списка запросов нельзя подтвердить позиции."),
  external("impressions-ctr", "Показы и переходы из поиска", "trustStructuredData", "Без поискового кабинета нельзя подтвердить показы и долю переходов."),
  external("traffic", "Посещаемость", "trustStructuredData", "Без системы аналитики нельзя подтвердить посещаемость."),

  resourceCheck("resource-status", "Ответ технического файла", "technicalIndexing", allResources, ({ object }) => {
    if (!object || object.statusCode === null) return result("not_run", "Ресурс не запрашивался, поэтому код ответа не сохранён");
    const ok = object.statusCode >= 200 && object.statusCode < 400;
    return result(ok ? "pass" : "warning", `Код ответа ${object.statusCode}`, ok ? null : "low", [{ url: object.finalUrl, observation: `Код ответа ${object.statusCode}` }]);
  }, "Проверяет сохранённый HTTP-код ресурса.", "Не проверяет историю доступности."),
  resourceCheck("resource-content-type", "Тип технического файла", "technicalIndexing", allResources, ({ object }) => {
    if (!object || object.statusCode === null) return result("not_run", "Ресурс не запрашивался, поэтому Content-Type не проверялся");
    if (!object?.contentType) return result("warning", "Сервер не указал Content-Type", "low");
    return result("pass", `Сервер указал ${object.contentType}`);
  }, "Сравнивает HTTP Content-Type с классификацией ресурса.", "Не проверяет содержимое бинарных файлов."),
  resourceCheck("robots-file", "Файл robots.txt", "technicalIndexing", resource("robots"), (context) => {
    const robots = context.input.robots;
    if (!robots) return result("not_run", "robots.txt не запрашивался");
    if (robots.status === "missing") return result("warning", "robots.txt не найден. Само по себе это не критическая ошибка", "low");
    if (robots.status === "error") return result("warning", robots.error ?? "robots.txt недоступен", "medium");
    return result("pass", "robots.txt найден и разобран как управляющий файл сайта");
  }, "Проверяет расположение и HTTP-ответ /robots.txt.", "Отсутствие файла не считается критической ошибкой автоматически."),
  resourceCheck("robots-syntax", "Содержимое robots.txt", "technicalIndexing", resource("robots"), (context) => {
    const robots = context.input.robots;
    if (robots?.status !== "found" || robots.body === undefined) return result("not_run", "Содержимое robots.txt недоступно");
    const hasGroup = /^\s*user-agent\s*:/imu.test(robots.body);
    return result(hasGroup ? "pass" : "warning", hasGroup ? "Найдена группа User-agent" : "Не найдена группа User-agent", hasGroup ? null : "low");
  }, "Ищет группы User-agent и основные директивы.", "Не моделирует поведение каждого поискового робота."),
  resourceCheck("robots-size", "Размер robots.txt", "technicalIndexing", resource("robots"), (context) => {
    const robots = context.input.robots;
    if (robots?.status !== "found" || robots.sizeBytes === undefined) return result("not_run", "Размер robots.txt не сохранён");
    const tooLarge = robots.sizeBytes > 500 * 1024;
    return result(tooLarge ? "warning" : "pass", tooLarge ? `Размер robots.txt: ${robots.sizeBytes} байт` : `Размер robots.txt: ${robots.sizeBytes} байт`, tooLarge ? "medium" : null);
  }, "Проверяет, что файл не превышает практический предел 500 КБ.", "Лимиты конкретных роботов могут отличаться."),
  resourceCheck("sitemap-file", "Файл sitemap", "technicalIndexing", resource("sitemap"), (context) => {
    const sitemap = context.input.sitemap;
    if (!sitemap) return result("not_run", "sitemap не проверялся");
    if (sitemap.status === "missing") return result("warning", "sitemap не найден", "medium");
    if (sitemap.status === "error") return result("warning", sitemap.errors[0] ?? "sitemap не удалось прочитать", "medium");
    return result("pass", `В sitemap обнаружено URL: ${sitemap.urls.length}`);
  }, "Проверяет доступность sitemap и количество URL.", "Наличие URL в sitemap не подтверждает фактическую индексацию."),
  resourceCheck("sitemap-hosts", "Адреса в sitemap", "technicalIndexing", resource("sitemap"), (context) => {
    const sitemap = context.input.sitemap;
    if (sitemap?.status !== "found") return result("not_run", "sitemap не прочитан");
    const foreign = sitemap.foreignUrls ?? [];
    return result(foreign.length ? "warning" : "pass", foreign.length ? `Найдены адреса другого сайта: ${foreign.length}` : "Все сохранённые адреса относятся к проверяемому сайту", foreign.length ? "medium" : null, foreign.slice(0, 3).map((url) => ({ url, observation: "Другой host" })));
  }, "Сравнивает host URL из sitemap с проверяемым сайтом.", "Проверяются только сохранённые адреса."),
  resourceCheck("sitemap-duplicates", "Повторы в sitemap", "technicalIndexing", resource("sitemap"), (context) => {
    const duplicates = context.input.sitemap?.duplicateUrls ?? [];
    return result(duplicates.length ? "warning" : "pass", duplicates.length ? `Повторяющихся адресов: ${duplicates.length}` : "Повторяющиеся адреса не найдены", duplicates.length ? "low" : null, duplicates.slice(0, 3).map((url) => ({ url, observation: "URL указан повторно" })));
  }, "Ищет одинаковые URL внутри прочитанных sitemap.", "Сравнение выполняется после нормализации адресов."),
  resourceCheck("sitemap-invalid-urls", "Корректность адресов sitemap", "technicalIndexing", resource("sitemap"), (context) => {
    const invalid = context.input.sitemap?.invalidUrls ?? [];
    return result(invalid.length ? "warning" : "pass", invalid.length ? `Некорректных адресов: ${invalid.length}` : "Некорректные адреса не найдены", invalid.length ? "medium" : null, invalid.slice(0, 3).map((url) => ({ observation: url })));
  }, "Проверяет, что loc содержит абсолютный HTTP- или HTTPS-адрес.", "Не проверяет содержимое страницы по некорректному адресу."),

  pageCheck("page-http", "Ответ страницы", "technicalIndexing", anyHtml, ({ page }) => {
    if (!page) return result("not_run", "Страница не загружена");
    const ok = page.status >= 200 && page.status < 300;
    return result(ok ? "pass" : "fail", `Код ответа ${page.status}`, ok ? null : "high", [{ url: page.url, observation: `Код ответа ${page.status}` }]);
  }, "Проверяет HTTP-код HTML-страницы.", "Не подтверждает доступность страницы в другое время."),
  pageCheck("indexability", "Техническая доступность для поиска", "technicalIndexing", publicIndexablePage, ({ page, object }) => {
    if (!page || !object) return result("not_run", "Страница не загружена");
    if (object.indexabilitySignals.includes("robots_blocked")) return result("fail", "robots.txt запрещает обход этой страницы", "high", [{ url: page.url, observation: "Disallow в robots.txt" }]);
    if (page.indexing.noindex) return result("fail", "На странице найдено правило noindex", "high", [{ url: page.url, observation: "meta robots: noindex" }]);
    return result("pass", "В HTML не найден запрет noindex. Фактическое наличие в поиске без кабинета не подтверждается");
  }, "Проверяет noindex и доступный HTML выбранной страницы.", "Не подтверждает фактическое наличие страницы в индексе."),
  pageCheck("canonical", "Основной адрес страницы", "structureOnPage", seoPage, ({ page }) => {
    if (!page) return result("not_run", "Страница не загружена");
    if (!page.canonical.url) return result("warning", "Основной адрес страницы не указан", "medium");
    if (!page.canonical.valid) return result("fail", "Основной адрес записан с ошибкой", "medium");
    return result(page.canonical.selfReferential === false ? "warning" : "pass", page.canonical.selfReferential === false ? "Основной адрес ведёт на другую страницу" : "Основной адрес указан корректно", page.canonical.selfReferential === false ? "medium" : null);
  }, "Проверяет canonical в HTML.", "Не определяет бизнес-причину выбора другого canonical."),
  pageCheck("title", "Заголовок для поисковой выдачи", "structureOnPage", seoPage, ({ page }) => textCheck(page?.title, "title", page?.url), "Проверяет наличие и длину title.", "Поисковик может сформировать другой заголовок."),
  pageCheck("description", "Описание для поисковой выдачи", "contentImages", seoPage, ({ page }) => textCheck(page?.description, "description", page?.url), "Проверяет наличие и длину meta description.", "Поисковик может сформировать другое описание."),
  pageCheck("h1", "Главный заголовок", "structureOnPage", seoPage, ({ page }) => {
    if (!page) return result("not_run", "Страница не загружена");
    if (page.h1.count === 0) return result("fail", "Главный заголовок H1 не найден", "medium", [{ url: page.url, observation: "Главный заголовок H1 не найден" }]);
    if (page.h1.count > 1) return result("warning", `Главных заголовков: ${page.h1.count}`, "low", [{ url: page.url, observation: `Главных заголовков: ${page.h1.count}` }]);
    return result("pass", "На странице один главный заголовок");
  }, "Считает H1 в загруженном HTML.", "Не оценивает визуальный смысл заголовка."),
  pageCheck("headings", "Порядок подзаголовков", "structureOnPage", seoPage, ({ page }) => {
    if (!page?.headingStructure) return result("insufficient_data", "Структура заголовков не сохранена");
    return result(page.headingStructure.hierarchyValid ? "pass" : "warning", page.headingStructure.hierarchyValid ? "Уровни заголовков идут последовательно" : "В уровнях заголовков есть пропуск", page.headingStructure.hierarchyValid ? null : "low");
  }, "Проверяет порядок H1–H6 в HTML.", "Не оценивает логическую полноту текста."),
  pageCheck("internal-links", "Ссылки внутри сайта", "structureOnPage", seoPage, ({ page }) => {
    if (!page) return result("not_run", "Страница не загружена");
    return result(page.links.internalCount > 0 ? "pass" : "warning", page.links.internalCount > 0 ? `Найдено внутренних ссылок: ${page.links.internalCount}` : "Внутренние ссылки не найдены", page.links.internalCount > 0 ? null : "low");
  }, "Считает обычные HTML-ссылки на тот же host.", "Не подтверждает ценность каждой ссылки."),
  pageCheck("language", "Язык страницы", "structureOnPage", anyHtml, ({ page }) => {
    if (!page) return result("not_run", "Страница не загружена");
    return result(page.language.present ? "pass" : "warning", page.language.present ? `Указан язык ${page.language.value}` : "Атрибут lang не найден", page.language.present ? null : "low");
  }, "Проверяет атрибут lang у html.", "Не определяет качество перевода."),
  pageCheck("hreflang", "Связи между языковыми версиями", "structureOnPage", (context) => {
    if (!context.object || !context.page) return notApplicable("HTML-страница не загружена");
    return (context.page.hreflang?.length ?? 0) > 0 || hasDetectedAlternatePage(context)
      ? applies()
      : notApplicable("Для этой страницы другая языковая версия не обнаружена");
  }, ({ page }) => {
    const alternates = page?.hreflang ?? [];
    return alternates.length > 0
      ? result("pass", `Указано языковых связей: ${alternates.length}`, null, alternates.slice(0, 3).map((item) => ({ url: item.url, observation: `Язык ${item.language}` })))
      : result("warning", "Обнаружены языковые версии, но на этой странице связи между ними не указаны", "low");
  }, "Запускается только при нескольких языковых версиях или найденной языковой разметке.", "Проверяет сохранённые ссылки, но не подтверждает их взаимность на всех страницах."),
  pageCheck("commercial-structured-data", "Разметка типа страницы", "trustStructuredData", seoPage, ({ page }) => {
    if (!page) return result("not_run", "Страница не загружена");
    if (page.structuredData.invalid > 0) return result("warning", `Блоков с ошибкой JSON: ${page.structuredData.invalid}`, "medium");
    return result(page.structuredData.valid > 0 ? "pass" : "warning", page.structuredData.valid > 0 ? `Корректных блоков: ${page.structuredData.valid}` : "Структурированные данные не найдены", page.structuredData.valid > 0 ? null : "low");
  }, "Проверяет JSON-LD на подходящих HTML-страницах.", "Не подтверждает право на расширенный результат в поиске."),
  pageCheck("product-schema", "Разметка товара", "trustStructuredData", (context) => context.object?.pageType === "product" ? applies() : notApplicable("Проверка относится только к карточкам товара"), ({ page }) => {
    const hasProduct = page?.structuredData.types.some((type) => type.toLowerCase() === "product") ?? false;
    return result(hasProduct ? "pass" : "warning", hasProduct ? "Найдена разметка Product" : "Разметка Product не найдена", hasProduct ? null : "medium");
  }, "Запускается только для уверенно классифицированной карточки товара.", "Не проверяет достоверность цены и наличия во внешних системах."),
  pageCheck("breadcrumbs", "Навигационная цепочка", "structureOnPage", (context) => {
    if (!context.object || !context.page) return notApplicable("HTML-страница не загружена");
    if (context.object.pageType === "homepage") return notApplicable("Главной странице навигационная цепочка не требуется");
    return ["service", "category", "product", "article", "case"].includes(context.object.pageType ?? "")
      ? applies()
      : notApplicable("Иерархический тип страницы не подтверждён");
  }, ({ page }) => {
    const found = page?.structuredData.types.some((type) => type.toLowerCase() === "breadcrumblist") ?? false;
    return result(found ? "pass" : "warning", found ? "Найдена разметка навигационной цепочки" : "Разметка навигационной цепочки не найдена", found ? null : "low");
  }, "Проверяет BreadcrumbList на внутренних иерархических страницах.", "Не требует breadcrumbs от главной страницы."),
  pageCheck("viewport", "Отображение на телефоне", "performanceMobile", anyHtml, ({ page }) => result(page?.viewport ? "pass" : "fail", page?.viewport ? "Настройка ширины экрана найдена" : "Настройка viewport не найдена", page?.viewport ? null : "high"), "Проверяет meta viewport.", "Не заменяет визуальную проверку на реальных устройствах."),
  pageCheck("performance", "Скорость стартовой страницы", "performanceMobile", (context) => context.object && sameUrl(context.object.finalUrl, context.input.targetUrl) ? applies() : notApplicable("Измерение скорости относится к стартовой странице"), (context) => {
    const score = normalizeScore(context.input.performance?.performance);
    if (score === null) return result("not_run", "Измерение скорости не запускалось или не завершилось");
    return result(score >= 90 ? "pass" : score >= 50 ? "warning" : "fail", `Автоматический замер скорости: ${score} из 100`, score >= 90 ? null : score >= 50 ? "medium" : "high");
  }, "Использует сохранённый автоматический замер скорости стартовой страницы.", "Один лабораторный замер не показывает скорость у всех посетителей."),
  pageCheck("images", "Описания изображений", "contentImages", (context) => {
    if (!context.page) return notApplicable("HTML-страница не загружена");
    return context.page.images.total > 0 ? applies() : notApplicable("На странице нет изображений");
  }, ({ page }) => {
    const missing = page?.images.missingAlt ?? 0;
    return result(missing === 0 ? "pass" : "warning", missing === 0 ? "У изображений указаны alt-атрибуты" : `Без alt-атрибута: ${missing}`, missing === 0 ? null : "low");
  }, "Проверяет наличие alt у img.", "Пустой alt может быть правильным для декоративного изображения."),
  pageCheck("forms", "Поля формы", "trustStructuredData", (context) => {
    if (!context.page) return notApplicable("HTML-страница не загружена");
    return (context.page.forms?.total ?? 0) > 0 ? applies() : notApplicable("На странице нет формы");
  }, ({ page }) => {
    const forms = page?.forms;
    if (!forms) return result("not_run", "Данные формы не сохранены");
    const unlabeled = Math.max(0, forms.controls - forms.labeledControls);
    return result(unlabeled === 0 ? "pass" : "warning", unlabeled === 0 ? "У полей формы есть подписи" : `Полей без подписи: ${unlabeled}`, unlabeled === 0 ? null : "medium");
  }, "Запускается только когда в HTML найдена форма.", "Не отправляет форму и не проверяет обработку данных."),
  pageCheck("auth", "Ограничение доступа", "technicalIndexing", (context) => {
    if (!context.object || !context.page) return notApplicable("HTML-страница не загружена");
    return context.object.authSignals.length > 0
      ? applies()
      : notApplicable("Признаки авторизации на странице не обнаружены");
  }, ({ object, page }) => {
    if (!object || !page) return result("not_run", "Страница не загружена");
    const intentionallyClosed = page.indexing.noindex;
    return result("pass", intentionallyClosed ? "Страница входа осознанно закрыта от поиска" : "Признаки входа обнаружены; активная проверка логина не выполнялась");
  }, "Обнаруживает только явные признаки формы входа или ограничения доступа.", "Не вводит логины и пароли и не пытается обойти защиту."),
];

export const AUDIT_CHECK_REGISTRY_V3: readonly AuditCheckDefinitionV3[] = Object.freeze(definitions);

export function evaluateAuditChecksV3(input: AuditChecksV3Input): readonly AuditCheckResultV3[] {
  const pagesByUrl = new Map<string, PageAnalysis>();
  for (const page of input.pages) {
    for (const url of [page.url, page.transport?.requestedUrl, page.transport?.finalUrl]) {
      if (url) pagesByUrl.set(checkTargetUrl(url), page);
    }
  }
  const siteContext: CheckTargetV3 = { input };
  const resources = input.objects.filter((object) => object.resourceType !== "html");
  const html = input.objects.filter((object) =>
    object.resourceType === "html" && pagesByUrl.has(checkTargetUrl(object.finalUrl))
  );
  const results: AuditCheckResultV3[] = [];

  for (const definition of AUDIT_CHECK_REGISTRY_V3) {
    const targets = definition.scope === "site"
      ? [siteContext]
      : definition.scope === "resource"
        ? resources.map((object) => ({ input, object }))
        : html.map((object) => ({ input, object, page: pagesByUrl.get(checkTargetUrl(object.finalUrl)) }));
    if (targets.length === 0) {
      results.push(checkResult(definition, siteContext, {
        status: "not_run",
        severity: null,
        reason: definition.scope === "page"
          ? "Для проверки нет загруженной HTML-страницы"
          : "Для проверки нет подходящего технического файла",
        evidence: [],
      }));
      continue;
    }
    for (const target of targets) {
      const applicability = definition.appliesTo(target);
      if (!applicability.applies) {
        if (definition.scope === "page") results.push(checkResult(definition, target, {
          status: "not_applicable",
          severity: null,
          reason: applicability.reason ?? "Проверка не применяется",
          evidence: [],
        }));
        continue;
      }
      const outcome = definition.run(target);
      results.push(checkResult(definition, target, {
        ...outcome,
        severity: outcome.severity ?? null,
        evidence: outcome.evidence ?? [],
      }));
    }
  }
  return Object.freeze(results);
}

function site(
  checkId: string,
  title: string,
  category: AuditCategory,
  run: AuditCheckDefinitionV3["run"],
  publicExplanation: string,
  automationLimit: string,
): AuditCheckDefinitionV3 {
  return definition(checkId, title, category, "site", applies, run, publicExplanation, automationLimit);
}

function external(checkId: string, title: string, category: AuditCategory, reason: string): AuditCheckDefinitionV3 {
  return site(checkId, title, category, () => result("insufficient_data", reason), reason, "Требуется доступ к внешнему кабинету владельца сайта.");
}

function resourceCheck(
  checkId: string,
  title: string,
  category: AuditCategory,
  appliesTo: AuditCheckDefinitionV3["appliesTo"],
  run: AuditCheckDefinitionV3["run"],
  publicExplanation: string,
  automationLimit: string,
): AuditCheckDefinitionV3 {
  return definition(checkId, title, category, "resource", appliesTo, run, publicExplanation, automationLimit);
}

function pageCheck(
  checkId: string,
  title: string,
  category: AuditCategory,
  appliesTo: AuditCheckDefinitionV3["appliesTo"],
  run: AuditCheckDefinitionV3["run"],
  publicExplanation: string,
  automationLimit: string,
): AuditCheckDefinitionV3 {
  return definition(checkId, title, category, "page", appliesTo, run, publicExplanation, automationLimit);
}

function definition(
  checkId: string,
  title: string,
  category: AuditCategory,
  scope: AuditCheckScopeV3,
  appliesTo: AuditCheckDefinitionV3["appliesTo"],
  run: AuditCheckDefinitionV3["run"],
  publicExplanation: string,
  automationLimit: string,
): AuditCheckDefinitionV3 {
  return {
    checkId,
    version: 1,
    title,
    category,
    scope,
    appliesTo,
    run,
    severityRules: "fail/high: подтверждённая блокировка или HTTP-ошибка; warning: подтверждённое отклонение; остальные статусы не являются ошибкой",
    publicExplanation,
    automationLimit,
  };
}

function checkResult(
  definition: AuditCheckDefinitionV3,
  target: CheckTargetV3,
  outcome: RunResultV3 | (Omit<RunResultV3, "status"> & { status: "not_applicable" }),
): AuditCheckResultV3 {
  return Object.freeze({
    checkId: definition.checkId,
    version: definition.version,
    title: definition.title,
    category: definition.category,
    scope: definition.scope,
    status: outcome.status,
    severity: outcome.severity ?? null,
    ...(target.object ? { targetUrl: target.object.finalUrl } : {}),
    reason: outcome.reason,
    publicExplanation: definition.publicExplanation,
    automationLimit: definition.automationLimit,
    evidence: Object.freeze([...(outcome.evidence ?? [])]),
  });
}

function result(
  status: RunResultV3["status"],
  reason: string,
  severity: AuditCheckSeverityV3 | null = null,
  evidenceValue: readonly AuditCheckEvidenceV3[] = [],
): RunResultV3 {
  return { status, reason, severity, evidence: evidenceValue };
}

function textCheck(signal: PageAnalysis["title"] | undefined, kind: "title" | "description", url?: string): RunResultV3 {
  const label = kind === "title" ? "Заголовок" : "Описание";
  if (!signal) return result("not_run", `${label} не проверялся`);
  if (!signal.present) return result("fail", `${label} не найден`, "medium", url ? [{ url, observation: `${label} не найден` }] : []);
  if (!signal.optimal) return result("warning", `${label} есть, длина: ${signal.length}`, "low", url ? [{ url, observation: `${label} есть, длина: ${signal.length}` }] : []);
  return result("pass", `${label} есть, длина: ${signal.length}`);
}

function evidence(pages: readonly PageAnalysis[], observation: (page: PageAnalysis) => string): AuditCheckEvidenceV3[] {
  return pages.slice(0, 3).map((page) => ({ url: page.url, observation: observation(page) }));
}

function sameUrl(left: string | URL, right: string | URL): boolean {
  return comparableUrl(left) === comparableUrl(right);
}

function comparableUrl(value: string | URL): string {
  const url = new URL(value);
  url.hash = "";
  url.search = "";
  url.pathname = url.pathname.replace(/\/+$/u, "") || "/";
  return url.href;
}

function checkTargetUrl(value: string | URL): string {
  const url = new URL(value);
  url.hash = "";
  url.pathname = url.pathname.replace(/\/+$/u, "") || "/";
  return url.href;
}

function hasDetectedAlternatePage(context: CheckTargetV3): boolean {
  const object = context.object;
  const page = context.page;
  if (!object || !page) return false;
  const currentLanguage = baseLanguage(object.language ?? page.language.value);
  const currentRoute = localizedRouteKey(object.finalUrl, currentLanguage);
  if (!currentLanguage) return false;

  const matchingObject = context.input.objects.some((candidate) => {
    if (candidate.resourceType !== "html" || sameUrl(candidate.finalUrl, object.finalUrl)) return false;
    const candidateLanguage = baseLanguage(candidate.language);
    return Boolean(
      candidateLanguage
      && candidateLanguage !== currentLanguage
      && localizedRouteKey(candidate.finalUrl, candidateLanguage) === currentRoute
    );
  });
  if (matchingObject) return true;

  return context.input.pages.some((candidate) =>
    !sameUrl(candidate.url, page.url)
    && (candidate.hreflang?.some((alternate) => sameUrl(alternate.url, page.url)) ?? false)
  );
}

function baseLanguage(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase().split(/[-_]/u)[0] ?? "";
  return /^[a-z]{2,3}$/u.test(normalized) ? normalized : null;
}

function localizedRouteKey(value: string | URL, language: string | null): string {
  const url = new URL(value);
  const segments = url.pathname.split("/").filter(Boolean);
  if (language && segments[0]?.toLowerCase() === language) segments.shift();
  return `/${segments.join("/")}`.replace(/\/+$/u, "") || "/";
}

function normalizeScore(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Math.round(value <= 1 ? value * 100 : value);
}
