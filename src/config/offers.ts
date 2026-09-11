import type { BriefService } from "../content/brief";
import type { MarketplaceId } from "../content/marketplaces";
import { formatPrice, prices } from "./prices";
import type { Locale } from "./site";

export type LocalizedText = Readonly<{ ru: string; en: string }>;
export type OfferBillingUnit = "project" | "month" | "sku";
export type OfferPriceType = "fixed" | "from" | "custom";
export type OfferDiscountEligibility = "not-eligible" | "eligible" | "requires-owner-approval";
export type OfferStackingPolicy = "not-applicable" | "prohibited" | "requires-owner-approval";
export type OfferAvailability = "public" | "calculator-addon";
export type ScopeBoundary = "included" | "excluded" | "access-required" | "by-agreement" | "requires-owner-approval";
export type OfferService =
  | "seo-audit"
  | "seo-promotion"
  | "web-development"
  | "marketplaces"
  | "yandex-ads"
  | "content-materials"
  | "custom-task";

export type SeoAuditScopeContract = Readonly<{
  kind: "seo-audit";
  urls: number | null;
  templates: ScopeBoundary;
  dataSources: readonly ("public-site" | "client-data")[];
  searchConsoles: ScopeBoundary;
  region: ScopeBoundary;
  competitors: ScopeBoundary;
  deliverables: readonly ("report" | "prioritized-actions" | "implementation-log")[];
  recheck: ScopeBoundary;
  jsRendering: ScopeBoundary;
  logReview: ScopeBoundary;
}>;

export type SeoPromotionScopeContract = Readonly<{
  kind: "seo-promotion";
  regions: number | null;
  pages: number | null;
  materials: number | null;
  editHours: number | null;
  publishing: ScopeBoundary;
  reporting: "weekly" | "monthly" | "requires-owner-approval";
  indexingControl: ScopeBoundary;
}>;

export type DevelopmentScopeContract = Readonly<{
  kind: "web-development";
  productType: "landing" | "company-site" | "catalogue-or-shop" | "calculator-addon";
  templates: number | null;
  pages: number | null;
  states: ScopeBoundary;
  integrations: ScopeBoundary;
  revisions: number | "requires-owner-approval";
  deployment: ScopeBoundary;
  repository: ScopeBoundary;
  ownership: ScopeBoundary;
  warranty: ScopeBoundary;
  supportBoundary: ScopeBoundary;
}>;

export type MarketplaceScopeContract = Readonly<{
  kind: "marketplaces";
  platform: MarketplaceId | "platform-agreed-in-brief";
  skus: number | null;
  frames: number | null;
  sourceFiles: ScopeBoundary;
  publishing: ScopeBoundary;
  moderation: ScopeBoundary;
  revisions: number | "requires-owner-approval";
}>;

export type YandexAdsScopeContract = Readonly<{
  kind: "yandex-ads";
  services: number | "requires-owner-approval";
  regions: number | "requires-owner-approval";
  campaigns: number | "requires-owner-approval";
  groups: number | "requires-owner-approval";
  goals: ScopeBoundary;
  optimizationFrequency: "monthly-service" | "requires-owner-approval";
  adBudget: "excluded";
}>;

export type ContentScopeContract = Readonly<{
  kind: "content-materials";
  contentType: "website-content";
  volume: number;
  sources: "client-evidence";
  factCheck: ScopeBoundary;
  metadata: ScopeBoundary;
  publishing: ScopeBoundary;
  revisions: number;
}>;

export type CustomTaskScopeContract = Readonly<{
  kind: "custom-task";
  inputs: ScopeBoundary;
  dependencies: ScopeBoundary;
  firstStage: ScopeBoundary;
  acceptance: ScopeBoundary;
}>;

export type OfferScopeContract =
  | SeoAuditScopeContract
  | SeoPromotionScopeContract
  | DevelopmentScopeContract
  | MarketplaceScopeContract
  | YandexAdsScopeContract
  | ContentScopeContract
  | CustomTaskScopeContract;

export type Offer = Readonly<{
  id: string;
  service: OfferService;
  category: OfferService;
  availability: OfferAvailability;
  title: LocalizedText;
  shortTitle: LocalizedText;
  description: LocalizedText;
  price: number | null;
  oldPrice: number | null;
  discountPrice: number | null;
  priceType: OfferPriceType;
  billingUnit: OfferBillingUnit;
  pageLimit: number | null;
  duration: LocalizedText;
  result: LocalizedText;
  features: readonly LocalizedText[];
  exclusions: readonly LocalizedText[];
  recommended: boolean;
  discountEligibility: OfferDiscountEligibility;
  stackingPolicy: OfferStackingPolicy;
  briefType: BriefService;
  platform?: MarketplaceId;
  scope: LocalizedText;
  scopeContract: OfferScopeContract;
  localeContent: Readonly<Record<Locale, Readonly<{
    title: string;
    shortTitle: string;
    description: string;
    duration: string;
    result: string;
    features: readonly string[];
    exclusions: readonly string[];
    scope: string;
  }>>>;
}>;

