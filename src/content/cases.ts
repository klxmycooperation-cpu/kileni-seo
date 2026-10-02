import type { Locale } from "../config/site";

export type CaseFact = { value: string; label: string };

export type HomeCasePresentation = {
  logoPath?: string;
  logoFit?: "icon" | "wordmark";
  status: string;
  steps: string[];
  chartTitle: string;
  chartPoints: string;
  chartStartLabel: string;
  chartEndLabel: string;
  chartAriaLabel: string;
  chartMarkers?: Array<{
    label: string;
    tone: "red" | "amber" | "blue" | "cyan" | "green";
  }>;
  metrics: Array<{ label: string; value: string }>;
  footer: string;
  href: string;
  linkLabel: string;
  external?: boolean;
};

export type CaseStudy = {
  slug: string;
  domain: string;
  title: string;
  period: string;
  before: number;
  after: number;
  journey?: number[];
  previewFacts: CaseFact[];
  lead: string;
  task: string;
  checks: string[];
  fixes: string[];
  actions: string[];
  evidence: Array<{ metric: string; before?: string; after: string; note?: string }>;
  remaining: string[];
  caveat: string;
  home?: HomeCasePresentation;
};

const homeOnlyRu: CaseStudy = {
  slug: "mestoest-ff",
  domain: "mestoest-ff.ru",
  title: "За 21 день усилили видимость сайта фулфилмента в Подольске",
  period: "21 день",
  before: 700,
  after: 3,
  previewFacts: [
    { value: "≈700 → 3–4", label: "динамика позиции по данным проекта" },
    { value: "21 день", label: "период продвижения" },
    { value: "Подольск", label: "регион продвижения" },
    { value: "3", label: "маркетплейса в структуре услуг" },
  ],
  lead: "За 21 день сайт стал заметнее по целевым запросам о фулфилменте и ответственном хранении в Подольске. Точное место меняется в зависимости от запроса, региона и даты проверки.",
  task: "Усилить видимость услуг фулфилмента и ответственного хранения в Подольске и вывести важные запросы в верхнюю часть поисковой выдачи.",
  checks: [
    "Собрали запросы по фулфилменту и ответственному хранению",
    "Разделили услуги для Wildberries, Ozon и Яндекс Маркета",
    "Проверили видимость после публикации изменений",
  ],
  fixes: [
    "Связали структуру страниц с поисковым спросом",
    "Уточнили страницы услуг и локальную привязку к Подольску",
    "Подготовили понятные переходы к расчёту и заявке",
  ],
  actions: [
    "Собрали семантику",
    "Уточнили структуру услуг",
    "Добавили локальную привязку",
    "Проверили динамику видимости",
  ],
  evidence: [
    {
      metric: "Позиция по данным проекта",
      before: "≈700",
      after: "3–4",
      note: "Промежуточные точки показывают направление изменения, а не отдельные замеры",
    },
  ],
  remaining: ["Точная позиционная выгрузка и перечень запросов на сайте не опубликованы"],
  caveat: "Позиции зависят от запроса, региона, устройства и даты проверки. Поэтому без контрольной выгрузки не публикуем выдуманное точное место.",
  home: {
    logoPath: "/case-sites/mestoest-ff.png",
    logoFit: "wordmark",
    status: "Результат продвижения",
    steps: ["Семантика", "Структура услуг", "Локальный спрос", "Контроль позиций"],
    chartTitle: "Динамика позиций по данным проекта",
    chartPoints: "24,142 156,126 262,104 382,79 505,50 628,30",
    chartStartLabel: "Старт: ≈700",
    chartEndLabel: "Через 21 день: 3–4",
    chartAriaLabel: "По данным проекта, позиции сайта изменились примерно с 700-й до 3–4-й за 21 день",
    chartMarkers: [
      { label: "≈700", tone: "red" },
      { label: "≈520", tone: "amber" },
      { label: "≈310", tone: "amber" },
      { label: "≈150", tone: "blue" },
      { label: "≈42", tone: "cyan" },
      { label: "3–4", tone: "green" },
    ],
    metrics: [
      { label: "Позиция на старте", value: "≈700" },
      { label: "Через 21 день", value: "3–4" },
      { label: "Срок", value: "21 день" },
      { label: "Маркетплейсы", value: "3" },
    ],
    footer: "По данным проекта: примерно 700-я позиция на старте и 3–4-я через 21 день. Промежуточные точки показывают направление изменения, а не отдельные замеры.",
    href: "https://mestoest-ff.ru/",
    linkLabel: "Открыть сайт",
    external: true,
  },
};

