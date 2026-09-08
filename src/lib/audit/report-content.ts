export type AuditReportLocale = "ru" | "en";

export type AuditReportIssueInput = {
  readonly code?: string;
  readonly title?: string;
  readonly description?: string;
  readonly why?: string;
  readonly whyItMatters?: string;
  readonly fix?: string;
  readonly recommendation?: string;
  readonly acceptance?: string;
  readonly evidence?: readonly unknown[];
};

export type AuditReportPageInput = {
  readonly http?: { readonly status?: number; readonly redirectCount?: number };
  readonly status?: number;
  readonly title?: string | null | { readonly value?: string | null; readonly present?: boolean; readonly length?: number; readonly optimal?: boolean };
  readonly description?: string | null | { readonly value?: string | null; readonly present?: boolean; readonly length?: number; readonly optimal?: boolean };
  readonly h1?: string | null | { readonly count?: number; readonly values?: readonly string[] };
  readonly h1Count?: number;
  readonly noindex?: boolean;
  readonly canonical?: string | null | { readonly url?: string | null; readonly valid?: boolean; readonly selfReferential?: boolean | null };
  readonly canonicalValid?: boolean | null;
  readonly sitemap?: { readonly status?: string; readonly included?: boolean | null; readonly reason?: string };
  readonly inSitemap?: boolean | null;
  readonly internalLinks?: { readonly incomingFromCheckedPages?: number };
};

export type AuditIssueCopy = {
  readonly title: string;
  readonly observation: string;
  readonly why: string;
  readonly action: string;
  readonly acceptance: string;
};

export type AuditCheckCopyInput = {
  readonly checkId: string;
  readonly status: "pass" | "warning" | "fail" | "not_applicable" | "not_run" | "insufficient_data";
  readonly value?: unknown;
  readonly title?: string;
  readonly expected?: string;
  readonly explanation?: string;
  readonly automationLimit?: string;
  readonly urlEvidence?: readonly { readonly url?: string; readonly observation?: string }[];
};

export type AuditCheckCopy = {
  readonly title: string;
  readonly expected: string;
  readonly explanation: string;
  readonly automationLimit: string;
};

type AuditCheckLabel = Readonly<Record<AuditReportLocale, {
  readonly title: string;
  readonly expected: string;
}>>;