export type LocalizedOffer = Omit<Offer, "title" | "shortTitle" | "description" | "duration" | "result" | "features" | "exclusions" | "scope"> & {
  title: string;
  shortTitle: string;
  description: string;
  duration: string;
  result: string;
  features: string[];
  exclusions: string[];
  scope: string;
};

type OfferInput = Omit<
  Offer,
  "category" | "availability" | "discountPrice" | "discountEligibility" | "stackingPolicy" | "exclusions" | "scopeContract" | "localeContent"
> & {
  availability?: OfferAvailability;
  exclusions?: readonly LocalizedText[];
};

const t = (ru: string, en: string): LocalizedText => ({ ru, en });

const coreOfferInputs: OfferInput[] = [
  {
    id: "seo-audit-free",
    service: "seo-audit",
    title: t("Бесплатная проверка", "Free website check"),
    shortTitle: t("До 10 страниц", "Up to 10 pages"),
    description: t("Автоматически проверим открытые страницы и покажем основные найденные проблемы.", "Automatically check public pages and show the main issues found."),
    price: prices.audits.preliminary,
    oldPrice: null,
    priceType: "fixed",
    billingUnit: "project",
    pageLimit: 10,
    duration: t("Обычно 3–7 минут", "Usually 3–7 minutes"),
    result: t("Ссылка на результат с примерами найденных проблем", "A result link with examples of the issues found"),
    features: [
      t("Доступность страниц", "Page availability"),
      t("Основные запреты для поиска", "Main search restrictions"),
      t("Названия и описания страниц", "Page titles and descriptions"),
      t("Порядок дальнейших действий", "Plain-language next steps"),
    ],
    recommended: false,
    briefType: "audit",
    scope: t("До 10 открытых страниц", "Up to 10 public pages"),
  },
  {
    id: "seo-audit-50",
    service: "seo-audit",
    title: t("Аудит до 50 страниц", "Audit up to 50 pages"),
    shortTitle: t("До 50 страниц", "Up to 50 pages"),
    description: t("Для небольшого сайта: найдём главные ошибки и выстроим порядок исправлений.", "For a small website: find the main issues and put fixes in order."),
    price: prices.audits.express,
    oldPrice: null,
    priceType: "fixed",
    billingUnit: "project",
    pageLimit: 50,
    duration: t("3–5 рабочих дней", "3–5 working days"),
    result: t("Короткий отчёт и порядок исправлений", "A concise report and fix order"),
    features: [t("Проверка ключевых страниц", "Key-page review"), t("Примеры проблем", "Issue examples"), t("Порядок исправлений", "Fix order"), t("Разбор результата", "Results walkthrough")],
    recommended: false,
    briefType: "audit",
    scope: t("До 50 страниц", "Up to 50 pages"),
  },
  {
    id: "seo-audit-200",
    service: "seo-audit",
    title: t("Аудит до 200 страниц", "Audit up to 200 pages"),
    shortTitle: t("До 200 страниц", "Up to 200 pages"),
    description: t("Проверим страницы, повторяющиеся шаблоны, внутренние ссылки и скорость.", "Review pages, repeated templates, internal links and speed."),
    price: prices.audits.full,
    oldPrice: null,
    priceType: "fixed",
    billingUnit: "project",
    pageLimit: 200,
    duration: t("5–7 рабочих дней", "5–7 working days"),
    result: t("Подробный список задач с доказательствами", "A detailed evidence-based task list"),
    features: [t("Проверка страниц и шаблонов", "Page and template review"), t("Ошибки на конкретных адресах", "Issues on specific URLs"), t("Проверка скорости", "Speed review"), t("Задачи для разработчика", "Developer-ready tasks")],
    recommended: true,
    briefType: "audit",
    scope: t("До 200 страниц", "Up to 200 pages"),
  },
  {
    id: "seo-audit-500",
    service: "seo-audit",
    title: t("Аудит до 500 страниц", "Audit up to 500 pages"),
    shortTitle: t("До 500 страниц", "Up to 500 pages"),
    description: t("Для крупного сайта: аудит, структура спроса и рабочий план на три месяца.", "For a larger website: audit, demand structure and a three-month action plan."),
    price: prices.audits.strategy,
    oldPrice: null,
    priceType: "fixed",
    billingUnit: "project",
    pageLimit: 500,
    duration: t("7–10 рабочих дней", "7–10 working days"),
    result: t("Аудит и план развития на три месяца", "Audit and a three-month growth plan"),
    features: [t("Проверка до 500 страниц", "Review up to 500 pages"), t("Структура поискового спроса", "Search-demand structure"), t("Сравнение с конкурентами", "Competitor comparison"), t("План на три месяца", "Three-month plan")],
    recommended: false,
    briefType: "audit",
    scope: t("До 500 страниц; больше — по отдельной оценке", "Up to 500 pages; larger sites are quoted separately"),
  },
  {
    id: "seo-audit-implementation",
    service: "seo-audit",
    title: t("Аудит с исправлениями", "Audit with implementation"),
    shortTitle: t("Проверка и правки", "Review and fixes"),
    description: t("Проведём аудит, согласуем важные правки, внесём их и проверим результат ещё раз.", "Audit the website, agree priority fixes, implement them and verify the result."),
    price: prices.audits.implementation.from,
    oldPrice: null,
    priceType: "from",
    billingUnit: "project",
    pageLimit: 200,
    duration: t("Срок после проверки сайта", "Timing after the website review"),
    result: t("Исправления и повторная проверка", "Implemented fixes and a repeat check"),
    features: [t("Полный аудит", "Full audit"), t("До 12 часов согласованных правок", "Up to 12 hours of agreed fixes"), t("Список внесённых изменений", "Change log"), t("Повторная проверка", "Repeat verification")],
    recommended: false,
    briefType: "audit",
    scope: t("Аудит до 200 страниц и до 12 часов правок", "Audit up to 200 pages and up to 12 hours of fixes"),
  },
  {
    id: "seo-promotion-start",
    service: "seo-promotion",
    title: t("Старт", "Start"),
    shortTitle: t("Старт", "Start"),
    description: t("Для небольшого сайта услуг в одном регионе.", "For a small service website in one region."),
    price: prices.seo.base,
    oldPrice: null,
    priceType: "from",
    billingUnit: "month",
    pageLimit: 5,
    duration: t("Ежемесячная работа", "Monthly service"),
    result: t("Исправленные приоритетные страницы и один новый материал", "Improved priority pages and one new content item"),
    features: [t("5 приоритетных страниц", "5 priority pages"), t("1 материал в месяц", "1 content item per month"), t("До 3 часов правок", "Up to 3 hours of fixes")],
    recommended: false,
    briefType: "seo",
    scope: t("Один регион, 5 страниц и 1 материал", "One region, 5 pages and 1 content item"),
  },
  {
    id: "seo-promotion-growth",
    service: "seo-promotion",
    title: t("Развитие", "Growth"),
    shortTitle: t("Развитие", "Growth"),
    description: t("Для регулярного улучшения страниц и подготовки материалов по дополнительным поисковым запросам.", "For regular page improvements and content covering additional relevant search queries."),
    price: prices.seo.growth,
    oldPrice: null,
    priceType: "fixed",
    billingUnit: "month",
    pageLimit: 10,
    duration: t("Ежемесячная работа", "Monthly service"),
    result: t("Регулярные исправления и новые страницы", "Regular fixes and new pages"),
    features: [t("10 приоритетных страниц", "10 priority pages"), t("2 материала в месяц", "2 content items per month"), t("До 6 часов правок", "Up to 6 hours of fixes"), t("Встреча раз в месяц", "Monthly review call")],
    recommended: true,
    briefType: "seo",
    scope: t("До 2 регионов, 10 страниц и 2 материалов", "Up to 2 regions, 10 pages and 2 content items"),
  },
  {
    id: "seo-promotion-team",
    service: "seo-promotion",
    title: t("Команда", "Team"),
    shortTitle: t("Команда", "Team"),
    description: t("Для нескольких направлений с постоянными задачами по сайту.", "For several business directions with ongoing website work."),
    price: prices.seo.full,
    oldPrice: null,
    priceType: "from",
    billingUnit: "month",
    pageLimit: 20,
    duration: t("Ежемесячная работа", "Monthly service"),
    result: t("Постоянная работа с сайтом и еженедельный статус", "Ongoing website work and a weekly status"),
    features: [t("20 приоритетных страниц", "20 priority pages"), t("4 материала в месяц", "4 content items per month"), t("До 10 часов правок", "Up to 10 hours of fixes"), t("Статус раз в неделю", "Weekly status")],
    recommended: false,
    briefType: "seo",
    scope: t("До 3 регионов, 20 страниц и 4 материалов", "Up to 3 regions, 20 pages and 4 content items"),
  },
  {
    id: "development-start",
    service: "web-development",
    title: t("Start", "Start"),
    shortTitle: t("Лендинг", "Landing page"),
    description: t("Одностраничный сайт для одной услуги или предложения.", "A one-page website for one service or offer."),
    price: prices.development.landing,
    oldPrice: null,
    priceType: "from",
    billingUnit: "project",
    pageLimit: 1,
    duration: t("Обычно 5–7 недель", "Usually 5–7 weeks"),
    result: t("Рабочий адаптивный лендинг с формами и аналитикой", "A responsive landing page with forms and analytics"),
    features: [t("Структура и прототип", "Structure and prototype"), t("Оригинальный дизайн", "Original design"), t("Мобильная версия", "Mobile version"), t("Формы и аналитика", "Forms and analytics")],
    recommended: false,
    briefType: "development",
    scope: t("Одна услуга на одном языке", "One service in one language"),
  },
  {
    id: "development-business",
    service: "web-development",
    title: t("Business", "Business"),
    shortTitle: t("Сайт компании", "Company website"),
    description: t("Многостраничный сайт со структурой услуг и материалов.", "A multi-page website with a clear service and content structure."),
    price: prices.development.corporate,
    oldPrice: null,
    priceType: "fixed",
    billingUnit: "project",
    pageLimit: null,
    duration: t("Срок после короткого брифа", "Timing after a short brief"),
    result: t("Готовый сайт компании с управляемым содержимым", "A complete company website with manageable content"),
    features: [t("Структура страниц", "Page structure"), t("Дизайн ключевых экранов", "Key-screen design"), t("Адаптивная разработка", "Responsive development"), t("Подготовка к поиску", "Search preparation")],
    recommended: true,
    briefType: "development",
    scope: t("Корпоративный сайт", "Company website"),
  },
  {
    id: "development-max",
    service: "web-development",
    title: t("Max", "Max"),
    shortTitle: t("Каталог или магазин", "Catalogue or shop"),
    description: t("Сайт с каталогом, интеграциями или нестандартными сценариями.", "A website with a catalogue, integrations or custom flows."),
    price: prices.development.commerce.from,
    oldPrice: null,
    priceType: "from",
    billingUnit: "project",
    pageLimit: null,
    duration: t("Срок после проектирования", "Timing after discovery"),
    result: t("Рабочий каталог или магазин с нужными интеграциями", "A working catalogue or shop with the required integrations"),
    features: [t("Проектирование каталога", "Catalogue design"), t("Корзина или заявки", "Cart or enquiry flows"), t("Нужные интеграции", "Required integrations"), t("Передача исходников", "Source-code handover")],
    recommended: false,
    briefType: "development",
    scope: t("Каталог, магазин или веб-сервис", "Catalogue, shop or web service"),
  },
  {
    id: "yandex-ads-setup",
    service: "yandex-ads",
    title: t("Настройка рекламы", "Campaign setup"),
    shortTitle: t("Настройка", "Setup"),
    description: t("Подготовим структуру кампаний, объявления, исключения и измерение обращений.", "Prepare campaign structure, ads, exclusions and enquiry tracking."),
    price: prices.ads.setup,
    oldPrice: null,
    priceType: "fixed",
    billingUnit: "project",
    pageLimit: null,
    duration: t("7–10 рабочих дней", "7–10 working days"),
    result: t("Готовые к запуску кампании и настроенные цели", "Launch-ready campaigns and configured goals"),
    features: [t("Структура кампаний", "Campaign structure"), t("Объявления", "Ads"), t("Исключения", "Exclusions"), t("Настроенные цели", "Configured goals")],
    recommended: true,
    briefType: "ads",
    scope: t("Стоимость без рекламного бюджета", "Media spend excluded"),
  },
  {
    id: "yandex-ads-support",
    service: "yandex-ads",
    title: t("Ведение рекламы", "Campaign management"),
    shortTitle: t("Ведение", "Management"),
    description: t("Регулярно проверяем запросы, расходы и обращения, затем корректируем кампании.", "Regularly review queries, spend and enquiries, then adjust campaigns."),
    price: prices.ads.support,
    oldPrice: null,
    priceType: "fixed",
    billingUnit: "month",
    pageLimit: null,
    duration: t("Ежемесячная работа", "Monthly service"),
    result: t("Список изменений и расходов", "A clear record of changes and spend"),
    features: [t("Проверка поисковых запросов", "Search-query review"), t("Корректировка ставок", "Bid adjustments"), t("Проверка обращений", "Enquiry review"), t("Отчёт по изменениям", "Change report")],
    recommended: false,
    briefType: "ads",
    scope: t("Стоимость без рекламного бюджета", "Media spend excluded"),
  },
  {
    id: "content-article",
    service: "content-materials",
    title: t("Материал для сайта", "Website content item"),
    shortTitle: t("Один материал", "One content item"),
    description: t("План, текст, название и описание страницы на основе фактов клиента.", "Outline, copy, page title and description based on client evidence."),
    price: prices.content.article,
    oldPrice: null,
    priceType: "fixed",
    billingUnit: "project",
    pageLimit: 1,
    duration: t("После уточнения задачи", "After scope clarification"),
    result: t("Готовый к публикации материал", "A publication-ready content item"),
    features: [t("План", "Outline"), t("Текст", "Copy"), t("Название и описание страницы", "Page title and description"), t("Один раунд правок", "One revision round")],
    recommended: true,
    briefType: "custom",
    scope: t("Один материал с одним раундом правок", "One content item with one revision round"),
  },
  {
    id: "custom-task-consultation",
    service: "custom-task",
    title: t("Разбор нестандартной задачи", "Non-standard task review"),
    shortTitle: t("Разбор задачи", "Task review"),
    description: t("Сначала уточним цель, входные данные, ограничения и самостоятельный первый результат.", "First clarify the goal, inputs, constraints and a useful first deliverable."),
    price: null,
    oldPrice: null,
    priceType: "custom",
    billingUnit: "project",
    pageLimit: null,
    duration: t("Срок определим после короткого брифа", "Timing is confirmed after a short brief"),
    result: t("Состав первого этапа и смета до начала работы", "A clear first-stage scope and an estimate before work starts"),
    features: [t("Текущее состояние", "Current state"), t("Нужный результат", "Required outcome"), t("Зависимости и ограничения", "Dependencies and constraints"), t("Критерий готовности", "Acceptance check")],
    recommended: false,
    briefType: "custom",
    scope: t("Состав после короткого брифа", "Scope after a short brief"),
  },
  {
    id: "marketplace-pack-10",
    service: "marketplaces",
    title: t("SEO и тексты для 10 карточек", "SEO and copy for 10 product cards"),
    shortTitle: t("Пакет из 10 карточек", "10-card pack"),
    description: t("Подготовим поисковые фразы, названия, описания и характеристики для одной товарной категории.", "Prepare search phrases, titles, descriptions and attributes for one product category."),
    price: prices.marketplaces.pack10,
    oldPrice: null,
    priceType: "fixed",
    billingUnit: "project",
    pageLimit: 10,
    duration: t("Срок после проверки исходных материалов", "Timing after source-material review"),
    result: t("Готовые тексты и характеристики для 10 артикулов", "Ready copy and attributes for 10 SKUs"),
    features: [
      t("Одна товарная категория", "One product category"),
      t("Общее исследование поисковых фраз", "Shared search-phrase research"),
      t("Названия и описания", "Titles and descriptions"),
      t("Характеристики для фильтров", "Filter-ready attributes"),
    ],
    recommended: false,
    briefType: "marketplaces",
    scope: t("До 10 артикулов без изображений", "Up to 10 SKUs without images"),
  },
];