const kamenmisRu: CaseStudy = {
  slug: "kamenmis",
  domain: "kamenmis.ru",
  title: "За 24 дня сайт мастерской искусственного камня поднялся с 600-й до 3-й позиции",
  period: "24 дня",
  before: 600,
  after: 3,
  previewFacts: [
    { value: "600 → 3", label: "динамика позиции по данным проекта" },
    { value: "24 дня", label: "период продвижения" },
    { value: "Подольск", label: "регион работы мастерской" },
    { value: "акрил и кварц", label: "материалы изделий" },
  ],
  lead: "За 24 дня сайт мастерской искусственного камня поднялся с 600-й до 3-й позиции. На сайте представлены столешницы, мойки, подоконники и другие изделия из акрилового и кварцевого камня.",
  task: "Сделать сайт мастерской заметнее для поиска изделий из искусственного камня и привести посетителя к портфолио, материалам и обращению.",
  checks: [
    "Зафиксировали стартовую позицию и условия контрольного измерения",
    "Проверили основные разделы изделий, материалов и портфолио",
    "Сверили повторную позицию через 24 дня",
  ],
  fixes: [
    "Уточнили структуру направлений из акрилового и кварцевого камня",
    "Связали важные страницы изделий с тематическим спросом",
    "Сделали переходы к портфолио, материалам и обращению понятнее",
  ],
  actions: [
    "Уточнили структуру направлений",
    "Проверили страницы материалов",
    "Связали услуги с тематическим спросом",
    "Зафиксировали повторную позицию",
  ],
  evidence: [
    {
      metric: "Позиция по данным проекта",
      before: "600",
      after: "3",
      note: "Контрольное измерение через 24 дня",
    },
  ],
  remaining: ["Список запросов и экспорт позиций не опубликованы на сайте"],
  caveat: "Позиция зависит от запроса, региона, устройства и даты проверки. Здесь показана динамика, указанная в данных проекта.",
  home: {
    logoPath: "/case-sites/kamenmis.svg",
    logoFit: "wordmark",
    status: "Результат продвижения",
    steps: ["Структура направлений", "Материалы", "Тематический спрос", "Контроль позиций"],
    chartTitle: "Динамика позиции по данным проекта",
    chartPoints: "24,142 156,120 262,100 382,78 505,55 628,30",
    chartStartLabel: "Старт: 600",
    chartEndLabel: "Через 24 дня: 3",
    chartAriaLabel: "По данным проекта, сайт Камень МИС поднялся с 600-й до 3-й позиции за 24 дня",
    chartMarkers: [
      { label: "600", tone: "red" },
      { label: "≈360", tone: "amber" },
      { label: "≈120", tone: "blue" },
      { label: "≈40", tone: "cyan" },
      { label: "≈12", tone: "cyan" },
      { label: "3", tone: "green" },
    ],
    metrics: [
      { label: "Позиция на старте", value: "600" },
      { label: "Через 24 дня", value: "3" },
      { label: "Срок", value: "24 дня" },
      { label: "Регион", value: "Подольск" },
    ],
    footer: "По данным проекта: 600-я позиция на старте и 3-я через 24 дня. Промежуточные точки показывают направление изменения, а не отдельные замеры.",
    href: "https://kamenmis.ru/",
    linkLabel: "Открыть сайт",
    external: true,
  },
};