const CHECK_LABELS: Readonly<Record<string, AuditCheckLabel>> = {
  status: checkLabel("Открываются ли страницы", "Каждая выбранная страница открывается без ошибки сервера (код ответа от 200 до 299).", "Do the pages open", "Every selected page opens without a server error (response code 200 to 299)."),
  indexable: checkLabel("Нет ли запрета на показ в поиске", "В коде страниц нет команды noindex, которая запрещает добавлять страницу в результаты поиска.", "No block from search results", "The pages do not contain a noindex instruction that blocks them from search results."),
  canonical: checkLabel("Правильно ли указан основной адрес", "На каждой странице указан её рабочий основной адрес (canonical), без ссылки на другую версию.", "Is the preferred address correct", "Every page declares its working preferred address (canonical) without pointing to another version."),
  "robots-access": checkLabel("Разрешена ли загрузка сайта поисковым роботом", "Файл robots.txt с правилами для поисковых роботов не запрещает загрузку главной страницы.", "Can search crawlers load the site", "The robots.txt crawler-rules file does not block the home page."),
  "robots-file": checkLabel("Есть ли файл с правилами для поисковых роботов", "Файл robots.txt открывается без ошибки и его правила можно прочитать.", "Is the crawler-rules file available", "The robots.txt file opens without an error and its rules can be read."),
  sitemap: checkLabel("Есть ли список страниц для поисковика", "Файл sitemap.xml открывается и содержит адреса страниц сайта.", "Is there a page list for search engines", "The sitemap.xml file opens and contains website page addresses."),
  charset: checkLabel("Правильно ли указан формат текста", "На каждой странице явно указана кодировка текста, обычно UTF-8.", "Is the text encoding declared", "Every page explicitly declares its text encoding, usually UTF-8."),
  titles: checkLabel("Понятны ли заголовки в поиске", "У каждой страницы есть отдельный заголовок для поисковой выдачи длиной примерно 30–60 символов.", "Are search-result titles clear", "Every page has a distinct search-result title of roughly 30–60 characters."),
  "title-uniqueness": checkLabel("Не повторяются ли заголовки в поиске", "У выбранных страниц разные заголовки для поисковой выдачи.", "Are search-result titles unique", "The selected pages use different search-result titles."),
  h1: checkLabel("Есть ли один главный заголовок", "На каждой странице есть один видимый главный заголовок (H1).", "Is there one main heading", "Every page has one visible main heading (H1)."),
  "heading-hierarchy": checkLabel("Логично ли расположены подзаголовки", "После главного заголовка разделы и подразделы идут последовательно, без пропуска уровней.", "Are subheadings ordered logically", "Sections and subsections follow the main heading without skipped levels."),
  "internal-links": checkLabel("Есть ли переходы в другие разделы", "На странице есть полезные ссылки на другие части сайта.", "Are there links to other sections", "The page contains useful links to other parts of the site."),
  "broken-internal-links": checkLabel("Работают ли ссылки внутри сайта", "Проверенные ссылки внутри сайта открывают существующие страницы без ошибки.", "Do internal links work", "The checked internal links open existing pages without an error."),
  language: checkLabel("Указан ли язык страницы", "В коде каждой страницы указан язык текста, чтобы браузер и программы чтения произносили его правильно.", "Is the page language declared", "Every page declares its language so browsers and screen readers can process it correctly."),
  performance: checkLabel("Общая скорость страницы на телефоне", "Автоматический тест Google Lighthouse показывает не меньше 90 баллов из 100.", "Overall mobile page speed", "The automated Google Lighthouse test scores at least 90 out of 100."),
  lighthouse: checkLabel("Общая скорость страницы на телефоне", "Автоматический тест Google Lighthouse завершён и показывает измеренное значение.", "Overall mobile page speed", "The automated Google Lighthouse test completed and produced a measured value."),
  fcp: checkLabel("Когда появляется первое содержимое", "В тесте скорости первый текст или изображение появляется не позже чем через 1,8 секунды.", "When the first content appears", "In the speed test, the first text or image appears within 1.8 seconds."),
  lcp: checkLabel("Когда появляется основное содержимое", "В тесте скорости главный видимый блок появляется не позже чем через 2,5 секунды.", "When the main content appears", "In the speed test, the main visible content appears within 2.5 seconds."),
  cls: checkLabel("Не скачет ли страница при загрузке", "Элементы почти не сдвигаются во время загрузки: показатель сдвига не выше 0,1.", "Does the page stay stable while loading", "Elements barely move while loading: the layout-shift score is no higher than 0.1."),
  tbt: checkLabel("Не зависает ли интерфейс при загрузке", "В тесте скорости страница занята тяжёлыми задачами не дольше 200 миллисекунд.", "Does the interface stay responsive while loading", "In the speed test, long tasks block the page for no more than 200 milliseconds."),
  accessibility: checkLabel("Удобно ли пользоваться страницей разными способами", "Автоматический тест доступности Google Lighthouse показывает не меньше 90 баллов из 100.", "Can the page be used in different ways", "The automated Google Lighthouse accessibility test scores at least 90 out of 100."),
  viewport: checkLabel("Настроено ли отображение на телефоне", "На каждой странице есть настройка, которая подгоняет ширину сайта под экран телефона.", "Is mobile display configured", "Every page includes the setting that fits the site to a phone screen."),
  https: checkLabel("Защищено ли соединение", "Адрес сайта начинается с https://, поэтому данные между браузером и сайтом передаются по защищённому соединению.", "Is the connection secure", "The site address starts with https://, so data travels over an encrypted connection."),
  "mixed-content": checkLabel("Все ли ресурсы загружаются безопасно", "Страницы с https:// не подключают изображения, стили или скрипты по незащищённому http://.", "Do all resources load securely", "HTTPS pages do not load images, styles or scripts over insecure HTTP."),
  "security-headers": checkLabel("Передаёт ли сервер базовые настройки защиты", "Сервер передаёт браузеру шесть базовых правил, которые ограничивают небезопасную загрузку и встраивание страницы.", "Does the server send basic protection rules", "The server sends six basic browser rules that limit unsafe loading and page embedding."),
  "json-ld": checkLabel("Понимает ли поисковик тип страницы", "На странице есть корректный блок структурированных данных (JSON-LD), если он нужен для этого типа страницы.", "Can search engines identify the page type", "The page includes a valid structured-data block (JSON-LD) when appropriate for its type."),
  "open-graph": checkLabel("Красиво ли выглядит ссылка в мессенджере", "Для превью ссылки заполнены название, описание, изображение и адрес страницы.", "Does a shared link have a complete preview", "The link preview includes a title, description, image and page address."),
  descriptions: checkLabel("Есть ли понятное описание в поиске", "У каждой страницы есть отдельное описание для поисковой выдачи длиной примерно 70–160 символов.", "Is the search-result description clear", "Every page has a distinct search-result description of roughly 70–160 characters."),
  "content-depth": checkLabel("Достаточно ли полезного текста", "На странице достаточно видимого текста, чтобы объяснить её основную задачу.", "Is there enough useful text", "The page contains enough visible text to explain its main purpose."),
  "image-alt": checkLabel("Есть ли текстовые описания изображений", "У каждого смыслового изображения есть короткое текстовое описание для поиска и программ чтения с экрана.", "Do meaningful images have text descriptions", "Every meaningful image has a concise text description for search and screen readers."),
  "image-dimensions": checkLabel("Не сдвигается ли текст из-за изображений", "Для изображений заранее зарезервировано место, поэтому текст не прыгает во время загрузки.", "Do images avoid shifting the page", "Space is reserved for images so text does not jump while they load."),
};

/**
 * Presentation copy for both new and already saved Audit Contract snapshots.
 * Stored raw measurements stay immutable; only their explanation becomes
 * clearer and consistent between the web page and the printable report.
 */
export function auditCheckCopy(locale: AuditReportLocale, check: AuditCheckCopyInput): AuditCheckCopy {
  const label = CHECK_LABELS[check.checkId]?.[locale];
  return {
    title: label?.title ?? check.title?.trim() ?? (locale === "ru" ? "Проверка" : "Check"),
    expected: label?.expected ?? check.expected?.trim() ?? (locale === "ru" ? "Ожидаемое состояние не сохранено." : "The expected state was not saved."),
    explanation: plainCheckExplanation(locale, check),
    automationLimit: plainCheckLimit(locale, check),
  };
}

export function auditObservationCopy(locale: AuditReportLocale, value: string): string {
  const text = value.trim();
  if (!text) return locale === "ru" ? "Значение не сохранено." : "The value was not saved.";
  if (/^HTTP\s+2\d\d$/iu.test(text)) return locale === "ru" ? `Код ответа ${text.replace(/^HTTP\s+/iu, "")}: страница открылась без ошибки.` : `Response code ${text.replace(/^HTTP\s+/iu, "")}: the page opened without an error.`;
  if (/^HTTP\s+\d{3}$/iu.test(text)) return locale === "ru" ? `Код ответа сервера: ${text.replace(/^HTTP\s+/iu, "")}.` : `Server response code: ${text.replace(/^HTTP\s+/iu, "")}.`;
  return text
    .replace(/^Title:/iu, locale === "ru" ? "Заголовок для поиска:" : "Search-result title:")
    .replace(/^Description:/iu, locale === "ru" ? "Описание для поиска:" : "Search-result description:")
    .replace(/^Canonical:/iu, locale === "ru" ? "Основной адрес страницы:" : "Preferred page address:")
    .replace(/^H1 отсутствует$/iu, locale === "ru" ? "Главный заголовок страницы не найден" : "The main page heading was not found")
    .replace(/^H1:\s*/iu, locale === "ru" ? "Главных заголовков: " : "Main headings: ");
}