const calculatorAddonInputs: OfferInput[] = [
  {
    id: "marketplace-video-addon",
    service: "marketplaces",
    availability: "calculator-addon",
    title: t("Видео для карточки", "Product-card video"),
    shortTitle: t("Видео", "Video"),
    description: t("Дополнительное видео для одного артикула.", "An additional video for one SKU."),
    price: prices.marketplaces.extras.videoPerItem,
    oldPrice: null,
    priceType: "fixed",
    billingUnit: "sku",
    pageLimit: 1,
    duration: t("Срок вместе с основной работой", "Timing follows the main scope"),
    result: t("Видео для одного артикула", "One SKU video"),
    features: [t("Один артикул", "One SKU")],
    recommended: false,
    briefType: "marketplaces",
    scope: t("Одно видео для одного артикула", "One video for one SKU"),
  },
  {
    id: "marketplace-analytics-addon",
    service: "marketplaces",
    availability: "calculator-addon",
    title: t("Регулярная аналитика карточек", "Recurring product-card analytics"),
    shortTitle: t("Аналитика", "Analytics"),
    description: t("Дополнительная регулярная проверка показателей карточек.", "An additional recurring review of product-card performance."),
    price: prices.marketplaces.extras.analytics,
    oldPrice: null,
    priceType: "fixed",
    billingUnit: "month",
    pageLimit: null,
    duration: t("Ежемесячная работа", "Monthly service"),
    result: t("Регулярный разбор показателей", "A recurring performance review"),
    features: [t("Анализ изменений", "Change analysis")],
    recommended: false,
    briefType: "marketplaces",
    scope: t("Один месяц аналитики", "One month of analytics"),
  },
  {
    id: "development-account-addon",
    service: "web-development",
    availability: "calculator-addon",
    title: t("Личный кабинет", "User account"),
    shortTitle: t("Личный кабинет", "User account"),
    description: t("Дополнительный пользовательский раздел с доступом по учётной записи.", "An additional signed-in user area."),
    price: prices.development.extras.account,
    oldPrice: null,
    priceType: "from",
    billingUnit: "project",
    pageLimit: null,
    duration: t("После проектирования сценариев", "After flow discovery"),
    result: t("Рабочий пользовательский раздел", "A working signed-in area"),
    features: [t("Проектирование сценариев", "Flow discovery")],
    recommended: false,
    briefType: "development",
    scope: t("Стартовая оценка одного личного кабинета", "Starting estimate for one signed-in area"),
  },
  {
    id: "development-integrations-addon",
    service: "web-development",
    availability: "calculator-addon",
    title: t("Сложная интеграция", "Complex integration"),
    shortTitle: t("Интеграция", "Integration"),
    description: t("Стартовая оценка нестандартной связи со сторонней системой.", "Starting estimate for a custom third-party integration."),
    price: prices.development.extras.integrations,
    oldPrice: null,
    priceType: "from",
    billingUnit: "project",
    pageLimit: null,
    duration: t("После проверки документации", "After documentation review"),
    result: t("Согласованная интеграция", "An agreed integration"),
    features: [t("Проверка документации", "Documentation review")],
    recommended: false,
    briefType: "development",
    scope: t("Стартовая оценка одной интеграции", "Starting estimate for one integration"),
  },
];