const ru: Record<string, CaseStudy> = {
  "eco-santeh": {
    slug: "eco-santeh",
    domain: "eco-santeh.ru",
    title: "Исправили шаблоны и повторно проверили 509 страниц eco-santeh.ru",
    period: "25–29 июля 2026",
    before: 35,
    after: 93,
    previewFacts: [
      { value: "509/509", label: "страниц открылись без ошибки" },
      { value: "36 → 57", label: "автоматический тест скорости на телефоне (Lighthouse)" },
      { value: "99/100", label: "автоматический тест скорости на компьютере (Lighthouse)" },
      { value: "35 → 93", label: "внутренняя оценка KILENI — не показатель поисковика" },
    ],
    lead: "В финальном списке 509 из 509 страниц открылись без ошибки; повторная проверка не нашла пропущенных названий, описаний и точных повторов.",
    task: "Проверить большой набор страниц, исправить повторяющиеся ошибки в шаблонах и убедиться, что изменения действительно появились на сайте.",
    checks: [
      "Сопоставили исходный и финальный обходы страниц",
      "Проверили ответы сервера, основные данные страниц, точные дубли, формы и скорость главной",
      "Повторили проверку после публикации изменений",
    ],
    fixes: [
      "Исправили названия, описания, главные заголовки и основные адреса страниц",
      "Добавили данные для поиска и предпросмотра ссылок в соцсетях",
      "Повторно проверили точные повторы названий и описаний в итоговом списке страниц",
      "Усилили обработку форм и учёт успешной отправки в аналитике",
    ],
    actions: [
      "Исправили названия, описания, главные заголовки и основные адреса страниц",
      "Добавили данные для поиска и предпросмотра ссылок в соцсетях",
      "Проверили точные повторы названий и описаний",
      "Усилили обработку форм и учёт успешной отправки в аналитике",
      "Повторно проверили страницы и запустили тест скорости",
    ],
    evidence: [
      { metric: "Страницы открылись без ошибки", before: "—", after: "509 из 509", note: "Итоговый список страниц" },
      { metric: "Основные данные страниц заполнены", before: "Были системные пропуски", after: "509 из 509", note: "Итоговый список страниц" },
      { metric: "Скорость на телефоне", before: "36", after: "57", note: "Лабораторный тест одной страницы" },
      { metric: "Скорость на компьютере", before: "—", after: "99", note: "Лабораторный тест одной страницы" },
      { metric: "Доступность / подготовка к поиску", before: "—", after: "100 / 100", note: "Телефон и компьютер" },
      { metric: "Внутренняя проверка по чек-листу", before: "35/100", after: "93/100", note: "Не балл Google или Яндекса" },
    ],
    remaining: [
      "В первый обход вошло 596 страниц, в финальный — 509, поэтому это не один и тот же набор URL",
      "На телефоне остался заметный сдвиг страницы при загрузке — эту проблему не успели исправить",
      "Доставку реальной тестовой заявки не проверяли от формы до получателя",
      "Изменение позиций, трафика и заявок требует отдельного периода наблюдения",
    ],
    caveat: "Тест скорости показывает один лабораторный запуск одной страницы, а не скорость у реальных посетителей. Внутренняя оценка нужна только для сравнения этапов этой работы.",
  },
  zasorservice: {
    slug: "zasorservice",
    domain: "засорсервис.рф",
    title: "Убрали сдвиг главного экрана и проверили 575 страниц засорсервис.рф",
    period: "июль 2026",
    before: 37,
    after: 80,
    journey: [37, 66, 72, 76, 80],
    previewFacts: [
      { value: "575/575", label: "страниц открылись без ошибки" },
      { value: "0,519 → 0,0001", label: "сдвиг главного экрана (CLS) в двух тестах" },
      { value: "37 → 80", label: "внутренняя оценка KILENI — не показатель поисковика" },
    ],
    lead: "Главный экран перестал заметно сдвигаться при загрузке, а повторный обход подтвердил финальное состояние всех URL из sitemap.",
    task: "Исправить повторяющиеся ошибки на однотипных страницах, стабилизировать первый экран на мобильных устройствах и повторно проверить весь финальный список URL.",
    checks: [
      "Сравнили исходный и финальный обходы страниц",
      "Проверили ответы сервера, основные данные страниц, изображения и данные для поисковых систем",
      "Дважды запустили автоматический тест скорости главной страницы на телефоне (Lighthouse)",
    ],
    fixes: [
      "Исправили пропуски title, description, основного адреса страницы (canonical) и H1",
      "Опубликовали данные для поисковых систем (JSON-LD) и хлебные крошки",
      "Устранили причину сдвига главного слайдера",
      "Добавили серверную проверку форм, ограничение частоты и безопасную обработку вложений",
    ],
    actions: [
      "Исправили пропуски title, description, основного адреса страницы (canonical) и H1",
      "Опубликовали данные для поисковых систем (JSON-LD) и хлебные крошки",
      "Устранили причину сдвига главного слайдера",
      "Добавили серверную проверку форм, ограничение частоты и безопасную обработку вложений",
      "Повторно обошли 575 URL и сравнили два мобильных запуска Lighthouse",
    ],
    evidence: [
      { metric: "Страницы с ответом HTTP 200", before: "—", after: "575 из 575", note: "Ошибок обхода — 0" },
      { metric: "CLS главной", before: "0,519", after: "0,0001", note: "Два мобильных лабораторных запуска" },
      { metric: "Страницы с данными для поисковых систем (JSON-LD)", before: "0 из 606", after: "575 из 575", note: "Исходный и финальный обходы содержали разные списки URL" },
      { metric: "BreadcrumbList", before: "—", after: "574 страницы", note: "Все внутренние страницы финального списка" },
      { metric: "Изображения без размеров", before: "20 314", after: "25", note: "Сравнение этапов P1 и P4" },
      { metric: "Внутренняя проверка по чек-листу", before: "37/100", after: "80/100", note: "Не балл Google или Яндекса" },
    ],
    remaining: [
      "Performance менялся от 53 до 72, LCP — от 2,74 до 3,79 секунды между лабораторными запусками",
      "В первый аудит вошло 606 страниц, в финальный — 575, поэтому это не один и тот же набор URL",
      "Фактическую доставку тестовой заявки не проверяли",
      "Изменение позиций, трафика и заявок требует отдельного периода наблюдения",
    ],
    caveat: "CLS подтверждён двумя лабораторными тестами главной страницы. Оценки 66, 72 и 76 появились только в итоговом отчёте, поэтому крупно показываем подтверждённые начальную и финальную точки.",
  },
};