type LocalizedCopy = Readonly<Record<AuditReportLocale, {
  readonly title: string;
  readonly why: string;
  readonly action: string;
}>>;

const ISSUE_COPY: Readonly<Record<string, LocalizedCopy>> = {
  TITLE_MISSING: copy(
    "Не задан заголовок для поисковой выдачи (title)",
    "Поисковику и человеку в выдаче сложнее понять тему страницы.",
    "Добавьте уникальный заголовок, который точно называет содержание страницы.",
    "Search-result title is missing (title)",
    "Search engines and people in the results have less context about the page.",
    "Add a unique title that accurately describes the page.",
  ),
  TITLE_LENGTH: copy(
    "Заголовок для поисковой выдачи слишком короткий или длинный",
    "В выдаче такой заголовок может быть непонятен или обрезан.",
    "Перепишите заголовок: рекомендуемая длина — 30–60 символов без повторов и общих фраз.",
    "Search-result title is too short or too long",
    "The title can be unclear or truncated in search results.",
    "Rewrite it to roughly 30–60 characters without repetition or filler.",
  ),
  TITLE_DUPLICATE: copy(
    "Несколько страниц имеют одинаковый заголовок для выдачи",
    "Поисковику сложнее отличить эти страницы и выбрать подходящую.",
    "Дайте каждой странице отдельный заголовок по её реальному содержанию.",
    "Several pages share the same search-result title",
    "Search engines have less information to distinguish the pages.",
    "Give each page a distinct title based on its actual content.",
  ),
  DESCRIPTION_MISSING: copy(
    "Не задано описание для поисковой выдачи (meta description)",
    "Поисковик сам соберёт подпись к странице, и она может хуже объяснять предложение.",
    "Добавьте короткое точное описание страницы без неподтверждённых обещаний.",
    "Search-result description is missing (meta description)",
    "The search engine will compose its own snippet, which may explain the page less clearly.",
    "Add a concise, accurate page description without unsupported promises.",
  ),
  DESCRIPTION_LENGTH: copy(
    "Описание для поисковой выдачи слишком короткое или длинное",
    "Слишком короткая подпись мало объясняет, а длинная может быть обрезана.",
    "Перепишите описание: рекомендуемая длина — 70–160 символов с пользой страницы.",
    "Search-result description is too short or too long",
    "A short snippet explains too little, while a long one can be truncated.",
    "Rewrite it to roughly 70–160 characters and state the page value clearly.",
  ),
  DESCRIPTION_DUPLICATE: copy(
    "Несколько страниц имеют одинаковое описание для выдачи",
    "Одинаковые подписи не помогают отличить страницы друг от друга.",
    "Напишите отдельное описание для каждой страницы.",
    "Several pages share the same search-result description",
    "Identical snippets do not help distinguish one page from another.",
    "Write a separate description for each page.",
  ),
  H1_MISSING: copy(
    "Нет главного заголовка страницы (H1)",
    "Посетителю и поисковику сложнее сразу понять основную тему страницы.",
    "Добавьте один видимый главный заголовок, который соответствует содержанию.",
    "Main page heading is missing (H1)",
    "Visitors and search engines have less context about the page's main topic.",
    "Add one visible main heading that matches the content.",
  ),
  H1_MULTIPLE: copy(
    "На странице несколько главных заголовков (H1)",
    "Несколько равнозначных главных заголовков размывают структуру страницы.",
    "Оставьте один главный заголовок, остальные оформите как подзаголовки.",
    "The page has several main headings (H1)",
    "Several equal main headings make the page structure less clear.",
    "Keep one main heading and make the rest subheadings.",
  ),
  H1_DUPLICATE: copy(
    "Одинаковый главный заголовок используется на нескольких страницах",
    "Заголовок перестаёт точно объяснять назначение каждой страницы.",
    "Сделайте главный заголовок каждой страницы конкретным и уникальным.",
    "The same main heading appears on several pages",
    "The heading no longer explains the specific purpose of each page.",
    "Make each page's main heading specific and unique.",
  ),
  HEADING_HIERARCHY: copy(
    "Подзаголовки идут в непоследовательном порядке",
    "Нарушенная структура усложняет чтение страницы и работу вспомогательных технологий.",
    "Выстройте заголовки по уровням: главный H1, затем разделы H2 и подразделы H3.",
    "Subheadings use an inconsistent order",
    "An inconsistent structure makes the page harder to read and navigate with assistive technology.",
    "Use one H1, then H2 section headings and H3 subsection headings.",
  ),
  CANONICAL_MISSING: copy(
    "Не указан основной адрес страницы (canonical)",
    "Если один материал доступен по нескольким адресам, поисковику сложнее выбрать основной.",
    "Укажите в canonical полный основной адрес этой страницы.",
    "The preferred page address is missing (canonical)",
    "If the same content is available at several addresses, search engines have less guidance about the preferred one.",
    "Set the full preferred address in the canonical link.",
  ),
  CANONICAL_INVALID: copy(
    "Основной адрес страницы (canonical) записан с ошибкой",
    "Некорректный адрес не помогает объединить дубли страниц.",
    "Исправьте canonical: укажите рабочий полный адрес с https://.",
    "The preferred page address (canonical) is invalid",
    "An invalid address cannot help consolidate duplicate pages.",
    "Fix the canonical link and use a working full https:// address.",
  ),
  PAGE_NOINDEX: copy(
    "Страница закрыта от появления в поиске правилом noindex",
    "Поисковой системе явно запрещено добавлять эту страницу в результаты.",
    "Если страница должна находиться в поиске, удалите noindex и проверьте страницу повторно.",
    "The page is blocked from search by a noindex rule",
    "Search engines are explicitly told not to add this page to their results.",
    "If the page should appear in search, remove noindex and check it again.",
  ),
  LANG_MISSING: copy(
    "В коде страницы не указан язык",
    "Браузерам и программам чтения с экрана сложнее правильно произносить и обрабатывать текст.",
    "Укажите язык документа в атрибуте lang у элемента html.",
    "The page language is not declared",
    "Browsers and screen readers have less information to process and pronounce the text correctly.",
    "Declare the document language with the html lang attribute.",
  ),
  VIEWPORT_MISSING: copy(
    "Не задано правило отображения на мобильных устройствах (viewport)",
    "Страница может открываться уменьшенной и не помещаться на экране телефона.",
    "Добавьте стандартную настройку viewport и проверьте страницу на узком экране.",
    "The mobile display rule is missing (viewport)",
    "The page may open zoomed out or fail to fit a phone screen.",
    "Add the standard viewport setting and test the page on a narrow screen.",
  ),
  CHARSET_MISSING: copy(
    "Не указана кодировка текста",
    "Без явной кодировки некоторые символы могут отображаться неправильно.",
    "Укажите UTF-8 в ответе сервера или в meta charset.",
    "Text encoding is not declared",
    "Without an explicit encoding, some characters may display incorrectly.",
    "Declare UTF-8 in the server response or a meta charset tag.",
  ),
  IMAGE_ALT_MISSING: copy(
    "У значимых изображений нет текстового описания (alt)",
    "Поисковик и люди, использующие чтение с экрана, не получают смысл изображения.",
    "Добавьте краткий alt значимым изображениям; декоративные оставьте с пустым alt.",
    "Meaningful images lack text descriptions (alt)",
    "Search engines and people using screen readers do not receive the image meaning.",
    "Add concise alt text to meaningful images and leave decorative images with an empty alt.",
  ),
  IMAGE_DIMENSIONS_MISSING: copy(
    "Для изображений не зарезервировано место",
    "При загрузке контент может заметно сдвигаться, особенно на телефонах.",
    "Задайте ширину и высоту изображений либо постоянное соотношение сторон.",
    "Image space is not reserved",
    "Content can shift while images load, especially on phones.",
    "Set image width and height or a stable aspect ratio.",
  ),
  JSON_LD_INVALID: copy(
    "Машиночитаемая разметка JSON-LD содержит ошибку",
    "Поисковая система может проигнорировать ошибочный блок данных о странице.",
    "Исправьте синтаксис и проверьте разметку в валидаторе поисковой системы.",
    "Machine-readable JSON-LD data contains an error",
    "Search engines may ignore an invalid block of page data.",
    "Fix the syntax and validate the markup with a search-engine testing tool.",
  ),
  JSON_LD_MISSING: copy(
    "Не найдена машиночитаемая разметка страницы (JSON-LD)",
    "Поисковику доступно меньше явных данных о типе страницы и организации.",
    "Добавляйте только подходящую и достоверную JSON-LD-разметку; она не обязательна для каждой страницы.",
    "No machine-readable page data was found (JSON-LD)",
    "Search engines receive less explicit information about the page and organisation type.",
    "Add only relevant and accurate JSON-LD data; it is not required on every page.",
  ),
  OPEN_GRAPH_INCOMPLETE: copy(
    "Не все данные для превью ссылки заполнены (Open Graph)",
    "При публикации ссылки в мессенджере или соцсети превью может быть неполным.",
    "Заполните название, описание, изображение и адрес для превью ссылки.",
    "Link-preview data is incomplete (Open Graph)",
    "A shared link may have an incomplete preview in messengers or social networks.",
    "Provide the title, description, image and address used in link previews.",
  ),
  SECURITY_HEADERS_MISSING: copy(
    "Не хватает части защитных настроек ответа сайта",
    "Браузер получает меньше ограничений против небезопасной загрузки и встраивания страницы.",
    "Настройте недостающие защитные HTTP-заголовки и проверьте, что они не ломают ресурсы сайта.",
    "Some protective response settings are missing",
    "The browser receives fewer restrictions against unsafe loading and page embedding.",
    "Configure the missing security headers and verify that site resources still work.",
  ),
  THIN_CONTENT: copy(
    "На странице мало видимого полезного содержания",
    "Страница может недостаточно полно отвечать на вопрос, ради которого её открывают.",
    "Проверьте задачу страницы и добавьте только факты, примеры и ответы, которые действительно нужны читателю.",
    "The page has little visible useful content",
    "The page may not answer the question people open it for in enough detail.",
    "Review the page purpose and add only useful facts, examples and answers.",
  ),
  FAVICON_MISSING: copy(
    "Не найдена иконка сайта во вкладке браузера",
    "Страницу сложнее узнать среди открытых вкладок и закладок.",
    "Подключите favicon и проверьте её загрузку.",
    "The browser-tab icon is missing",
    "The site is harder to recognise among tabs and bookmarks.",
    "Add a favicon and verify that it loads.",
  ),
  MIXED_CONTENT: copy(
    "Защищённая страница загружает ресурсы по незащищённому HTTP",
    "Браузер может заблокировать такие ресурсы или показать предупреждение о безопасности.",
    "Переведите все изображения, скрипты и стили на HTTPS.",
    "A secure page loads resources over insecure HTTP",
    "Browsers may block those resources or show a security warning.",
    "Load every image, script and stylesheet over HTTPS.",
  ),
  PARAMETER_LINKS_EXCESSIVE: copy(
    "На странице много ссылок с параметрами в адресе",
    "Параметры могут создавать множество похожих адресов и расходовать время поискового робота.",
    "Оставьте только нужные варианты ссылок и задайте правила для фильтров и служебных параметров.",
    "The page has many links with address parameters",
    "Parameters can create many similar addresses and consume crawler time.",
    "Keep only useful link variants and define rules for filters and service parameters.",
  ),
  INTERNAL_LINKS_EXCESSIVE: copy(
    "На странице слишком много внутренних ссылок",
    "Большое число шаблонных ссылок усложняет навигацию и размывает важные переходы.",
    "Уберите повторные и бесполезные ссылки, оставьте понятные переходы по разделам.",
    "The page has too many internal links",
    "A large number of repeated links makes navigation less clear and dilutes important paths.",
    "Remove repeated or unhelpful links and keep clear navigation paths.",
  ),
  FORM_GET_METHOD: copy(
    "Данные формы могут попадать в адрес страницы",
    "Так введённые значения могут сохраниться в истории браузера, аналитике или логах.",
    "Отправляйте формы с персональными данными методом POST и не добавляйте эти данные в URL.",
    "Form data can appear in the page address",
    "Entered values may be stored in browser history, analytics or logs.",
    "Submit forms containing personal data with POST and keep those values out of the URL.",
  ),
  FORM_LABELS_MISSING: copy(
    "Не у всех полей формы есть понятная подпись",
    "Людям, особенно использующим чтение с экрана, сложнее понять назначение поля.",
    "Свяжите каждое поле с видимой подписью или доступным именем.",
    "Some form fields lack a clear label",
    "People, especially screen-reader users, have less context about the field purpose.",
    "Give every field a visible label or accessible name.",
  ),
  ROBOTS_MISSING: copy(
    "Не найден файл правил для поисковых роботов (robots.txt)",
    "Без него поисковик не получает единых подсказок о служебных разделах и файле страниц.",
    "Опубликуйте robots.txt и укажите в нём адрес sitemap.xml.",
    "Crawler rules file is missing (robots.txt)",
    "Search engines receive no central guidance about service sections or the page-list file.",
    "Publish robots.txt and include the sitemap.xml address.",
  ),
  ROBOTS_UNAVAILABLE: copy(
    "Файл правил для поисковых роботов недоступен",
    "Поисковик может не получить актуальные правила обхода сайта.",
    "Исправьте ответ robots.txt: файл должен открываться без ошибки.",
    "Crawler rules file is unavailable",
    "Search engines may not receive the current crawl rules.",
    "Fix the robots.txt response so the file opens without an error.",
  ),
  SITEMAP_MISSING: copy(
    "Не найден файл со списком страниц (sitemap.xml)",
    "Поисковику сложнее быстро обнаружить все основные страницы сайта.",
    "Создайте sitemap.xml только с рабочими основными страницами и укажите его в robots.txt.",
    "Page-list file is missing (sitemap.xml)",
    "Search engines have less help discovering all important pages quickly.",
    "Create sitemap.xml with working preferred pages and reference it from robots.txt.",
  ),
  SITEMAP_UNAVAILABLE: copy(
    "Файл со списком страниц недоступен или содержит ошибку",
    "Поисковик не сможет использовать этот список для поиска страниц.",
    "Исправьте ответ и структуру sitemap.xml, затем откройте файл повторно.",
    "The page-list file is unavailable or invalid",
    "Search engines cannot use the file to discover pages.",
    "Fix the sitemap.xml response and structure, then open it again.",
  ),
  CRAWL_FETCH_FAILED: copy(
    "Страницу не удалось загрузить для проверки",
    "По этой странице нельзя сделать надёжный вывод, пока она не отвечает.",
    "Проверьте адрес и доступность страницы, затем запустите проверку снова.",
    "The page could not be loaded for checking",
    "No reliable conclusion can be made while the page is unavailable.",
    "Check the address and page availability, then run the check again.",
  ),
  INTERNAL_404: copy(
    "Внутренняя ссылка ведёт на несуществующую страницу",
    "Посетитель и поисковый робот получают ошибку вместо нужного материала.",
    "Исправьте адрес ссылки, удалите её или настройте перенос на подходящую страницу.",
    "An internal link points to a missing page",
    "Visitors and crawlers receive an error instead of the intended content.",
    "Fix or remove the link, or redirect it to a relevant page.",
  ),
  HTTP_ERROR_STATUS: copy(
    "Страница отвечает ошибкой",
    "Страница с ошибкой недоступна посетителю и обычно не подходит для поисковой выдачи.",
    "Исправьте страницу или настройте корректный перенос на рабочий адрес.",
    "The page returns an error",
    "An error page is unavailable to visitors and is generally unsuitable for search results.",
    "Fix the page or redirect it to a working relevant address.",
  ),
  INTERNAL_REDIRECT: copy(
    "Внутренняя ссылка сначала ведёт на промежуточный адрес",
    "Лишний переход замедляет открытие и усложняет обход сайта.",
    "Замените внутреннюю ссылку на конечный рабочий адрес.",
    "An internal link first points to an intermediate address",
    "The extra redirect slows navigation and complicates crawling.",
    "Update the internal link to the final working address.",
  ),
  SLOW_HTML_RESPONSE: copy(
    "Сервер медленно начал отдавать страницу",
    "Долгое ожидание ухудшает впечатление посетителя и замедляет обход сайта.",
    "Проверьте время ответа сервера, кеширование и тяжёлые запросы при формировании страницы.",
    "The server started returning the page slowly",
    "A long wait worsens the visitor experience and slows site crawling.",
    "Review server response time, caching and expensive page-generation requests.",
  ),
  SITEMAP_ORPHAN_PAGE: copy(
    "Страница есть в sitemap.xml, но ссылка на неё не найдена",
    "Без обычной ссылки посетителю и поисковому роботу сложнее добраться до страницы.",
    "Добавьте уместную ссылку с другой страницы или уберите служебный адрес из sitemap.xml.",
    "A page is in sitemap.xml but no link to it was found",
    "Without a normal link, visitors and crawlers have a less direct path to the page.",
    "Add a relevant link from another page or remove a service address from sitemap.xml.",
  ),
  PAGE_OUTSIDE_SITEMAP: copy(
    "Рабочей страницы нет в sitemap.xml",
    "Файл со списком страниц не сообщает поисковику об этом адресе.",
    "Добавьте основную версию страницы в sitemap.xml, если она должна находиться в поиске.",
    "A working page is missing from sitemap.xml",
    "The page-list file does not tell search engines about this address.",
    "Add the preferred page address to sitemap.xml if it should appear in search.",
  ),
  SITE_IDENTITY_SCHEMA_MISSING: copy(
    "Не найдены машиночитаемые сведения о сайте или компании",
    "Поисковик получает меньше явных подтверждённых данных о владельце и назначении сайта.",
    "Добавьте достоверную разметку WebSite и подходящий тип компании без вымышленных данных.",
    "No machine-readable site or company details were found",
    "Search engines receive less explicit verified information about the site and its owner.",
    "Add accurate WebSite and suitable organisation data without invented details.",
  ),
  BREADCRUMBS_SCHEMA_MISSING: copy(
    "Не найдена машиночитаемая цепочка разделов страницы",
    "Поисковику сложнее понять место страницы в структуре многостраничного сайта.",
    "Если на сайте есть иерархия, добавьте достоверную разметку цепочки разделов (BreadcrumbList).",
    "No machine-readable page hierarchy was found",
    "Search engines have less explicit information about the page's place in a multi-page site.",
    "If the site has a hierarchy, add accurate breadcrumb data (BreadcrumbList).",
  ),
};