const marketplaceNames: Record<MarketplaceId, LocalizedText> = {
  wildberries: t("Wildberries", "Wildberries"),
  ozon: t("Ozon", "Ozon"),
  "yandex-market": t("Яндекс Маркет", "Yandex Market"),
};

const marketplaceVariants = [
  {
    key: "audit",
    title: t("Разбор карточки", "Card review"),
    description: t("Покажем, что мешает карточке и что исправить сначала.", "Show what blocks the card and what to fix first."),
    price: prices.marketplaces.audit,
    duration: t("2 рабочих дня", "2 working days"),
    result: t("Список правок по приоритету", "Prioritised correction list"),
    scope: t("Разбор одной карточки без публикации", "Review of one card without publishing"),
    features: [t("Категория и обязательные поля", "Category and required fields"), t("Название, описание и изображения", "Title, description and images"), t("Сравнение с видимыми конкурентами", "Visible competitor comparison")],
    recommended: false,
  },
  {
    key: "optimization",
    title: t("Текст и SEO карточки", "Card copy and SEO"),
    description: t("Приведём в порядок поисковые фразы, название, описание и характеристики.", "Improve search phrases, title, description and attributes."),
    price: prices.marketplaces.optimization,
    duration: t("3–4 рабочих дня", "3–4 working days"),
    result: t("Готовая структура полей и текстов", "Ready field and copy structure"),
    scope: t("Один артикул с одним раундом правок", "One SKU with one revision round"),
    features: [t("Карта поисковых фраз", "Search-phrase map"), t("Название и описание", "Title and description"), t("Характеристики для фильтров", "Filter-ready attributes"), t("Чек-лист публикации", "Publishing checklist")],
    recommended: true,
  },
  {
    key: "turnkey",
    title: t("Карточка с визуальной упаковкой", "Card with visual packaging"),
    description: t("Подготовим тексты, структуру изображений и комплект материалов для публикации.", "Prepare copy, image structure and a publishing-ready handover."),
    price: prices.marketplaces.turnkey,
    duration: t("5–7 рабочих дней", "5–7 working days"),
    result: t("Комплект карточки для публикации", "Publishing-ready card pack"),
    scope: t("Дизайн одного артикула без фотосъёмки", "Design for one SKU without photography"),
    features: [t("Текст и характеристики", "Copy and attributes"), t("Сценарий изображений", "Image scenario"), t("До шести кадров", "Up to six frames"), t("Файлы для передачи", "Handover files")],
    recommended: false,
  },
] as const;