const en: Record<string, CaseStudy> = {
  "eco-santeh": {
    ...ru["eco-santeh"],
    title: "Fixed shared templates and rechecked 509 pages on eco-santeh.ru",
    period: "25–29 July 2026",
    previewFacts: [
      { value: "509/509", label: "pages opened without an error" },
      { value: "36 → 57", label: "mobile Lighthouse laboratory test" },
      { value: "99/100", label: "desktop Lighthouse laboratory test" },
      { value: "35 → 93", label: "internal KILENI assessment — not a search-engine metric" },
    ],
    lead: "All 509 URLs in the final set opened without an error; its follow-up export showed no missing core tags or exact metadata duplicates.",
    task: "Review a large page set, fix repeated template problems and confirm that the changes were live on the website.",
    checks: [
      "Compared the initial and final page crawls",
      "Checked server responses, core page data, exact duplicates, forms and home-page speed",
      "Repeated the checks after the changes were published",
    ],
    fixes: [
      "Fixed title, description, H1 and canonical templates",
      "Added Open Graph and JSON-LD data for search engines",
      "Rechecked exact metadata duplicates in the final URL set",
      "Improved form handling and successful-submission analytics",
    ],
    actions: [
      "Fixed title, description, H1 and canonical templates",
      "Added Open Graph and JSON-LD structured data",
      "Checked exact metadata duplicates",
      "Improved form handling and successful-submission analytics",
      "Repeated the crawl and laboratory Lighthouse tests",
    ],
    evidence: [
      { metric: "Pages returning HTTP 200", before: "—", after: "509 of 509", note: "Final URL set" },
      { metric: "Titles, descriptions, H1, canonical, Open Graph and JSON-LD", before: "Repeated gaps", after: "509 of 509", note: "Final URL set" },
      { metric: "Mobile Performance", before: "36", after: "57", note: "Laboratory Lighthouse" },
      { metric: "Desktop Performance", before: "—", after: "99", note: "Laboratory Lighthouse" },
      { metric: "Accessibility / SEO", before: "—", after: "100 / 100", note: "Mobile and desktop" },
      { metric: "Internal checklist review", before: "35/100", after: "93/100", note: "Not a Google or Yandex score" },
    ],
    remaining: [
      "The first crawl covered 596 pages and the final crawl 509, so these were not the same URL set",
      "Mobile CLS remained at 0.537 and still needed work",
      "A real test lead was not followed from the form to its recipient",
      "Rankings, traffic and leads require a separate observation period",
    ],
    caveat: "Lighthouse is a laboratory test of one page, not field Core Web Vitals. The internal assessment compares stages of this project and is not a search-engine metric.",
  },
  zasorservice: {
    ...ru.zasorservice,
    title: "Removed the home-page shift and checked 575 pages on засорсервис.рф",
    period: "July 2026",
    previewFacts: [
      { value: "575/575", label: "pages opened without an error" },
      { value: "0.519 → 0.0001", label: "home-page CLS in two tests" },
      { value: "37 → 80", label: "internal KILENI assessment — not a search-engine metric" },
    ],
    lead: "The home page stopped shifting noticeably during loading, and a second crawl confirmed every URL in the final sitemap set.",
    task: "Fix repeated issues across templated pages, stabilise the first mobile screen and recheck the complete final URL set.",
    checks: [
      "Compared the initial and final page crawls",
      "Checked server responses, core page data, images and search-engine data",
      "Ran two mobile Lighthouse laboratory tests of the home page",
    ],
    fixes: [
      "Fixed missing titles, descriptions, canonicals and H1s",
      "Published JSON-LD data for search engines and breadcrumbs",
      "Removed the cause of the main slider shift",
      "Added server validation, rate limiting and safer attachment handling",
    ],
    actions: [
      "Fixed missing titles, descriptions, canonicals and H1s",
      "Published JSON-LD and breadcrumbs",
      "Removed the cause of the main slider shift",
      "Added server validation, rate limiting and safer attachment handling",
      "Recrawled 575 URLs and compared two mobile Lighthouse runs",
    ],
    evidence: [
      { metric: "Pages returning HTTP 200", before: "—", after: "575 of 575", note: "Zero crawl errors" },
      { metric: "Home-page CLS", before: "0.519", after: "0.0001", note: "Two mobile laboratory runs" },
      { metric: "Pages with JSON-LD", before: "0 of 606", after: "575 of 575", note: "The initial and final crawls contained different URL sets" },
      { metric: "BreadcrumbList", before: "—", after: "574 pages", note: "Every internal page in the final set" },
      { metric: "Images without dimensions", before: "20,314", after: "25", note: "P1 to P4 comparison" },
      { metric: "Internal checklist review", before: "37/100", after: "80/100", note: "Not a Google or Yandex score" },
    ],
    remaining: [
      "Performance ranged from 53 to 72 and LCP from 2.74 to 3.79 seconds between laboratory runs",
      "The first audit covered 606 pages and the final audit 575, so these were not the same URL set",
      "A real test lead was not delivered",
      "Rankings, traffic and leads require a separate observation period",
    ],
    caveat: "CLS was reproduced in two laboratory tests of the home page. Scores 66, 72 and 76 only appear in the final report, so the page highlights the supported start and end points.",
  },
};

