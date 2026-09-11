import type { Locale } from "../config/site";

export type AuditCheckCategory =
  | "technicalIndexing"
  | "structureOnPage"
  | "performanceMobile"
  | "trustStructuredData"
  | "contentImages";

type AuditCheckCopy = {
  title: string;
  summary: string;
  measures: string;
  pass: string;
  action: string;
  caveat: string;
  sourceLabel: string;
};

export type AuditCheck = {
  id: string;
  slug: string;
  category: AuditCheckCategory;
  updatedAt: string;
  sourceUrl: string;
  ru: AuditCheckCopy;
  en: AuditCheckCopy;
};

const updatedAt = "2026-08-24";

export const auditChecks: readonly AuditCheck[] = [
  {
    id: "status", slug: "http-status", category: "technicalIndexing", updatedAt,
    sourceUrl: "https://www.rfc-editor.org/rfc/rfc9110.html#name-status-codes",
    ru: { title: "HTTP-статус страницы", summary: "Проверка подтверждает, что выбранный URL действительно отдаёт содержимое, а не ошибку или бесконечную цепочку перенаправлений.", measures: "Аудит фиксирует конечный код ответа и историю переходов. Ответы 200–299 считаются успешными, перенаправления оцениваются отдельно, ошибки 4xx и 5xx требуют внимания.", pass: "Важная каноническая страница отвечает кодом 200 без лишних промежуточных переходов.", action: "Исправьте маршрутизацию, удалите цепочки редиректов и направьте старые URL сразу на актуальную каноническую страницу.", caveat: "Код 200 сам по себе не доказывает полезность или индексируемость страницы: он подтверждает только успешную доставку ответа.", sourceLabel: "RFC 9110: коды состояния HTTP" },
    en: { title: "Page HTTP status", summary: "This check confirms that the selected URL actually returns content instead of an error or an endless redirect chain.", measures: "The audit records the final response code and redirect history. Responses from 200 to 299 pass, redirects are assessed separately, and 4xx or 5xx responses require attention.", pass: "An important canonical page returns 200 without unnecessary intermediate redirects.", action: "Fix routing, remove redirect chains, and send legacy URLs directly to the current canonical destination.", caveat: "A 200 response does not prove content quality or indexability; it only confirms that the server delivered a successful response.", sourceLabel: "RFC 9110: HTTP status codes" },
  },
  {
    id: "indexable", slug: "indexability", category: "technicalIndexing", updatedAt,
    sourceUrl: "https://developers.google.com/search/docs/crawling-indexing/block-indexing",
    ru: { title: "Разрешение индексации", summary: "Проверка ищет директивы noindex и none, которые запрещают добавлять страницу в поисковый индекс.", measures: "Аудит читает robots meta и X-Robots-Tag в HTTP-заголовках. Директива на любом из этих уровней считается запретом индексации.", pass: "Публичная поисковая страница не содержит noindex, а служебные и персонализированные URL закрыты осознанно.", action: "Снимите noindex с канонических страниц после публикационной проверки; не открывайте отчёты с токенами, админку и технические ответы.", caveat: "Отсутствие noindex разрешает индексацию, но не гарантирует её: поисковая система всё равно оценивает доступность, каноничность и качество страницы.", sourceLabel: "Google Search Central: noindex" },
    en: { title: "Indexing permission", summary: "This check finds noindex and none directives that prevent a page from entering a search index.", measures: "The audit reads both the robots meta tag and the X-Robots-Tag response header. A directive at either layer counts as an indexing block.", pass: "A public search landing page has no noindex directive, while utility and personalised URLs are intentionally excluded.", action: "Remove noindex from canonical pages after launch review; keep token reports, admin pages and technical responses closed.", caveat: "The absence of noindex permits indexing but does not guarantee it; search engines still evaluate access, canonicalisation and quality.", sourceLabel: "Google Search Central: noindex" },
  },
  {
    id: "canonical", slug: "canonical-url", category: "technicalIndexing", updatedAt,
    sourceUrl: "https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls",
    ru: { title: "Канонический URL", summary: "Проверка показывает, какую версию страницы сайт предлагает считать основной среди дублей и вариантов адреса.", measures: "Аудит валидирует link rel=canonical, преобразует относительный адрес в абсолютный и сравнивает его с конечным URL страницы.", pass: "Уникальная страница указывает сама на себя; известные дубли последовательно ссылаются на одну доступную каноническую версию.", action: "Исправьте отсутствующий, неверный или противоречивый canonical и согласуйте его с редиректами, sitemap и внутренними ссылками.", caveat: "Canonical — сильная подсказка, а не безусловная команда. Если canonical, редиректы и ссылки противоречат друг другу, поисковая система может выбрать другую версию.", sourceLabel: "Google Search Central: canonical" },
    en: { title: "Canonical URL", summary: "This check shows which page version the website nominates as primary among duplicate or alternate addresses.", measures: "The audit validates link rel=canonical, resolves relative values, and compares the result with the page’s final URL.", pass: "A unique page points to itself, while known duplicates consistently reference one accessible canonical version.", action: "Fix a missing, invalid or contradictory canonical and align it with redirects, the sitemap and internal links.", caveat: "Canonical is a strong hint rather than an unconditional command. Conflicting signals can make a search engine select a different version.", sourceLabel: "Google Search Central: canonical" },
  },
  {
    id: "robots-access", slug: "robots-root-access", category: "technicalIndexing", updatedAt,
    sourceUrl: "https://developers.google.com/search/docs/crawling-indexing/robots/intro",
    ru: { title: "Доступ робота к сайту", summary: "Проверка определяет, разрешён ли универсальному поисковому роботу обход корня сайта.", measures: "Аудит применяет правила robots.txt к стартовому URL и фиксирует, не закрыт ли весь публичный сайт директивой Disallow: /.", pass: "После запуска публичные страницы доступны для обхода, а запреты ограничены служебными разделами.", action: "Уберите глобальный запрет из production robots.txt и оставьте точечные правила для admin, API и других непоисковых маршрутов.", caveat: "robots.txt управляет обходом, но не является надёжным способом удалить уже известный URL из индекса; для этого применяют noindex при доступном обходе.", sourceLabel: "Google Search Central: robots.txt" },
    en: { title: "Crawler access to the website", summary: "This check determines whether a general search crawler may access the website root.", measures: "The audit applies robots.txt rules to the starting URL and detects a site-wide Disallow: / directive.", pass: "After launch, public pages can be crawled and restrictions are limited to utility areas.", action: "Remove the global production block and retain targeted rules for admin, API and other non-search routes.", caveat: "robots.txt controls crawling but is not a reliable way to remove an already known URL from an index; accessible noindex is used for that purpose.", sourceLabel: "Google Search Central: robots.txt" },
  },
  {
    id: "robots-file", slug: "robots-txt", category: "technicalIndexing", updatedAt,
    sourceUrl: "https://yandex.ru/support/webmaster/ru/controlling-robot/robots-txt",
    ru: { title: "Файл robots.txt", summary: "Проверка подтверждает наличие и читаемость файла с правилами обхода для поисковых роботов.", measures: "Аудит запрашивает /robots.txt, проверяет HTTP-ответ и разбирает базовые директивы, включая ссылку на sitemap.", pass: "Файл доступен по стандартному адресу, не содержит случайного глобального запрета и ссылается на актуальную карту сайта.", action: "Опубликуйте простой robots.txt в корне домена и избегайте правил, которые невозможно сопоставить с реальной структурой маршрутов.", caveat: "Сложный robots.txt не улучшает позиции сам по себе. Его задача — не мешать обходу полезных страниц и экономно закрывать служебные URL.", sourceLabel: "Яндекс Вебмастер: robots.txt" },
    en: { title: "robots.txt file", summary: "This check confirms that the crawler rules file exists and can be read.", measures: "The audit requests /robots.txt, checks the response, and parses basic directives including the sitemap reference.", pass: "The file is available at the standard path, contains no accidental global block, and points to the current sitemap.", action: "Publish a simple root robots.txt and avoid rules that do not match the real route structure.", caveat: "A complex robots.txt does not improve rankings by itself. Its job is to avoid blocking useful pages and to close utility URLs economically.", sourceLabel: "Yandex Webmaster: robots.txt" },
  },
  {
    id: "sitemap", slug: "xml-sitemap", category: "technicalIndexing", updatedAt,
    sourceUrl: "https://yandex.ru/support/webmaster/ru/indexing-options/sitemap",
    ru: { title: "XML-карта сайта", summary: "Проверка ищет sitemap и оценивает, может ли робот получить список выбранных канонических страниц.", measures: "Аудит читает ссылку из robots.txt и стандартный /sitemap.xml, затем разбирает URL или вложенные карты.", pass: "Карта возвращает 200 и содержит только доступные, канонические, разрешённые к индексации URL с реальными датами обновления.", action: "Удалите из sitemap редиректы, ошибки, noindex и персональные отчёты; добавьте новые полезные страницы после редакционной проверки.", caveat: "Sitemap помогает обнаружению, но не гарантирует индексацию и не заменяет внутренние ссылки.", sourceLabel: "Яндекс Вебмастер: Sitemap" },
    en: { title: "XML sitemap", summary: "This check finds the sitemap and determines whether a crawler can obtain the selected canonical URL list.", measures: "The audit reads the robots.txt declaration and the standard /sitemap.xml, then parses URLs or nested sitemap files.", pass: "The sitemap returns 200 and contains only accessible, canonical, indexable URLs with genuine modification dates.", action: "Remove redirects, errors, noindex pages and personalised reports; add new useful pages after editorial review.", caveat: "A sitemap helps discovery but does not guarantee indexing and does not replace internal links.", sourceLabel: "Yandex Webmaster: Sitemap" },
  },
  {
    id: "charset", slug: "document-charset", category: "technicalIndexing", updatedAt,
    sourceUrl: "https://html.spec.whatwg.org/multipage/semantics.html#charset",
    ru: { title: "Кодировка документа", summary: "Проверка убеждается, что браузер и робот однозначно понимают кодировку текста страницы.", measures: "Аудит ищет charset в HTML и Content-Type. Наличие UTF-8 исключает типичные искажения кириллицы и служебных символов.", pass: "Сервер или ранний meta charset объявляет UTF-8 одинаково на всех публичных страницах.", action: "Добавьте корректный charset в шаблон документа и согласуйте его с HTTP-заголовком ответа.", caveat: "Корректная кодировка не оценивает содержание, но ошибка в ней может сделать текст нечитаемым и непригодным для анализа.", sourceLabel: "WHATWG HTML: charset" },
    en: { title: "Document character encoding", summary: "This check confirms that browsers and crawlers can interpret page text unambiguously.", measures: "The audit looks for charset in HTML and Content-Type. UTF-8 prevents common corruption of Cyrillic and special characters.", pass: "The server or an early meta charset consistently declares UTF-8 on every public page.", action: "Add the correct charset to the document template and align it with the response Content-Type header.", caveat: "Correct encoding does not assess content quality, but a mismatch can make text unreadable and impossible to analyse.", sourceLabel: "WHATWG HTML: charset" },
  },
  {
    id: "titles", slug: "page-title", category: "structureOnPage", updatedAt,
    sourceUrl: "https://developers.google.com/search/docs/appearance/title-link",
    ru: { title: "Заголовок title", summary: "Проверка оценивает наличие и ориентировочную длину HTML-title, который описывает страницу в браузере и поиске.", measures: "Аудит нормализует текст title и отмечает отсутствие, слишком короткую или чрезмерно длинную формулировку.", pass: "Каждая страница имеет конкретный title, соответствующий её содержанию и отличающийся от соседних страниц.", action: "Напишите title вокруг реальной задачи страницы, добавьте отличительный контекст и уберите повторяющиеся общие фразы.", caveat: "Поисковая система может переписать отображаемый заголовок, если считает другой фрагмент страницы более полезным.", sourceLabel: "Google Search Central: title links" },
    en: { title: "Page title", summary: "This check assesses the presence and approximate length of the HTML title used by browsers and search results.", measures: "The audit normalises title text and flags a missing, very short or excessively long value.", pass: "Every page has a specific title that matches its content and differs from neighbouring pages.", action: "Write the title around the page’s real task, add distinguishing context and remove repeated generic wording.", caveat: "A search engine may rewrite the displayed title when another page fragment appears more useful.", sourceLabel: "Google Search Central: title links" },
  },
  {
    id: "title-uniqueness", slug: "unique-page-titles", category: "structureOnPage", updatedAt,
    sourceUrl: "https://developers.google.com/search/docs/appearance/title-link#page-titles",
    ru: { title: "Уникальность title", summary: "Проверка сравнивает заголовки выбранных страниц и выявляет одинаковые формулировки.", measures: "Аудит приводит title к единому регистру и считает долю уникальных значений внутри проверенной выборки.", pass: "У каждой самостоятельной страницы свой title, а одинаковые страницы объединены редиректом или canonical.", action: "Разведите задачи страниц, перепишите шаблонные title и устраните технические дубли URL.", caveat: "Уникальность текста title не оправдывает создание отдельной страницы без собственного полезного содержания.", sourceLabel: "Google Search Central: distinct titles" },
    en: { title: "Unique page titles", summary: "This check compares titles across the sampled pages and finds repeated wording.", measures: "The audit normalises case and calculates the share of unique values within the checked sample.", pass: "Every standalone page has its own title, while duplicate pages are consolidated by redirects or canonical signals.", action: "Separate page tasks, rewrite template titles and eliminate technical URL duplicates.", caveat: "A unique title does not justify a separate page that lacks its own useful content.", sourceLabel: "Google Search Central: distinct titles" },
  },
  {
    id: "h1", slug: "single-h1", category: "structureOnPage", updatedAt,
    sourceUrl: "https://html.spec.whatwg.org/multipage/sections.html#the-h1,-h2,-h3,-h4,-h5,-and-h6-elements",
    ru: { title: "Основной заголовок H1", summary: "Проверка считает видимые H1 и подтверждает, что страница ясно называет свою основную тему.", measures: "Аудит извлекает все элементы h1 и отмечает отсутствие либо несколько конкурирующих основных заголовков.", pass: "На странице один содержательный H1, который согласуется с title и первым экраном.", action: "Добавьте пропущенный H1 или оставьте один основной, переведя второстепенные заголовки на h2 и h3.", caveat: "Несколько H1 допустимы в HTML, но один основной заголовок обычно делает структуру понятнее людям и системам анализа.", sourceLabel: "WHATWG HTML: heading elements" },
    en: { title: "Single main H1", summary: "This check counts visible H1 elements and confirms that the page clearly names its primary topic.", measures: "The audit extracts every h1 and flags either a missing main heading or several competing ones.", pass: "The page has one meaningful H1 aligned with the title and opening content.", action: "Add a missing H1 or retain one main heading and move secondary headings to h2 or h3.", caveat: "Multiple H1 elements are valid HTML, but one main heading usually makes the structure clearer for people and analysis tools.", sourceLabel: "WHATWG HTML: heading elements" },
  },
  {
    id: "heading-hierarchy", slug: "heading-hierarchy", category: "structureOnPage", updatedAt,
    sourceUrl: "https://www.w3.org/WAI/tutorials/page-structure/headings/",
    ru: { title: "Иерархия заголовков", summary: "Проверка ищет резкие пропуски уровней, которые затрудняют понимание структуры материала.", measures: "Аудит проходит последовательность h1–h6 и отмечает переходы, где уровень увеличивается больше чем на один шаг.", pass: "Разделы следуют логике H1 → H2 → H3 без оформления обычного текста заголовочными тегами.", action: "Перестройте уровни по смыслу документа, а визуальный размер задавайте стилями, не выбором случайного тега.", caveat: "Автоматическая проверка видит порядок тегов, но не может полностью оценить смысловую вложенность текста.", sourceLabel: "W3C WAI: headings" },
    en: { title: "Heading hierarchy", summary: "This check finds abrupt level jumps that make document structure harder to understand.", measures: "The audit walks through h1 to h6 and flags transitions where the level increases by more than one step.", pass: "Sections follow an H1 → H2 → H3 logic without using heading tags merely for visual size.", action: "Rebuild levels around document meaning and use CSS, not arbitrary tags, for visual sizing.", caveat: "Automation sees tag order but cannot fully judge the semantic nesting of the copy.", sourceLabel: "W3C WAI: headings" },
  },
  {
    id: "internal-links", slug: "internal-link-presence", category: "structureOnPage", updatedAt,
    sourceUrl: "https://developers.google.com/search/docs/crawling-indexing/links-crawlable",
    ru: { title: "Внутренние ссылки", summary: "Проверка подтверждает, что страницы связаны обычными доступными ссылками, а не существуют изолированно.", measures: "Аудит собирает внутренние href и считает уникальные адреса, найденные на каждой проверенной странице.", pass: "Важная страница получает контекстные ссылки из меню, разделов, статей или связанных материалов.", action: "Добавьте осмысленные ссылки с понятным текстом и включите новые страницы в навигационную структуру.", caveat: "Большое число ссылок не равно хорошей перелинковке; связь должна помогать посетителю продолжить конкретную задачу.", sourceLabel: "Google Search Central: crawlable links" },
    en: { title: "Internal link presence", summary: "This check confirms that pages are connected by normal crawlable links instead of remaining isolated.", measures: "The audit collects internal href values and counts unique destinations found on each sampled page.", pass: "An important page receives contextual links from navigation, hubs, articles or related resources.", action: "Add meaningful links with clear anchor text and include new pages in the site’s navigation structure.", caveat: "A high link count is not automatically good internal linking; every connection should help a visitor continue a specific task.", sourceLabel: "Google Search Central: crawlable links" },
  },
  {
    id: "broken-internal-links", slug: "working-internal-links", category: "structureOnPage", updatedAt,
    sourceUrl: "https://developers.google.com/search/docs/crawling-indexing/links-crawlable",
    ru: { title: "Работающие внутренние ссылки", summary: "Проверка сопоставляет найденные внутренние ссылки с ответами уже проверенных страниц.", measures: "Если связанный URL вошёл в выборку, аудит учитывает его статус и наличие промежуточных перенаправлений.", pass: "Внутренние ссылки ведут напрямую на доступные канонические страницы без 404 и цепочек редиректов.", action: "Исправьте href в шаблонах и контенте, удалите ссылки на исчезнувшие материалы и обновите адреса после миграций.", caveat: "Бесплатная выборка проверяет не каждый найденный URL, поэтому успешный результат не заменяет полный обход сайта.", sourceLabel: "Google Search Central: links" },
    en: { title: "Working internal links", summary: "This check matches discovered internal links with responses from pages that were included in the audit sample.", measures: "When a linked URL was crawled, the audit considers its response and any intermediate redirects.", pass: "Internal links point directly to accessible canonical pages without 404 errors or redirect chains.", action: "Fix href values in templates and copy, remove links to retired material and update addresses after migrations.", caveat: "The free sample does not request every discovered URL, so an absent signal does not replace a full-site crawl.", sourceLabel: "Google Search Central: links" },
  },
  {
    id: "language", slug: "html-language", category: "structureOnPage", updatedAt,
    sourceUrl: "https://html.spec.whatwg.org/multipage/dom.html#the-lang-and-xml:lang-attributes",
    ru: { title: "Язык HTML-документа", summary: "Проверка ищет атрибут lang, который помогает браузерам, ассистивным технологиям и обработчикам текста.", measures: "Аудит читает значение lang у корневого html и фиксирует его отсутствие.", pass: "Русские страницы объявляют ru, английские — en, а переключение языка ведёт на эквивалентную локаль.", action: "Установите lang на уровне корневого layout и вычисляйте его из фактической локали маршрута.", caveat: "lang не заменяет hreflang: первый атрибут задаёт язык документа, второй связывает переводы страницы.", sourceLabel: "WHATWG HTML: lang" },
    en: { title: "HTML document language", summary: "This check finds the lang attribute used by browsers, assistive technology and text processors.", measures: "The audit reads the root html lang value and records when it is missing.", pass: "Russian pages declare ru, English pages declare en, and the language switch links equivalent versions.", action: "Set lang in the root layout and derive it from the actual route locale.", caveat: "lang does not replace hreflang or describe the relationship between translations; those signals solve different problems.", sourceLabel: "WHATWG HTML: lang" },
  },
  {
    id: "performance", slug: "lighthouse-performance", category: "performanceMobile", updatedAt,
    sourceUrl: "https://developer.chrome.com/docs/lighthouse/performance/performance-scoring",
    ru: { title: "Оценка Lighthouse Performance", summary: "Проверка использует лабораторную сводную оценку производительности для одной контрольной страницы.", measures: "Lighthouse объединяет несколько метрик с весами. Аудит сохраняет фактический результат, не подменяя отсутствующий запуск выдуманным баллом.", pass: "Контрольный запуск стабилен, а отдельные метрики не скрывают явную задержку или блокировку интерфейса.", action: "Оптимизируйте конкретные метрики и повторяйте замер в одинаковых условиях после каждого значимого изменения.", caveat: "Лабораторный балл меняется от устройства и окружения и не равен реальным полевым данным всех посетителей.", sourceLabel: "Chrome Developers: Lighthouse scoring" },
    en: { title: "Lighthouse Performance score", summary: "This check uses a laboratory performance summary for one control page.", measures: "Lighthouse combines several weighted metrics. The audit stores the observed value and never invents a score when the run is unavailable.", pass: "The control run is stable and individual metrics do not reveal a material delay or blocked interface.", action: "Optimise the specific metrics and repeat measurements under the same conditions after each meaningful change.", caveat: "A laboratory score varies by device and environment and is not the same as field data from all visitors.", sourceLabel: "Chrome Developers: Lighthouse scoring" },
  },
  {
    id: "fcp", slug: "first-contentful-paint", category: "performanceMobile", updatedAt,
    sourceUrl: "https://web.dev/articles/fcp",
    ru: { title: "First Contentful Paint (FCP)", summary: "Проверка измеряет время до появления первого текста, изображения или другого содержательного элемента.", measures: "Аудит использует фактическое лабораторное значение и сравнивает его с порогом 1,8 секунды для хорошего результата.", pass: "Пользователь быстро видит первый содержательный отклик вместо пустого экрана.", action: "Сократите критический CSS, задержки сервера, блокирующие шрифты и скрипты, необходимые до первого отображения.", caveat: "FCP показывает начало отрисовки, но не момент готовности главного содержимого или интерактивности.", sourceLabel: "web.dev: FCP" },
    en: { title: "First Contentful Paint (FCP)", summary: "This check measures the time until the first text, image or other content is painted.", measures: "The audit uses an observed laboratory value and compares it with the 1.8-second good threshold.", pass: "The visitor quickly sees a meaningful response instead of a blank screen.", action: "Reduce critical CSS, server delay, blocking fonts and scripts required before the first paint.", caveat: "FCP marks the start of rendering, not the point when primary content or interactivity is ready.", sourceLabel: "web.dev: FCP" },
  },
  {
    id: "lcp", slug: "largest-contentful-paint", category: "performanceMobile", updatedAt,
    sourceUrl: "https://web.dev/articles/lcp",
    ru: { title: "Largest Contentful Paint (LCP)", summary: "Проверка измеряет, когда в области просмотра появился крупнейший видимый содержательный элемент.", measures: "Аудит сравнивает лабораторный LCP с порогом 2,5 секунды и сохраняет миллисекунды для повторного контроля.", pass: "Главный заголовок, изображение или другой LCP-элемент стабильно появляется не позднее хорошего порога.", action: "Определите фактический LCP-элемент, ускорьте его ресурс, приоритизацию, серверный ответ и критические стили.", caveat: "Лабораторный LCP — контрольный сценарий; для окончательной оценки нужны полевые данные реальных пользователей.", sourceLabel: "web.dev: LCP" },
    en: { title: "Largest Contentful Paint (LCP)", summary: "This check measures when the largest visible content element appears in the viewport.", measures: "The audit compares laboratory LCP with the 2.5-second good threshold and stores milliseconds for repeat testing.", pass: "The main heading, image or other LCP element consistently appears within the good threshold.", action: "Identify the actual LCP element and improve its resource, priority, server response and critical styles.", caveat: "Laboratory LCP is a control scenario; final assessment also needs field data from real users.", sourceLabel: "web.dev: LCP" },
  },
  {
    id: "cls", slug: "cumulative-layout-shift", category: "performanceMobile", updatedAt,
    sourceUrl: "https://web.dev/articles/cls",
    ru: { title: "Cumulative Layout Shift (CLS)", summary: "Проверка оценивает неожиданные сдвиги уже показанных элементов во время загрузки.", measures: "Аудит использует безразмерное значение CLS; результат до 0,1 считается хорошим лабораторным значением.", pass: "Текст, кнопки и формы не прыгают после появления изображений, шрифтов, баннеров или асинхронных блоков.", action: "Задайте размеры медиа, резервируйте место под динамику и избегайте вставки контента выше уже показанного интерфейса.", caveat: "Один лабораторный прогон может не воспроизвести редкие баннеры или персонализированные блоки.", sourceLabel: "web.dev: CLS" },
    en: { title: "Cumulative Layout Shift (CLS)", summary: "This check assesses unexpected movement of content that has already appeared during loading.", measures: "The audit uses the unitless CLS value; up to 0.1 is the good laboratory threshold.", pass: "Text, buttons and forms do not jump after images, fonts, banners or asynchronous blocks appear.", action: "Declare media dimensions, reserve dynamic space and avoid inserting content above an already rendered interface.", caveat: "A single lab run may not reproduce rare banners or personalised blocks.", sourceLabel: "web.dev: CLS" },
  },
  {
    id: "tbt", slug: "total-blocking-time", category: "performanceMobile", updatedAt,
    sourceUrl: "https://web.dev/articles/tbt",
    ru: { title: "Total Blocking Time (TBT)", summary: "Проверка суммирует время, когда длинные задачи блокируют главный поток и мешают реакции интерфейса.", measures: "Аудит использует лабораторный TBT; значение до 200 мс считается хорошим для контрольного запуска.", pass: "Основной поток не занят длинными задачами настолько, чтобы заметно задерживать ввод пользователя.", action: "Разделите тяжёлый JavaScript, отложите необязательный код и сократите работу сторонних скриптов после загрузки.", caveat: "TBT — лабораторная метрика и коррелирует с интерактивностью, но не заменяет полевой INP.", sourceLabel: "web.dev: TBT" },
    en: { title: "Total Blocking Time (TBT)", summary: "This check totals the time when long main-thread tasks prevent the interface from responding.", measures: "The audit uses laboratory TBT; up to 200 ms is a good target for a control run.", pass: "Long tasks do not occupy the main thread enough to create a material input delay.", action: "Split heavy JavaScript, defer non-essential code and reduce third-party script work after loading.", caveat: "TBT is a laboratory metric correlated with responsiveness but does not replace field INP.", sourceLabel: "web.dev: TBT" },
  },
  {
    id: "accessibility", slug: "lighthouse-accessibility", category: "performanceMobile", updatedAt,
    sourceUrl: "https://developer.chrome.com/docs/lighthouse/accessibility/scoring",
    ru: { title: "Lighthouse Accessibility", summary: "Проверка показывает сводную оценку автоматических тестов доступности контрольной страницы с учётом веса каждого теста.", measures: "Аудит сохраняет фактический балл Lighthouse Accessibility и не считает непроведённый запуск успешным.", pass: "Автоматические проверки не находят критичных проблем с именами элементов, контрастом, структурой и управлением.", action: "Исправьте конкретные failed audits, затем проверьте клавиатуру, экранный диктор и смысл интерфейса вручную.", caveat: "Высокий автоматический балл не доказывает полную доступность: значительная часть требований требует ручной проверки.", sourceLabel: "Chrome Developers: Accessibility scoring" },
    en: { title: "Lighthouse Accessibility", summary: "This check reports a weighted score from automated accessibility audits of the control page.", measures: "The audit stores the observed Lighthouse Accessibility score and does not treat an unavailable run as successful.", pass: "Automation finds no material problems with accessible names, contrast, structure or controls.", action: "Fix specific failed audits, then manually test keyboard use, a screen reader and the interface meaning.", caveat: "A high automated score does not prove complete accessibility; many requirements need manual review.", sourceLabel: "Chrome Developers: Accessibility scoring" },
  },
  {
    id: "viewport", slug: "mobile-viewport", category: "performanceMobile", updatedAt,
    sourceUrl: "https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag",
    ru: { title: "Мобильный viewport", summary: "Проверка ищет инструкцию, которая задаёт корректную ширину страницы на мобильных устройствах.", measures: "Аудит проверяет наличие meta name=viewport в head каждой выбранной страницы.", pass: "Шаблон содержит viewport width=device-width и не ограничивает пользовательское масштабирование без причины.", action: "Добавьте единый viewport в корневой layout и протестируйте реальные ширины без горизонтального переполнения.", caveat: "Наличие тега не доказывает адаптивность; сетку, размеры касаний и переносы текста нужно проверять в браузере.", sourceLabel: "MDN: viewport meta tag" },
    en: { title: "Mobile viewport", summary: "This check finds the instruction that sets the correct page width on mobile devices.", measures: "The audit checks for meta name=viewport in the head of every sampled page.", pass: "The template uses width=device-width and does not disable user zoom without a valid reason.", action: "Add one viewport declaration to the root layout and test real widths for horizontal overflow.", caveat: "The tag does not prove responsive behaviour; layout, touch targets and wrapping still require browser testing.", sourceLabel: "MDN: viewport meta tag" },
  },
  {
    id: "https", slug: "https", category: "trustStructuredData", updatedAt,
    sourceUrl: "https://www.rfc-editor.org/rfc/rfc9110.html#name-https-uri-scheme",
    ru: { title: "HTTPS-соединение", summary: "Проверка подтверждает, что аудитируемый сайт открывается по защищённой схеме HTTPS.", measures: "Аудит проверяет конечный протокол после всех перенаправлений со стартового адреса.", pass: "Основная версия сайта использует HTTPS, а HTTP и www-варианты постоянно перенаправляются на один канонический хост.", action: "Настройте действующий сертификат, автоматическое обновление и прямой постоянный редирект на HTTPS-версию.", caveat: "HTTPS защищает транспорт, но не исправляет уязвимости приложения, неверную обработку данных или слабые права доступа.", sourceLabel: "RFC 9110: HTTPS URI" },
    en: { title: "HTTPS connection", summary: "This check confirms that the audited website resolves to the protected HTTPS scheme.", measures: "The audit inspects the final protocol after every redirect from the starting address.", pass: "The primary website uses HTTPS and HTTP or www variants permanently redirect to one canonical host.", action: "Configure a valid certificate, automatic renewal and a direct permanent redirect to the HTTPS version.", caveat: "HTTPS protects transport but does not fix application vulnerabilities, unsafe data handling or weak access control.", sourceLabel: "RFC 9110: HTTPS URI" },
  },
  {
    id: "mixed-content", slug: "mixed-content", category: "trustStructuredData", updatedAt,
    sourceUrl: "https://www.w3.org/TR/mixed-content/",
    ru: { title: "Смешанный контент", summary: "Проверка ищет HTTP-ресурсы внутри HTTPS-страницы, которые браузер может блокировать или загружать небезопасно.", measures: "Аудит анализирует src и href у изображений, скриптов, стилей, фреймов и медиа на абсолютные http-адреса.", pass: "Все активные и визуальные ресурсы загружаются по HTTPS или безопасным относительным URL.", action: "Замените адреса ресурсов, обновите CDN и удалите зависимости от хостов без HTTPS.", caveat: "Статический HTML-анализ может не увидеть адрес, который сторонний скрипт добавляет только после выполнения в браузере.", sourceLabel: "W3C: Mixed Content" },
    en: { title: "Mixed content", summary: "This check finds HTTP resources inside an HTTPS page that browsers may block or load insecurely.", measures: "The audit analyses src and href values for images, scripts, styles, frames and media that use absolute http addresses.", pass: "Every active and visual resource loads over HTTPS or a safe relative URL.", action: "Replace resource addresses, update the CDN and remove dependencies on hosts without HTTPS.", caveat: "Static HTML analysis may miss an address inserted by a third-party script only after browser execution.", sourceLabel: "W3C: Mixed Content" },
  },
  {
    id: "security-headers", slug: "security-headers", category: "trustStructuredData", updatedAt,
    sourceUrl: "https://owasp.org/www-project-secure-headers/",
    ru: { title: "Защитные HTTP-заголовки", summary: "Проверка фиксирует базовые заголовки, которые ограничивают опасные способы загрузки и интерпретации страницы.", measures: "Аудит ищет CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy и защиту от встраивания.", pass: "Production-ответы содержат осмысленный набор заголовков, совместимый с фактическими ресурсами и функциями сайта.", action: "Добавляйте политики на уровне reverse proxy или приложения и проверяйте их в report-only перед строгим включением.", caveat: "Наличие заголовка не доказывает корректность его значения; слишком широкая политика может создавать ложное чувство защиты.", sourceLabel: "OWASP Secure Headers Project" },
    en: { title: "Security response headers", summary: "This check records baseline headers that restrict unsafe loading and interpretation of a page.", measures: "The audit looks for CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy and frame protection.", pass: "Production responses contain a meaningful set that matches the website’s actual resources and features.", action: "Add policies at the reverse proxy or application layer and test them in report-only mode before strict enforcement.", caveat: "A present header does not prove that its value is effective; an overly broad policy can create false confidence.", sourceLabel: "OWASP Secure Headers Project" },
  },
  {
    id: "json-ld", slug: "structured-data", category: "trustStructuredData", updatedAt,
    sourceUrl: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data",
    ru: { title: "Структурированные данные JSON-LD", summary: "Проверка ищет машиночитаемую разметку сущностей и убеждается, что JSON можно разобрать.", measures: "Аудит читает script application/ld+json, считает валидные и ошибочные блоки и извлекает заявленные @type.", pass: "Разметка валидна, соответствует видимому содержанию и использует подходящие типы Organization, WebSite, Article или FAQ.", action: "Исправьте синтаксис, удалите неподтверждённые свойства и синхронизируйте данные с текстом страницы.", caveat: "Валидный JSON-LD не гарантирует расширенный результат в поиске; действуют отдельные правила качества и поддерживаемых типов.", sourceLabel: "Google Search Central: structured data" },
    en: { title: "JSON-LD structured data", summary: "This check finds machine-readable entity markup and confirms that its JSON can be parsed.", measures: "The audit reads application/ld+json scripts, counts valid and invalid blocks, and extracts declared @type values.", pass: "Markup is valid, matches visible content and uses suitable Organization, WebSite, Article or FAQ types.", action: "Fix syntax, remove unsupported claims and keep properties in sync with the visible page.", caveat: "Valid JSON-LD does not guarantee a rich result; separate eligibility and quality policies still apply.", sourceLabel: "Google Search Central: structured data" },
  },
  {
    id: "open-graph", slug: "open-graph", category: "trustStructuredData", updatedAt,
    sourceUrl: "https://ogp.me/",
    ru: { title: "Open Graph", summary: "Проверка оценивает заполнение базовых полей превью при публикации ссылки в мессенджерах и соцсетях.", measures: "Аудит ищет og:title, og:description, og:image и og:url и рассчитывает долю присутствующих значений.", pass: "Каждая публичная страница передаёт собственный заголовок, описание, абсолютный URL и подходящее изображение.", action: "Формируйте Open Graph из тех же маршрутных метаданных, что canonical и title, чтобы исключить расхождения.", caveat: "Платформы кэшируют превью и могут обрезать текст или изображение по своим правилам.", sourceLabel: "Open Graph protocol" },
    en: { title: "Open Graph metadata", summary: "This check assesses the baseline fields used for link previews in messengers and social platforms.", measures: "The audit looks for og:title, og:description, og:image and og:url and calculates their coverage.", pass: "Every public page provides its own title, description, absolute URL and suitable image.", action: "Generate Open Graph from the same route metadata as canonical and title to prevent mismatches.", caveat: "Platforms cache previews and may crop text or images according to their own rules.", sourceLabel: "Open Graph protocol" },
  },
  {
    id: "descriptions", slug: "meta-description", category: "contentImages", updatedAt,
    sourceUrl: "https://developers.google.com/search/docs/appearance/snippet",
    ru: { title: "Meta description", summary: "Проверка оценивает наличие и ориентировочную длину описания страницы для поискового сниппета.", measures: "Аудит извлекает meta name=description и отмечает отсутствующие, слишком короткие или чрезмерно длинные значения.", pass: "Описание кратко передаёт конкретную пользу страницы, отличается от соседних URL и не обещает неподтверждённый результат.", action: "Напишите самостоятельный description для каждого поискового маршрута и синхронизируйте его с реальным содержанием.", caveat: "Поисковая система может показать другой фрагмент страницы, если он лучше отвечает конкретному запросу.", sourceLabel: "Google Search Central: snippets" },
    en: { title: "Meta description", summary: "This check assesses the presence and approximate length of the description used for search snippets.", measures: "The audit extracts meta name=description and flags missing, very short or excessively long values.", pass: "The description communicates the page’s specific value, differs from nearby URLs and makes no unsupported promise.", action: "Write a standalone description for every search route and keep it aligned with visible content.", caveat: "A search engine may show another page fragment when it better answers a particular query.", sourceLabel: "Google Search Central: snippets" },
  },
  {
    id: "content-depth", slug: "useful-content-depth", category: "contentImages", updatedAt,
    sourceUrl: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
    ru: { title: "Полнота полезного содержания", summary: "Проверка отмечает страницы, где слишком мало видимого текста для уверенного автоматического вывода.", measures: "Аудит считает слова после удаления скриптов, стилей, SVG и шаблонных служебных элементов; менее 100 слов помечается как риск выборки.", pass: "Страница самостоятельно отвечает на заявленную задачу и содержит факты, ограничения, следующий шаг и необходимые пояснения.", action: "Дополните недостающий смысл, а не объём: уберите пустые шаблоны, объедините дубли и добавьте проверяемые сведения.", caveat: "Количество слов помогает найти слишком пустые страницы, но не определяет качество текста. Короткая страница может полностью решать узкую задачу.", sourceLabel: "Google Search Central: helpful content" },
    en: { title: "Useful content depth", summary: "This check flags pages with too little visible text for a confident automated assessment.", measures: "The audit counts words after removing scripts, styles, SVG and utility elements; fewer than 100 words is treated as a sampling risk.", pass: "The page independently answers its stated task and includes facts, boundaries, the next step and required explanation.", action: "Add missing meaning rather than volume: remove empty templates, consolidate duplicates and provide verifiable information.", caveat: "Word count is a diagnostic signal, not a quality factor. A short page can fully solve a narrow task.", sourceLabel: "Google Search Central: helpful content" },
  },
  {
    id: "image-alt", slug: "image-alt-text", category: "contentImages", updatedAt,
    sourceUrl: "https://www.w3.org/WAI/tutorials/images/decision-tree/",
    ru: { title: "Альтернативный текст изображений", summary: "Аудит считает изображения без alt и отдельно фиксирует пустые значения. Уместность пустого alt зависит от назначения изображения и требует проверки.", measures: "Аудит проверяет каждое img: отсутствие атрибута снижает покрытие, пустое значение фиксируется отдельно.", pass: "Содержательные изображения имеют краткий alt по функции и контексту, декоративные — alt=\"\".", action: "Опишите смысл или действие изображения без набора ключевых слов; не дублируйте соседний текст дословно.", caveat: "Автоматический аудит видит наличие alt, но не способен гарантировать точность и полезность формулировки.", sourceLabel: "W3C WAI: image alt decision tree" },
    en: { title: "Image alternative text", summary: "Counts images with missing or empty alt. An empty value may be appropriate for a decorative image, but this needs a separate review.", measures: "The audit inspects every img: a missing attribute reduces coverage and an empty value is recorded separately.", pass: "Informative images have concise functional alt text, while decorative images use alt=\"\".", action: "Describe the image’s meaning or action without keyword stuffing and avoid repeating adjacent copy verbatim.", caveat: "Automation sees whether alt exists but cannot guarantee that the wording is accurate or useful.", sourceLabel: "W3C WAI: image alt decision tree" },
  },
  {
    id: "image-dimensions", slug: "image-dimensions", category: "contentImages", updatedAt,
    sourceUrl: "https://web.dev/articles/optimize-cls#images-without-dimensions",
    ru: { title: "Размеры изображений", summary: "Проверка ищет изображения без width или height в HTML. Если место не задано размерами или соотношением сторон, при загрузке возможны смещения.", measures: "Аудит считает изображения, у которых отсутствует хотя бы один из атрибутов width и height. Размеры, заданные через CSS, эта проверка не оценивает.", pass: "Каждое изображение передаёт размеры или получает устойчивое соотношение сторон через компонент и CSS.", action: "Добавьте width и height из исходного файла, используйте адаптивное масштабирование и не меняйте пропорции стилями.", caveat: "Размерные атрибуты помогают стабильности, но не гарантируют оптимальный вес, формат или визуальное качество файла.", sourceLabel: "web.dev: images without dimensions" },
    en: { title: "Image dimensions", summary: "This check finds images missing width or height in HTML. Without dimensions or an aspect ratio, an image may cause layout shifts as it loads.", measures: "The audit counts images missing either width or height in the source HTML. This check does not assess dimensions supplied by CSS.", pass: "Every image supplies dimensions or receives a stable aspect ratio through its component and CSS.", action: "Add width and height from the source file, scale responsively and avoid changing proportions in styles.", caveat: "Dimension attributes improve stability but do not guarantee an optimal file weight, format or visual quality.", sourceLabel: "web.dev: images without dimensions" },
  },
] as const;

export const auditCheckSlugs = auditChecks.map((check) => check.slug);

export function getAuditCheck(slug: string): AuditCheck | undefined {
  return auditChecks.find((check) => check.slug === slug);
}

export function getAuditCheckCopy(check: AuditCheck, locale: Locale): AuditCheckCopy {
  return check[locale];
}

export const auditCheckCategoryLabels: Readonly<Record<Locale, Readonly<Record<AuditCheckCategory, string>>>> = {
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