const marketplaceOfferInputs: OfferInput[] = (Object.keys(marketplaceNames) as MarketplaceId[]).flatMap((platform) =>
  marketplaceVariants.map((variant) => ({
    id: `marketplace-${platform}-${variant.key}`,
    service: "marketplaces" as const,
    title: t(`${variant.title.ru} для ${marketplaceNames[platform].ru}`, `${variant.title.en} for ${marketplaceNames[platform].en}`),
    shortTitle: variant.title,
    description: variant.description,
    price: variant.price,
    oldPrice: null,
    priceType: "fixed" as const,
    billingUnit: "sku" as const,
    pageLimit: null,
    duration: variant.duration,
    result: variant.result,
    features: variant.features,
    recommended: variant.recommended,
    briefType: "marketplaces" as const,
    platform,
    scope: variant.scope,
  })),
);

function defaultExclusions(service: OfferService): readonly LocalizedText[] {
  const commonGuarantee = t(
    "Гарантии позиций, трафика или продаж не входят: на них влияют поисковые системы, спрос и конкуренты.",
    "Rankings, traffic and sales guarantees are excluded because search engines, demand and competitors affect them.",
  );
  const byService: Record<OfferService, readonly LocalizedText[]> = {
    "seo-audit": [
      t("Внедрение исправлений не входит, если оно не указано в выбранном варианте.", "Implementation is excluded unless the selected option says otherwise."),
      t("Закрытые системы без предоставленного доступа не проверяются.", "Private systems are excluded unless access is provided."),
      commonGuarantee,
    ],
    "seo-promotion": [
      t("Рекламный бюджет, платные размещения и сложная разработка оплачиваются отдельно.", "Media spend, paid placements and complex development are quoted separately."),
      commonGuarantee,
    ],
    "web-development": [
      t("Хостинг, платные лицензии, контент и нестандартные интеграции не входят без отдельного согласования.", "Hosting, paid licences, content and custom integrations are excluded unless agreed separately."),
    ],
    marketplaces: [
      t("Фотосъёмка, публикация и рекламное продвижение товара не входят, если это прямо не указано.", "Photography, publishing and paid product promotion are excluded unless explicitly stated."),
      t("Результаты продаж не гарантируются.", "Sales results are not guaranteed."),
    ],
    "yandex-ads": [
      t("Рекламный бюджет и доработка посадочных страниц не входят в стоимость работ.", "Media spend and landing-page development are excluded from the service fee."),
      commonGuarantee,
    ],
    "content-materials": [
      t("Фотосъёмка, публикация и дополнительные раунды правок не входят.", "Photography, publishing and additional revision rounds are excluded."),
    ],
    "custom-task": [
      t("Работы за пределами согласованного первого этапа оцениваются отдельно.", "Work beyond the agreed first stage is quoted separately."),
    ],
  };
  return byService[service];
}