const homeOnlyEn: CaseStudy = {
  ...homeOnlyRu,
  title: "Improved search visibility for a fulfilment website in 21 days",
  period: "21 days",
  previewFacts: [
    { value: "≈700 → 3–4", label: "position change reported by the project" },
    { value: "21 days", label: "promotion period" },
    { value: "Podolsk", label: "target location" },
    { value: "3", label: "marketplaces covered by the service structure" },
  ],
  lead: "Over 21 days, the website became more visible for target searches about fulfilment and responsible storage in Podolsk. The exact position varies by query, location and check date.",
  task: "Improve visibility for fulfilment and responsible storage services in Podolsk and move important searches towards the upper part of the results.",
  checks: [
    "Collected searches around fulfilment and responsible storage",
    "Separated services for Wildberries, Ozon and Yandex Market",
    "Checked visibility after the changes were published",
  ],
  fixes: [
    "Aligned the page structure with search demand",
    "Clarified service pages and their Podolsk location",
    "Created clear paths to the estimate and enquiry forms",
  ],
  actions: ["Search research", "Service structure", "Local demand", "Position check"],
  remaining: ["The exact ranking export and query list are not published on the website"],
  caveat: "Positions depend on the query, location, device and check date. Without the control export, we do not publish an invented exact rank.",
  home: {
    ...homeOnlyRu.home!,
    status: "Promotion result",
    steps: ["Search research", "Service structure", "Local demand", "Position check"],
    chartTitle: "Position change reported by the project",
    chartStartLabel: "Start: ≈700",
    chartEndLabel: "After 21 days: 3–4",
    chartAriaLabel: "According to the project, the website moved from approximately position 700 to positions 3–4 over 21 days",
    metrics: [
      { label: "Starting position", value: "≈700" },
      { label: "After 21 days", value: "3–4" },
      { label: "Period", value: "21 days" },
      { label: "Marketplaces", value: "3" },
    ],
    footer: "According to the project, the site moved from approximately position 700 to positions 3–4 over 21 days. Intermediate points show the direction of change, not individual measurements.",
    linkLabel: "Open the website",
  },
};