export function auditIssueCopy(locale: AuditReportLocale, issue: AuditReportIssueInput): AuditIssueCopy {
  const prepared = ISSUE_COPY[issue.code ?? ""]?.[locale];
  const firstEvidence = firstEvidenceText(issue.evidence);
  const rawObservation = nonBlank(issue.description) ?? firstEvidence ?? nonBlank(issue.why) ?? nonBlank(issue.title) ?? nonBlank(issue.code);
  const fallbackWhy = nonBlank(issue.whyItMatters) ?? nonBlank(issue.why) ?? rawObservation;
  const fallbackAction = nonBlank(issue.fix) ?? nonBlank(issue.recommendation);
  const title = prepared?.title ?? nonBlank(issue.title) ?? nonBlank(issue.code) ?? (locale === "ru" ? "Замечание" : "Finding");

  return {
    title,
    observation: rawObservation ?? (locale === "ru" ? "Факт не сохранён." : "The observation was not saved."),
    why: nonBlank(issue.whyItMatters) ?? prepared?.why ?? fallbackWhy ?? (locale === "ru" ? "Влияние нужно уточнить." : "The impact needs clarification."),
    action: prepared?.action ?? fallbackAction ?? (locale === "ru" ? "Проверьте причину на указанной странице." : "Review the cause on the listed page."),
    acceptance: prepared ? (locale === "ru"
      ? `Повторная проверка больше не показывает замечание «${title}» на указанных страницах.`
      : `A repeat check no longer reports “${title}” on the listed pages.`) : nonBlank(issue.acceptance) ?? (locale === "ru"
        ? `Повторная проверка больше не показывает замечание «${title}» на указанных страницах.`
        : `A repeat check no longer reports “${title}” on the listed pages.`),
  };
}