function buildScopeContract(input: OfferInput): OfferScopeContract {
  if (input.service === "seo-audit") {
    const isFree = input.id === "seo-audit-free";
    const isImplementation = input.id === "seo-audit-implementation";
    const isStrategy = input.id === "seo-audit-500";
    return {
      kind: "seo-audit",
      urls: input.pageLimit,
      templates: isFree ? "excluded" : "included",
      dataSources: isFree ? ["public-site"] : ["public-site", "client-data"],
      searchConsoles: isFree ? "excluded" : "access-required",
      region: isStrategy ? "included" : "requires-owner-approval",
      competitors: isStrategy ? "included" : "requires-owner-approval",
      deliverables: isImplementation ? ["report", "prioritized-actions", "implementation-log"] : ["report", "prioritized-actions"],
      recheck: isImplementation ? "included" : "by-agreement",
      jsRendering: isFree ? "excluded" : "by-agreement",
      logReview: isFree ? "excluded" : "by-agreement",
    };
  }

  if (input.service === "seo-promotion") {
    const scopes: Record<string, Pick<SeoPromotionScopeContract, "regions" | "pages" | "materials" | "editHours" | "reporting">> = {
      "seo-promotion-start": { regions: 1, pages: 5, materials: 1, editHours: 3, reporting: "monthly" },
      "seo-promotion-growth": { regions: 2, pages: 10, materials: 2, editHours: 6, reporting: "monthly" },
      "seo-promotion-team": { regions: 3, pages: 20, materials: 4, editHours: 10, reporting: "weekly" },
    };
    const scope = scopes[input.id] ?? { regions: null, pages: input.pageLimit, materials: null, editHours: null, reporting: "requires-owner-approval" as const };
    return {
      kind: "seo-promotion",
      ...scope,
      publishing: "by-agreement",
      indexingControl: "included",
    };
  }

  if (input.service === "web-development") {
    const productType: DevelopmentScopeContract["productType"] = input.availability === "calculator-addon"
      ? "calculator-addon"
      : input.id === "development-start"
        ? "landing"
        : input.id === "development-business"
          ? "company-site"
          : "catalogue-or-shop";
    return {
      kind: "web-development",
      productType,
      templates: input.id === "development-start" ? 1 : null,
      pages: input.pageLimit,
      states: "by-agreement",
      integrations: input.id === "development-max" || input.id === "development-integrations-addon" ? "by-agreement" : "excluded",
      revisions: "requires-owner-approval",
      deployment: "by-agreement",
      repository: input.id === "development-max" ? "included" : "requires-owner-approval",
      ownership: "requires-owner-approval",
      warranty: "requires-owner-approval",
      supportBoundary: "requires-owner-approval",
    };
  }

  if (input.service === "marketplaces") {
    const isTurnkey = input.id.endsWith("-turnkey");
    const isOptimization = input.id.endsWith("-optimization");
    return {
      kind: "marketplaces",
      platform: input.platform ?? "platform-agreed-in-brief",
      skus: input.id === "marketplace-analytics-addon" ? null : input.pageLimit ?? 1,
      frames: isTurnkey ? 6 : null,
      sourceFiles: isTurnkey ? "included" : "by-agreement",
      publishing: "excluded",
      moderation: "excluded",
      revisions: isOptimization ? 1 : "requires-owner-approval",
    };
  }

  if (input.service === "yandex-ads") {
    return {
      kind: "yandex-ads",
      services: "requires-owner-approval",
      regions: "requires-owner-approval",
      campaigns: "requires-owner-approval",
      groups: "requires-owner-approval",
      goals: "included",
      optimizationFrequency: input.id === "yandex-ads-support" ? "monthly-service" : "requires-owner-approval",
      adBudget: "excluded",
    };
  }

  if (input.service === "content-materials") {
    return {
      kind: "content-materials",
      contentType: "website-content",
      volume: input.pageLimit ?? 1,
      sources: "client-evidence",
      factCheck: "included",
      metadata: "included",
      publishing: "excluded",
      revisions: 1,
    };
  }

  return {
    kind: "custom-task",
    inputs: "included",
    dependencies: "included",
    firstStage: "included",
    acceptance: "included",
  };
}