const kamenmisEn: CaseStudy = {
  ...kamenmisRu,
  title: "A custom stone workshop website moved from position 600 to position 3 in 24 days",
  period: "24 days",
  previewFacts: [
    { value: "600 → 3", label: "position change reported by the project" },
    { value: "24 days", label: "promotion period" },
    { value: "Podolsk", label: "workshop location" },
    { value: "acrylic and quartz", label: "product materials" },
  ],
  lead: "Over 24 days, the custom stone workshop website moved from position 600 to position 3. The website presents countertops, sinks, window sills and other acrylic and quartz stone products.",
  task: "Improve the visibility of a custom stone workshop website and guide visitors to the portfolio, materials and enquiry options.",
  checks: [
    "Recorded the starting position and the conditions of the control measurement",
    "Reviewed the key product, material and portfolio pages",
    "Checked the follow-up position after 24 days",
  ],
  fixes: [
    "Clarified the structure of acrylic and quartz stone product directions",
    "Connected the key product pages to relevant search demand",
    "Made the paths to the portfolio, materials and enquiry options clearer",
  ],
  actions: [
    "Clarified the product structure",
    "Reviewed material pages",
    "Connected services to relevant search demand",
    "Recorded the follow-up position",
  ],
  evidence: [
    {
      metric: "Position reported by the project",
      before: "600",
      after: "3",
      note: "Control measurement after 24 days",
    },
  ],
  remaining: ["The query list and position export are not published on the website"],
  caveat: "Position depends on the query, location, device and check date. This case shows the change reported by the project.",
  home: {
    ...kamenmisRu.home!,
    status: "Promotion result",
    steps: ["Product structure", "Materials", "Search demand", "Position check"],
    chartTitle: "Position change reported by the project",
    chartStartLabel: "Start: 600",
    chartEndLabel: "After 24 days: 3",
    chartAriaLabel: "According to the project, the Kamen MIS website moved from position 600 to position 3 over 24 days",
    metrics: [
      { label: "Starting position", value: "600" },
      { label: "After 24 days", value: "3" },
      { label: "Period", value: "24 days" },
      { label: "Location", value: "Podolsk" },
    ],
    footer: "According to the project, the website moved from position 600 to position 3 over 24 days. Intermediate points show the direction of change, not individual measurements.",
    linkLabel: "Open the website",
  },
};

export function getCase(locale: Locale, slug: string) {
  return getCases(locale).find((item) => item.slug === slug);
}

export function getCases(locale: Locale) {
  return [
    locale === "ru" ? homeOnlyRu : homeOnlyEn,
    locale === "ru" ? kamenmisRu : kamenmisEn,
    ...Object.values(locale === "ru" ? ru : en),
  ];
}

export function getHomeCases(locale: Locale) {
  return getCases(locale);
}