function nonBlank(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function auditPageFindings(locale: AuditReportLocale, page: AuditReportPageInput): string[] {
  const ru = locale === "ru";
  const findings: string[] = [];
  const status = page.http?.status ?? page.status;
  const redirects = page.http?.redirectCount ?? 0;
  const title = textSignal(page.title);
  const description = textSignal(page.description);
  const h1Count = h1Signal(page);
  const canonical = canonicalSignal(page);
  const sitemap = page.sitemap;

  if (typeof status !== "number") findings.push(ru ? "Код ответа страницы не сохранён." : "The page response code was not saved.");
  else if (status < 200 || status >= 300) findings.push(ru ? `Страница отвечает кодом ${status}, а не обычным успешным кодом 200.` : `The page returns ${status} instead of the usual successful 200 response.`);
  if (redirects > 0) findings.push(ru ? `До конечной страницы происходит перенаправлений: ${redirects}.` : `Redirects before the final page: ${redirects}.`);

  if (!title.present) findings.push(ru ? "Не задан заголовок для поисковой выдачи (title)." : "The search-result title is missing (title).");
  else if (title.optimal === false && typeof title.length === "number") findings.push(ru ? `Длина заголовка для выдачи — ${title.length} символов; рекомендуемая длина — 30–60.` : `The search-result title is ${title.length} characters; the guideline is 30–60.`);

  if (!description.present) findings.push(ru ? "Не заполнено описание страницы для поисковой выдачи." : "The page has no search-result description.");
  else if (description.optimal === false && typeof description.length === "number") findings.push(ru ? `Длина описания для выдачи — ${description.length} символов; рекомендуемая длина — 70–160.` : `The search-result description is ${description.length} characters; the guideline is 70–160.`);

  if (h1Count === 0) findings.push(ru ? "Нет видимого главного заголовка страницы." : "The visible main page heading is missing.");
  else if (typeof h1Count === "number" && h1Count > 1) findings.push(ru ? `Главных заголовков H1 несколько: ${h1Count}.` : `There are several H1 main headings: ${h1Count}.`);
  if (page.noindex) findings.push(ru ? "В коде страницы есть команда noindex — запрет показывать её в результатах поиска." : "The page contains a noindex instruction that blocks it from search results.");
  if (!canonical.url) findings.push(ru ? "Не указан основной адрес страницы (canonical)." : "The preferred page address is missing (canonical).");
  else if (canonical.valid === false) findings.push(ru ? "Основной адрес страницы (canonical) записан с ошибкой." : "The preferred page address (canonical) is invalid.");
  if (sitemap?.status === "checked" && sitemap.included === false) findings.push(ru ? "Страница не указана в файле со списком страниц (sitemap.xml)." : "The page is not listed in the page-list file (sitemap.xml).");
  else if (page.inSitemap === false) findings.push(ru ? "Страница не указана в файле со списком страниц (sitemap.xml)." : "The page is not listed in the page-list file (sitemap.xml).");
  if ((page.internalLinks?.incomingFromCheckedPages ?? 1) === 0) findings.push(ru ? "Среди проверенных страниц не найдена ссылка на этот адрес." : "No link to this address was found among the checked pages.");

  return findings;
}

export function auditTermDefinitions(locale: AuditReportLocale): readonly { readonly term: string; readonly meaning: string }[] {
  return locale === "ru" ? [
    { term: "URL", meaning: "адрес конкретной страницы сайта" },
    { term: "HTTP-код", meaning: "ответ сервера: 200 означает обычную успешную загрузку, 404 — страница не найдена, 500 — ошибка сервера" },
    { term: "robots.txt", meaning: "публичный файл с правилами: какие разделы поисковый робот может загружать, а какие не должен" },
    { term: "Google Lighthouse", meaning: "автоматический тест страницы в браузере; он измеряет скорость и доступность в лабораторных условиях, но не заменяет реальные данные посетителей" },
    { term: "Title", meaning: "заголовок страницы, который обычно показывается во вкладке браузера и в поисковой выдаче" },
    { term: "Meta description", meaning: "короткое описание страницы, из которого поисковик может собрать подпись в выдаче" },
    { term: "H1", meaning: "видимый главный заголовок страницы" },
    { term: "Canonical", meaning: "указание поисковику, какой адрес считать основной версией страницы" },
    { term: "Sitemap.xml", meaning: "файл со списком основных страниц, который помогает поисковику их обнаружить" },
    { term: "Noindex", meaning: "явный запрет добавлять страницу в поисковую выдачу" },
    { term: "Уверенность классификации", meaning: "доля от 0 до 100%, которая показывает, насколько однозначно сохранённые признаки соответствуют выбранному типу страницы; это не оценка качества страницы" },
  ] : [
    { term: "URL", meaning: "the address of a specific website page" },
    { term: "HTTP code", meaning: "the server response: 200 is a normal success, 404 means not found, and 500 means a server error" },
    { term: "robots.txt", meaning: "the public rules file that says which sections a search crawler may load" },
    { term: "Google Lighthouse", meaning: "an automated browser test for laboratory speed and accessibility measurements; it does not replace real-user data" },
    { term: "Title", meaning: "the page title usually shown in the browser tab and search results" },
    { term: "Meta description", meaning: "a short page description that may be used as the search-result snippet" },
    { term: "H1", meaning: "the visible main page heading" },
    { term: "Canonical", meaning: "a signal telling search engines which address is the preferred version of a page" },
    { term: "Sitemap.xml", meaning: "a file listing important pages to help search engines discover them" },
    { term: "Noindex", meaning: "an explicit instruction not to include a page in search results" },
    { term: "Classification confidence", meaning: "a value from 0 to 100% showing how clearly the saved signals match the selected page type; it is not a page-quality score" },
  ];
}

function checkLabel(ruTitle: string, ruExpected: string, enTitle: string, enExpected: string): AuditCheckLabel {
  return {
    ru: { title: ruTitle, expected: ruExpected },
    en: { title: enTitle, expected: enExpected },
  };
}

function plainCheckExplanation(locale: AuditReportLocale, check: AuditCheckCopyInput): string {
  const ru = locale === "ru";
  const record = objectRecord(check.value);
  const passing = numberValue(record?.passing);
  const checked = numberValue(record?.checked);
  const evidence = check.urlEvidence?.find((item) => item.observation?.trim())?.observation;
  const evidenceText = evidence ? auditObservationCopy(locale, evidence) : "";
  const stored = check.explanation?.trim();

  if (check.status === "not_applicable") {
    return stored || (ru
      ? "Эта проверка не относится к выбранному типу страницы или ресурса. Она не считается ни успешной, ни ошибочной."
      : "This check does not apply to the selected page or resource type. It is counted as neither passed nor failed.");
  }
  if (check.status === "not_run") {
    return ru
      ? "Этот замер не выполнялся. Пункт не отмечен как успешный и не влияет на выводы по выполненным проверкам."
      : "This measurement was not run. It is not marked as passed and does not affect the completed-check findings.";
  }
  if (check.status === "insufficient_data") {
    if (stored && !isGenericCheckExplanation(stored)) return plainStoredCheckExplanation(locale, stored);
    return ru
      ? "Сайт не отдал данные, необходимые для этой проверки. Пункт не отмечен как успешный."
      : "The site did not provide the data required for this check. It is not marked as passed.";
  }

  if (typeof passing === "number" && typeof checked === "number" && checked > 0) {
    const affected = Math.max(0, checked - passing);
    if (check.status === "pass") {
      return ru
        ? `Проверено страниц: ${checked}. На всех ${passing} страницах условие выполнено.`
        : `${checked} pages were checked. All ${passing} pages met the condition.`;
    }
    return ru
      ? `Проверено страниц: ${checked}. На ${affected} ${pageWord(affected)} найдено отличие от нормы.${evidenceText ? ` Пример: ${evidenceText}` : ""}`
      : `${checked} pages were checked. ${affected} ${affected === 1 ? "page differs" : "pages differ"} from the expected state.${evidenceText ? ` Example: ${evidenceText}` : ""}`;
  }

  if (typeof check.value === "number" && Number.isFinite(check.value)) {
    const value = Math.round(check.value * 10) / 10;
    return ru
      ? `Результат автоматического замера: ${value}.${check.status === "pass" ? " Значение соответствует ориентиру." : " Значение отличается от ориентира, указанного ниже."}`
      : `Automated measurement: ${value}.${check.status === "pass" ? " It meets the guideline." : " It differs from the guideline shown below."}`;
  }

  if (stored && !isGenericCheckExplanation(stored)) return plainStoredCheckExplanation(locale, stored);
  if (evidenceText) {
    return ru
      ? `${check.status === "pass" ? "Проверка пройдена" : "Найдено замечание"}: ${evidenceText}`
      : `${check.status === "pass" ? "Check passed" : "Finding recorded"}: ${evidenceText}`;
  }
  return check.status === "pass"
    ? (ru ? "Проверка выполнена: результат соответствует указанной ниже норме." : "The check was completed and meets the expected state shown below.")
    : (ru ? "Проверка выполнена: результат отличается от указанной ниже нормы." : "The check was completed and differs from the expected state shown below.");
}

function plainStoredCheckExplanation(locale: AuditReportLocale, value: string): string {
  if (locale === "en") return value;
  return value
    .replace(/^Для сравнения title нужны минимум две страницы\.$/iu, "Чтобы сравнить заголовки для поисковой выдачи, нужны минимум две страницы.")
    .replace(/^Не на всех страницах есть title для сравнения\.$/iu, "Не на всех страницах заполнен заголовок для поисковой выдачи (title), поэтому сравнение невозможно.")
    .replace(/\bLighthouse\b/giu, "автоматический тест Google Lighthouse")
    .replace(/\btitle\b/giu, "заголовок для поисковой выдачи (title)")
    .replace(/\bCanonical\b/giu, "основной адрес страницы (canonical)")
    .replace(/\bViewport\b/giu, "настройка ширины страницы для телефона")
    .replace(/\bHTTP\s+2xx\b/giu, "код ответа от 200 до 299 — страница открывается без ошибки сервера");
}

function plainCheckLimit(locale: AuditReportLocale, check: AuditCheckCopyInput): string {
  const ru = locale === "ru";
  if (check.checkId === "performance" || check.checkId === "fcp" || check.checkId === "lcp" || check.checkId === "cls" || check.checkId === "tbt" || check.checkId === "accessibility") {
    return ru
      ? "Это лабораторный замер Google Lighthouse для одной выбранной страницы. Он не показывает скорость у всех реальных посетителей."
      : "This is a Google Lighthouse laboratory measurement for one selected page. It does not represent every real visitor.";
  }
  if (check.checkId === "robots-access" || check.checkId === "robots-file" || check.checkId === "sitemap") {
    return ru
      ? "Проверен только открытый файл сайта. Фактическое добавление страниц в поиск можно подтвердить в кабинете Яндекс Вебмастера или Google Search Console."
      : "Only the public site file was checked. Actual search inclusion can be confirmed in Yandex Webmaster or Google Search Console.";
  }
  const stored = check.automationLimit?.trim();
  if (stored && !/публичн|выбранн|метрик|lighthouse|автомат/iu.test(stored)) return stored;
  return ru
    ? "Вывод относится только к выбранным страницам, которые удалось открыть во время этой проверки."
    : "This finding applies only to selected pages that opened during this check.";
}

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isGenericCheckExplanation(value: string): boolean {
  return /соответствуют ожидаемому|есть отклонение|конкретное несоответствие|проверка обнаружила|(?:публичных данных )?недостаточно (?:для достоверного|для уверенного) вывода|эта проверка lighthouse не запускалась|проверка не запускалась/iu.test(value);
}

function pageWord(value: number): string {
  const mod100 = value % 100;
  const mod10 = value % 10;
  if (mod100 >= 11 && mod100 <= 14) return "страницах";
  if (mod10 === 1) return "странице";
  return "страницах";
}

function copy(
  ruTitle: string,
  ruWhy: string,
  ruAction: string,
  enTitle: string,
  enWhy: string,
  enAction: string,
): LocalizedCopy {
  return {
    ru: { title: ruTitle, why: ruWhy, action: ruAction },
    en: { title: enTitle, why: enWhy, action: enAction },
  };
}

function firstEvidenceText(value: readonly unknown[] | undefined): string | undefined {
  const first = value?.[0];
  if (typeof first === "string") return first;
  if (!first || typeof first !== "object" || Array.isArray(first)) return undefined;
  const record = first as Record<string, unknown>;
  for (const key of ["observation", "value", "label"] as const) {
    if (typeof record[key] === "string" && record[key].trim()) return record[key].trim();
  }
  return undefined;
}

function textSignal(value: AuditReportPageInput["title"]): { present: boolean; length?: number; optimal?: boolean } {
  if (typeof value === "string") return { present: Boolean(value.trim()), length: value.trim().length };
  if (!value || typeof value !== "object") return { present: false };
  return {
    present: value.present ?? Boolean(value.value?.trim()),
    length: value.length,
    optimal: value.optimal,
  };
}

function h1Signal(page: AuditReportPageInput): number | undefined {
  if (typeof page.h1 === "string") return page.h1.trim() ? 1 : 0;
  if (page.h1 && typeof page.h1 === "object") return page.h1.count;
  return page.h1Count;
}

function canonicalSignal(page: AuditReportPageInput): { url: string | null; valid?: boolean } {
  if (typeof page.canonical === "string") return { url: page.canonical || null, valid: page.canonicalValid ?? undefined };
  if (page.canonical && typeof page.canonical === "object") return { url: page.canonical.url ?? null, valid: page.canonical.valid };
  return { url: null, valid: page.canonicalValid ?? undefined };
}