function completeOffer(input: OfferInput): Offer {
  const exclusions = input.exclusions?.length ? input.exclusions : defaultExclusions(input.service);
  return {
    ...input,
    category: input.service,
    availability: input.availability ?? "public",
    discountPrice: null,
    exclusions,
    scopeContract: buildScopeContract(input),
    discountEligibility: "not-eligible",
    stackingPolicy: "not-applicable",
    localeContent: {
      ru: {
        title: input.title.ru,
        shortTitle: input.shortTitle.ru,
        description: input.description.ru,
        duration: input.duration.ru,
        result: input.result.ru,
        features: input.features.map((feature) => feature.ru),
        exclusions: exclusions.map((item) => item.ru),
        scope: input.scope.ru,
      },
      en: {
        title: input.title.en,
        shortTitle: input.shortTitle.en,
        description: input.description.en,
        duration: input.duration.en,
        result: input.result.en,
        features: input.features.map((feature) => feature.en),
        exclusions: exclusions.map((item) => item.en),
        scope: input.scope.en,
      },
    },
  };
}

const coreOffers = coreOfferInputs.map(completeOffer);
const calculatorAddonOffers = calculatorAddonInputs.map(completeOffer);
const marketplaceCatalog = marketplaceOfferInputs.map(completeOffer);

export const offerCatalog: readonly Offer[] = [...coreOffers, ...marketplaceCatalog, ...calculatorAddonOffers];

const offersById = new Map(offerCatalog.map((offer) => [offer.id, offer]));

export function getOffer(id: string | null | undefined): Offer | undefined {
  return id ? offersById.get(id) : undefined;
}

export function offersForService(service: OfferService, platform?: MarketplaceId): Offer[] {
  return offerCatalog.filter((offer) => offer.availability === "public" && offer.service === service && (!platform || offer.platform === platform));
}

export function localizedOffer(offer: Offer, locale: Locale): LocalizedOffer {
  const content = offer.localeContent[locale];
  return {
    ...offer,
    ...content,
    features: [...content.features],
    exclusions: [...content.exclusions],
  };
}

export function formatOfferPrice(offer: Offer, locale: Locale): string {
  if (offer.priceType === "custom" || offer.price === null) {
    return locale === "ru" ? "Стоимость после короткого брифа" : "Price after a short brief";
  }
  if (locale === "en") return "Individual estimate";
  const prefix = offer.priceType === "from" ? "от " : "";
  const suffix = offer.billingUnit === "month" ? " в месяц" : offer.billingUnit === "sku" ? " за артикул" : "";
  return `${prefix}${new Intl.NumberFormat("ru-RU").format(offer.price)} ₽${suffix}`;
}

export function formatOfferAmount(
  value: number,
  locale: Locale,
  options: { from?: boolean; perMonth?: boolean; individual?: boolean; english?: { currency: string; rate: number } } = {},
): string {
  return formatPrice(value, locale, options);
}

export function scopeContractDetails(offer: Offer, locale: Locale): string[] {
  const ru = locale === "ru";
  const boundary = (value: ScopeBoundary): string => {
    const labels: Record<ScopeBoundary, LocalizedText> = {
      included: t("входит", "included"),
      excluded: t("не входит", "excluded"),
      "access-required": t("при предоставленном доступе", "with provided access"),
      "by-agreement": t("по отдельному согласованию", "by separate agreement"),
      "requires-owner-approval": t("граница уточняется до начала", "confirmed before work starts"),
    };
    return labels[value][locale];
  };
  const line = (ruLabel: string, enLabel: string, value: string | number) => `${ru ? ruLabel : enLabel}: ${value}`;
  const contract = offer.scopeContract;

  switch (contract.kind) {
    case "seo-audit":
      return [
        line("Адреса страниц", "Page URLs", contract.urls ?? (ru ? "после оценки" : "after review")),
        line("Шаблоны страниц", "Page templates", boundary(contract.templates)),
        line("Данные поисковых кабинетов", "Search-console data", boundary(contract.searchConsoles)),
        line("Сравнение с конкурентами", "Competitor comparison", boundary(contract.competitors)),
        line("Повторная проверка", "Repeat check", boundary(contract.recheck)),
      ];
    case "seo-promotion":
      return [
        line("Регионов", "Regions", contract.regions ?? (ru ? "после оценки" : "after review")),
        line("Приоритетных страниц в месяц", "Priority pages per month", contract.pages ?? (ru ? "после оценки" : "after review")),
        line("Материалов в месяц", "Content items per month", contract.materials ?? (ru ? "после оценки" : "after review")),
        line("Часов исправлений в месяц", "Implementation hours per month", contract.editHours ?? (ru ? "после оценки" : "after review")),
        line("Публикация", "Publishing", boundary(contract.publishing)),
      ];
    case "web-development":
      return [
        line("Страницы", "Pages", contract.pages ?? (ru ? "фиксируются после проектирования" : "confirmed after discovery")),
        line("Интеграции", "Integrations", boundary(contract.integrations)),
        line("Размещение сайта", "Deployment", boundary(contract.deployment)),
        line("Репозиторий исходников", "Source repository", boundary(contract.repository)),
        line("Гарантия и поддержка", "Warranty and support", boundary(contract.supportBoundary)),
      ];
    case "marketplaces":
      return [
        line("Артикулов", "SKUs", contract.skus ?? (ru ? "после оценки" : "after review")),
        line("Кадров", "Frames", contract.frames ?? (ru ? "не заявлено" : "not stated")),
        line("Исходные файлы", "Source files", boundary(contract.sourceFiles)),
        line("Публикация", "Publishing", boundary(contract.publishing)),
        line("Модерация площадки", "Platform moderation", boundary(contract.moderation)),
      ];
    case "yandex-ads":
      return [
        line("Услуги и регионы", "Services and regions", ru ? "фиксируются до начала" : "confirmed before work starts"),
        line("Кампании и группы", "Campaigns and groups", ru ? "фиксируются до начала" : "confirmed before work starts"),
        line("Цели аналитики", "Analytics goals", boundary(contract.goals)),
        line("Рекламный бюджет", "Media spend", ru ? "не входит" : "excluded"),
      ];
    case "content-materials":
      return [
        line("Материалов", "Content items", contract.volume),
        line("Проверка фактов", "Fact checking", boundary(contract.factCheck)),
        line("Название и описание страницы", "Page title and description", boundary(contract.metadata)),
        line("Публикация", "Publishing", boundary(contract.publishing)),
        line("Раундов правок", "Revision rounds", contract.revisions),
      ];
    case "custom-task":
      return [
        line("Исходные данные", "Inputs", boundary(contract.inputs)),
        line("Зависимости", "Dependencies", boundary(contract.dependencies)),
        line("Первый этап", "First stage", boundary(contract.firstStage)),
        line("Проверка готовности", "Acceptance check", boundary(contract.acceptance)),
      ];
  }
}

export function offerBriefHref(offerId: string, locale: Locale): string {
  const prefix = locale === "en" ? "/en" : "";
  return `${prefix}/brief?offer=${encodeURIComponent(offerId)}`;
}
