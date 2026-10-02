import type { BriefService } from "../content/brief";
import type { MarketplaceId } from "../content/marketplaces";
import { formatPrice, prices } from "./prices";
import { localizedPath, type Locale } from "./site";

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
  implementationHours: number | null;
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
    description: t("Получите список найденных проблем на открытых страницах и поймёте, нужна ли более подробная проверка.", "Receive a list of findings on public pages and decide whether a more detailed review is needed."),
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
      t("Понятные следующие шаги", "Plain-language next steps"),
    ],
    recommended: false,
    briefType: "audit",
    scope: t("До 10 открытых страниц", "Up to 10 public pages"),
  },
  {
    id: "seo-audit-50",
    service: "seo-audit",
    title: t("Проверка ключевых страниц", "Key-page review"),
    shortTitle: t("Ключевые страницы", "Key pages"),
    description: t("Если непонятно, с чего начать работу с небольшим сайтом, проверим важные страницы и покажем первые исправления.", "If you are unsure where to start with a small site, we review its important pages and identify the first fixes."),
    price: prices.audits.express,
    oldPrice: null,
    priceType: "fixed",
    billingUnit: "project",
    pageLimit: 50,
    duration: t("3–5 рабочих дней", "3–5 working days"),
    result: t("Отчёт с примерами ошибок на конкретных страницах и планом исправлений по приоритету", "A report with issue examples on specific pages and a prioritised fix plan"),
    features: [t("Проверим ключевые страницы и их доступность для поиска", "Review key pages and whether search engines can access them"), t("Покажем ошибки на конкретных адресах", "Show issues on specific URLs"), t("Разделим обязательные исправления и улучшения", "Separate required fixes from optional improvements"), t("Разберём отчёт и ответим на вопросы", "Walk through the report and answer your questions")],
    recommended: false,
    briefType: "audit",
    scope: t("До 50 страниц", "Up to 50 pages"),
  },
  {
    id: "seo-audit-200",
    service: "seo-audit",
    title: t("Технический SEO-аудит", "Technical SEO audit"),
    shortTitle: t("Технический аудит", "Technical audit"),
    description: t("Проверим ошибки, которые затрагивают разные страницы сайта, и передадим разработчику задачи с адресами и критериями проверки.", "We review issues affecting multiple pages and give your developer tasks with page URLs and verification criteria."),
    price: prices.audits.full,
    oldPrice: null,
    priceType: "fixed",
    billingUnit: "project",
    pageLimit: 200,
    duration: t("5–7 рабочих дней", "5–7 working days"),
    result: t("Подробный список задач с доказательствами, адресами страниц и критериями проверки", "A detailed task list with evidence, page URLs and verification criteria"),
    features: [t("Проверим до 200 страниц и повторяющиеся шаблоны", "Review up to 200 pages and repeated templates"), t("Дадим примеры с адресами страниц для каждой проблемы", "Provide page URL examples for every issue"), t("Проверим внутренние ссылки и скорость загрузки", "Review internal links and loading speed"), t("Подготовим понятные задачи для разработчика", "Prepare clear, developer-ready tasks")],
    recommended: true,
    briefType: "audit",
    scope: t("До 200 страниц", "Up to 200 pages"),
  },
  {
    id: "seo-audit-500",
    service: "seo-audit",
    title: t("SEO-аудит с планом продвижения", "SEO audit with a growth plan"),
    shortTitle: t("Аудит и план", "Audit and plan"),
    description: t("Когда нужен план продвижения, проверим сайт, изучим поисковый спрос и конкурентов и распишем работу на три месяца.", "When you need a search plan, we review the site, demand and competitors, then set out three months of work."),
    price: prices.audits.strategy,
    oldPrice: null,
    priceType: "fixed",
    billingUnit: "project",
    pageLimit: 500,
    duration: t("7–10 рабочих дней", "7–10 working days"),
    result: t("Аудит до 500 страниц и план работ на три месяца с понятной очередностью задач", "An audit of up to 500 pages and a three-month action plan with a clear task order"),
    features: [t("Проверим до 500 страниц и основные шаблоны сайта", "Review up to 500 pages and the main site templates"), t("Соберём структуру поискового спроса", "Build a search-demand structure"), t("Сравним сайт с видимыми конкурентами", "Compare the website with visible competitors"), t("Распишем работы на ближайшие три месяца", "Set out the work for the next three months")],
    recommended: false,
    briefType: "audit",
    scope: t("До 500 страниц; больше — по отдельной оценке", "Up to 500 pages; larger sites are quoted separately"),
  },
  {
    id: "seo-audit-implementation",
    service: "seo-audit",
    title: t("Аудит с исправлениями", "Audit with implementation"),
    shortTitle: t("Проверка и правки", "Review and fixes"),
    description: t("Проверим сайт, внесём согласованные исправления, покажем список изменений и повторно проверим затронутые страницы.", "We audit the site, make the agreed fixes, show what changed and recheck the affected pages."),
    price: prices.audits.implementation.from,
    oldPrice: null,
    priceType: "from",
    billingUnit: "project",
    pageLimit: 200,
    duration: t("Срок после проверки сайта", "Timing after the website review"),
    result: t("Исправления и повторная проверка", "Implemented fixes and a repeat check"),
    features: [t("Технический аудит до 200 страниц", "Technical audit of up to 200 pages"), t("До 12 часов согласованных правок", "Up to 12 hours of agreed fixes"), t("Список внесённых изменений", "Change log"), t("Повторная проверка", "Repeat verification")],
    exclusions: [
      t("Исправления сверх 12 часов и новые функции оцениваются отдельно.", "Fixes beyond 12 hours and new features are quoted separately."),
      t("Закрытые системы без предоставленного доступа не проверяются.", "Private systems are excluded unless access is provided."),
      t("Позиции в поиске, трафик и продажи не гарантируются.", "Rankings, traffic and sales are not guaranteed."),
    ],
    recommended: false,
    briefType: "audit",
    scope: t("Аудит до 200 страниц и до 12 часов правок", "Audit up to 200 pages and up to 12 hours of fixes"),
  },
  {
    id: "seo-promotion-start",
    service: "seo-promotion",
    title: t("Ключевые страницы", "Priority pages"),
    shortTitle: t("Ключевые страницы", "Priority pages"),
    description: t("Для сайта услуг в одном регионе: каждый месяц улучшаем пять важных страниц и готовим один новый материал.", "For a service site in one region: each month we improve five priority pages and prepare one new content item."),
    price: prices.seo.base,
    oldPrice: null,
    priceType: "from",
    billingUnit: "month",
    pageLimit: 5,
    duration: t("Ежемесячная работа", "Monthly service"),
    result: t("Обновлённые страницы, новый материал и отчёт о работе за месяц", "Updated pages, a new content item and a report on the month's work"),
    features: [t("Работаем с 5 приоритетными страницами", "Work on 5 priority pages"), t("Готовим 1 новый материал для сайта", "Prepare 1 new website content item"), t("Включаем до 3 часов согласованных правок", "Include up to 3 hours of agreed fixes"), t("Контролируем индексацию изменённых страниц", "Monitor indexing of the updated pages")],
    recommended: false,
    briefType: "seo",
    scope: t("Один регион, 5 страниц и 1 материал", "One region, 5 pages and 1 content item"),
  },
  {
    id: "seo-promotion-growth",
    service: "seo-promotion",
    title: t("Страницы и материалы", "Pages and content"),
    shortTitle: t("Страницы и материалы", "Pages and content"),
    description: t("Сайт охватывает несколько разделов или регионов. Каждый месяц улучшаем десять страниц, готовим два материала и разбираем результат.", "For a site covering several sections or regions, we improve ten pages, prepare two content items and review the outcome each month."),
    price: prices.seo.growth,
    oldPrice: null,
    priceType: "fixed",
    billingUnit: "month",
    pageLimit: 10,
    duration: t("Ежемесячная работа", "Monthly service"),
    result: t("Обновлённые страницы, два новых материала и план следующего месяца", "Updated pages, two new content items and a plan for the next month"),
    features: [t("Работаем с 10 приоритетными страницами", "Work on 10 priority pages"), t("Готовим 2 новых материала для сайта", "Prepare 2 new website content items"), t("Включаем до 6 часов согласованных правок", "Include up to 6 hours of agreed fixes"), t("Проводим встречу по результатам месяца", "Hold a monthly results review")],
    recommended: true,
    briefType: "seo",
    scope: t("До 2 регионов, 10 страниц и 2 материала", "Up to 2 regions, 10 pages and 2 content items"),
  },
  {
    id: "seo-promotion-team",
    service: "seo-promotion",
    title: t("Несколько направлений", "Multiple service lines"),
    shortTitle: t("Несколько направлений", "Multiple service lines"),
    description: t("Для компании с несколькими направлениями: ведём до двадцати страниц, готовим четыре материала и еженедельно показываем ход работ.", "For several service lines: we work on up to twenty pages, prepare four content items and share weekly progress."),
    price: prices.seo.full,
    oldPrice: null,
    priceType: "from",
    billingUnit: "month",
    pageLimit: 20,
    duration: t("Ежемесячная работа", "Monthly service"),
    result: t("Обновлённые страницы, четыре материала и еженедельный статус работ", "Updated pages, four content items and a weekly work update"),
    features: [t("Работаем с 20 приоритетными страницами", "Work on 20 priority pages"), t("Готовим 4 новых материала для сайта", "Prepare 4 new website content items"), t("Включаем до 10 часов согласованных правок", "Include up to 10 hours of agreed fixes"), t("Присылаем статус работ каждую неделю", "Send a weekly work status")],
    recommended: false,
    briefType: "seo",
    scope: t("До 3 регионов, 20 страниц и 4 материала", "Up to 3 regions, 20 pages and 4 content items"),
  },
  {
    id: "development-start",
    service: "web-development",
    title: t("Лендинг", "Landing page"),
    shortTitle: t("Лендинг", "Landing page"),
    description: t("Для одной услуги или нового предложения: соберём страницу, где посетитель поймёт условия и сможет оставить заявку.", "For one service or a new offer: we build a page that explains the terms and lets visitors send an enquiry."),
    price: prices.development.landing,
    oldPrice: null,
    priceType: "from",
    billingUnit: "project",
    pageLimit: 1,
    duration: t("Обычно 10–14 дней после получения материалов", "Usually 10–14 days after materials are received"),
    result: t("Готовый адаптивный лендинг с рабочими формами и подключённой аналитикой", "A ready-to-use responsive landing page with working forms and analytics"),
    features: [t("Продумываем структуру и прототип страницы", "Plan the page structure and prototype"), t("Разрабатываем дизайн под задачу и бренд", "Create a design for the brief and brand"), t("Адаптируем все экраны для телефона", "Adapt every section for mobile"), t("Подключаем формы и базовую аналитику", "Connect forms and core analytics")],
    recommended: false,
    briefType: "development",
    scope: t("Одна услуга на одном языке, до 7 блоков и 1 форма", "One service in one language, up to 7 sections and 1 form"),
  },
  {
    id: "development-business",
    service: "web-development",
    title: t("Сайт компании", "Company website"),
    shortTitle: t("Сайт компании", "Company website"),
    description: t("Разделим услуги и информацию о компании по понятным страницам, добавим формы заявок и возможность обновлять содержание.", "We give services and company information clear pages, add enquiry forms and make the content editable."),
    price: prices.development.corporate,
    oldPrice: null,
    priceType: "fixed",
    billingUnit: "project",
    pageLimit: 10,
    duration: t("Обычно 14–21 день после получения материалов", "Usually 14–21 days after materials are received"),
    result: t("Готовый сайт компании с удобным управлением содержимым и подготовкой к поиску", "A complete company website with manageable content and search foundations"),
    features: [t("Проектируем структуру услуг и разделов", "Plan the service and section structure"), t("Разрабатываем дизайн ключевых страниц", "Design the key pages"), t("Собираем адаптивную версию для всех экранов", "Build a responsive version for every screen"), t("Настраиваем базовую техническую подготовку к поиску", "Set up the core technical search foundations")],
    recommended: true,
    briefType: "development",
    scope: t("До 5 шаблонов и 10 готовых страниц", "Up to 5 templates and 10 finished pages"),
  },
  {
    id: "development-max",
    service: "web-development",
    title: t("Каталог товаров", "Product catalogue"),
    shortTitle: t("Каталог товаров", "Product catalogue"),
    description: t("Покупатель сможет выбрать товар, собрать корзину и отправить заказ заявкой. Онлайн-оплату и доставку оценим отдельно.", "Shoppers can choose products, use a cart and send an order enquiry. Online payment and delivery are quoted separately."),
    price: prices.development.commerce.from,
    oldPrice: null,
    priceType: "from",
    billingUnit: "project",
    pageLimit: null,
    duration: t("Обычно 21–35 дней после получения материалов", "Usually 21–35 days after materials are received"),
    result: t("Каталог до 100 товаров с карточками, корзиной, заказом через заявку и исходным кодом", "A catalogue for up to 100 products with product pages, cart, order enquiries and source code"),
    features: [t("Создаём каталог и карточки товаров", "Build the catalogue and product pages"), t("Настраиваем корзину и отправку заказа через заявку", "Set up a cart and order enquiry"), t("Загружаем согласованный список товаров", "Import the agreed product list"), t("Передаём исходный код проекта", "Hand over the project source code")],
    recommended: false,
    briefType: "development",
    scope: t("Базовый каталог до 100 товаров с заказом через заявку", "Basic catalogue with up to 100 products and order enquiries"),
    exclusions: [
      t("Онлайн-оплата, расчёт доставки и интеграции с внешними системами оцениваются отдельно.", "Online payment, delivery calculation and external integrations are quoted separately."),
      t("Хостинг, платные лицензии и контент не входят без отдельного согласования.", "Hosting, paid licences and content are excluded unless agreed separately."),
    ],
  },
  {
    id: "yandex-ads-setup",
    service: "yandex-ads",
    title: t("Настройка рекламы", "Campaign setup"),
    shortTitle: t("Настройка", "Setup"),
    description: t("Для одной услуги в одном регионе подготовим кампании, уберём неподходящие запросы и настроим измерение заявок и звонков.", "For one service in one region, we prepare campaigns, exclude irrelevant searches and set up enquiry and call tracking."),
    price: prices.ads.setup,
    oldPrice: null,
    priceType: "fixed",
    billingUnit: "project",
    pageLimit: null,
    duration: t("7–10 рабочих дней", "7–10 working days"),
    result: t("Кампании, готовые к запуску после согласования бюджета, с настроенными целями для заявок и звонков", "Campaigns ready to launch once the budget is agreed, with enquiry and call goals configured"),
    features: [t("Разделяем кампании по услугам и задачам", "Structure campaigns by service and goal"), t("Готовим объявления и варианты текстов", "Prepare ads and copy variations"), t("Добавляем исключения для нерелевантных запросов", "Add exclusions for irrelevant queries"), t("Настраиваем цели для заявок и звонков", "Configure goals for enquiries and calls")],
    recommended: true,
    briefType: "ads",
    scope: t("Одна услуга, один регион, до 3 кампаний и 100 запросов", "One service, one region, up to 3 campaigns and 100 queries"),
  },
  {
    id: "yandex-ads-support",
    service: "yandex-ads",
    title: t("Ведение рекламы", "Campaign management"),
    shortTitle: t("Ведение", "Management"),
    description: t("Проверяем, на какие запросы уходит бюджет, отключаем нецелевые запросы и сверяем кампании с измеренными обращениями.", "We review where the budget goes, exclude irrelevant searches and compare campaigns with measurable enquiries."),
    price: prices.ads.support,
    oldPrice: null,
    priceType: "fixed",
    billingUnit: "month",
    pageLimit: null,
    duration: t("Ежемесячная работа", "Monthly service"),
    result: t("Список изменений за месяц и отчёт по расходам, запросам и измеренным обращениям", "A monthly change log and a report on spend, searches and measurable enquiries"),
    features: [t("Проверяем реальные поисковые запросы", "Review actual search queries"), t("Корректируем ставки и распределение бюджета", "Adjust bids and budget allocation"), t("Сверяем рекламу с полученными обращениями", "Compare advertising data with received enquiries"), t("Объясняем, что изменили и почему", "Explain what changed and why")],
    recommended: false,
    briefType: "ads",
    scope: t("До 5 кампаний при рекламном бюджете до 150 000 ₽ в месяц", "Up to 5 campaigns with monthly media spend of up to RUB 150,000"),
  },
  {
    id: "content-article",
    service: "content-materials",
    title: t("Материал для сайта", "Website content item"),
    shortTitle: t("Один материал", "One content item"),
    description: t("Подготовим текст страницы или статьи на основе ваших фактов: согласуем задачу, раскроем тему и добавим заголовок и описание для поиска.", "We prepare page or article copy from your facts, agree the brief, cover the topic and add a search title and description."),
    price: prices.content.article,
    oldPrice: null,
    priceType: "fixed",
    billingUnit: "project",
    pageLimit: 1,
    duration: t("После уточнения задачи", "After scope clarification"),
    result: t("Готовый к публикации текст со структурой, заголовком и описанием страницы", "Publication-ready copy with a structure, page title and description"),
    features: [t("Согласовываем задачу и план материала", "Agree the brief and content outline"), t("Пишем полный текст на основе фактов клиента", "Write the full copy from client-provided facts"), t("Готовим название и описание страницы для поиска", "Prepare the page title and search description"), t("Вносим один согласованный раунд правок", "Include one agreed revision round")],
    recommended: true,
    briefType: "custom",
    scope: t("Один материал с одним раундом правок", "One content item with one revision round"),
  },
  {
    id: "custom-task-consultation",
    service: "custom-task",
    title: t("Разбор нестандартной задачи", "Non-standard task review"),
    shortTitle: t("Разбор задачи", "Task review"),
    description: t("Разберём задачу, если она не подходит под готовые тарифы, и выделим первый этап с самостоятельным результатом.", "Review a task that does not fit the standard packages and define a first stage with a useful standalone outcome."),
    price: null,
    oldPrice: null,
    priceType: "custom",
    billingUnit: "project",
    pageLimit: null,
    duration: t("Срок определим после короткого брифа", "Timing is confirmed after a short brief"),
    result: t("Письменный состав первого этапа, срок, стоимость и критерии приёмки до начала работы", "A written first-stage scope, timing, price and acceptance criteria before work begins"),
    features: [t("Фиксируем текущее состояние и исходные данные", "Record the current state and available inputs"), t("Определяем конкретный результат первого этапа", "Define the first-stage deliverable"), t("Учитываем зависимости и ограничения", "Account for dependencies and constraints"), t("Согласуем, как будет приниматься работа", "Agree how the work will be accepted")],
    recommended: false,
    briefType: "custom",
    scope: t("Состав после короткого брифа", "Scope after a short brief"),
  },
  {
    id: "marketplace-pack-10",
    service: "marketplaces",
    title: t("SEO и тексты для 10 карточек", "SEO and copy for 10 product cards"),
    shortTitle: t("Пакет из 10 карточек", "10-card pack"),
    description: t("Для линейки похожих товаров соберём общие поисковые фразы и подготовим отдельные тексты и характеристики для каждого из десяти артикулов.", "For a range of related products, we research shared search phrases and prepare distinct copy and attributes for each of ten SKUs."),
    price: prices.marketplaces.pack10,
    oldPrice: null,
    priceType: "fixed",
    billingUnit: "project",
    pageLimit: 10,
    duration: t("Срок после проверки исходных материалов", "Timing after source-material review"),
    result: t("Готовые названия, описания и характеристики для десяти артикулов одной категории", "Ready titles, descriptions and attributes for ten SKUs in one category"),
    features: [
      t("Собираем поисковые фразы для всей категории", "Research search phrases for the whole category"),
      t("Готовим названия для 10 артикулов", "Prepare titles for 10 SKUs"),
      t("Пишем описания с учётом различий товаров", "Write descriptions that reflect product differences"),
      t("Заполняем характеристики для фильтров", "Prepare attributes for marketplace filters"),
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
    description: t("Соберём короткое видео для карточки из ваших фото и видео. Съёмка не входит.", "We create a short product-card video from your photos and footage. Filming is excluded."),
    price: prices.marketplaces.extras.videoPerItem,
    oldPrice: null,
    priceType: "fixed",
    billingUnit: "sku",
    pageLimit: 1,
    duration: t("Срок вместе с основной работой", "Timing follows the main scope"),
    result: t("Готовый файл MP4 для одного артикула в согласованном формате площадки", "An MP4 file for one SKU in the platform format agreed in the brief"),
    features: [t("Монтаж из материалов клиента", "Editing from client-supplied assets"), t("Ролик до 15 секунд", "Video up to 15 seconds"), t("Один раунд правок", "One revision round")],
    exclusions: [t("Съёмка, озвучка и дополнительные раунды правок оцениваются отдельно.", "Filming, voice-over and extra revision rounds are quoted separately.")],
    recommended: false,
    briefType: "marketplaces",
    scope: t("Один ролик до 15 секунд и один раунд правок для одного артикула", "One video up to 15 seconds and one revision round for one SKU"),
  },
  {
    id: "marketplace-analytics-addon",
    service: "marketplaces",
    availability: "calculator-addon",
    title: t("Регулярная аналитика карточек", "Recurring product-card analytics"),
    shortTitle: t("Аналитика", "Analytics"),
    description: t("Раз в месяц сравним показатели карточек одной площадки и покажем, что стоит исправить сначала.", "Each month we compare product-card metrics on one platform and identify the first changes to make."),
    price: prices.marketplaces.extras.analytics,
    oldPrice: null,
    priceType: "fixed",
    billingUnit: "month",
    pageLimit: 10,
    duration: t("Один месяц", "One month"),
    result: t("Отчёт по динамике до 10 артикулов с перечнем следующих действий", "A report on up to 10 SKUs with recommended next steps"),
    features: [t("До 10 артикулов одной площадки", "Up to 10 SKUs on one platform"), t("Один отчёт в месяц", "One report per month"), t("Сравнение доступных показателей и приоритетные правки", "Comparison of available metrics and priority changes")],
    exclusions: [t("Доступ к статистике предоставляет клиент. Реклама, публикация и исправление карточек не входят.", "The client provides access to analytics. Advertising, publishing and card edits are excluded.")],
    recommended: false,
    briefType: "marketplaces",
    scope: t("До 10 артикулов одной площадки, один отчёт за месяц при доступе к статистике", "Up to 10 SKUs on one platform and one monthly report with analytics access"),
  },
  {
    id: "development-account-addon",
    service: "web-development",
    availability: "calculator-addon",
    title: t("Личный кабинет", "User account"),
    shortTitle: t("Личный кабинет", "User account"),
    description: t("Сделаем кабинет для одного типа пользователя: вход, профиль и просмотр своих заявок. Источник данных согласуем до расчёта.", "We build an account for one user type with sign-in, profile and access to their own enquiries. The data source is agreed before quoting."),
    price: prices.development.extras.account,
    oldPrice: null,
    priceType: "from",
    billingUnit: "project",
    pageLimit: null,
    duration: t("Срок после проверки сценариев и источника данных", "Timing after reviewing flows and the data source"),
    result: t("Рабочий кабинет с входом, профилем и своими заявками, проверенный без доступа к чужим данным", "A working account with sign-in, profile and own enquiries, checked for access isolation"),
    features: [t("Один тип пользователя", "One user type"), t("Вход и восстановление доступа", "Sign-in and account recovery"), t("Профиль и список своих заявок", "Profile and own enquiry list"), t("Проверка основных действий и прав доступа", "Checks of main flows and access rights")],
    exclusions: [t("Дополнительные роли, платежи и доработка сторонней системы оцениваются отдельно.", "Extra roles, payments and changes to third-party systems are quoted separately.")],
    recommended: false,
    briefType: "development",
    scope: t("Один тип пользователя, вход, профиль и свои заявки при доступном источнике данных", "One user type, sign-in, profile and own enquiries with an accessible data source"),
  },
  {
    id: "development-integrations-addon",
    service: "web-development",
    availability: "calculator-addon",
    title: t("Сложная интеграция", "Complex integration"),
    shortTitle: t("Интеграция", "Integration"),
    description: t("Свяжем сайт с одной внешней системой через документированный интерфейс. Поля и порядок обмена согласуем до расчёта.", "We connect the website to one external system through a documented interface. Data fields and transfer flow are agreed before quoting."),
    price: prices.development.extras.integrations,
    oldPrice: null,
    priceType: "from",
    billingUnit: "project",
    pageLimit: null,
    duration: t("Срок после проверки документации и доступа", "Timing after reviewing documentation and access"),
    result: t("Проверенный обмен одной сущности между сайтом и внешней системой", "A verified transfer of one data entity between the site and the external system"),
    features: [t("Карта полей и запуск обмена", "Field mapping and transfer trigger"), t("Одна сущность в одном направлении", "One entity in one direction"), t("Обработка ошибок обмена", "Transfer error handling"), t("Проверка на тестовых данных", "Verification with test data")],
    exclusions: [t("Доработка сторонней системы, платный доступ к её интерфейсу и дополнительные потоки данных оцениваются отдельно.", "Third-party changes, paid API access and extra data flows are quoted separately.")],
    recommended: false,
    briefType: "development",
    scope: t("Одна система, одна сущность и одно направление обмена при доступном интерфейсе", "One system, one entity and one transfer direction with an accessible interface"),
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
    description: t("Сравним карточку с видимыми конкурентами и покажем, какие поля, тексты и изображения стоит исправить сначала.", "We compare the listing with visible competitors and show which fields, copy and images need attention first."),
    price: prices.marketplaces.audit,
    duration: t("2 рабочих дня", "2 working days"),
    result: t("Список конкретных правок для одной карточки по приоритету", "A prioritised list of specific fixes for one listing"),
    scope: t("Разбор одной карточки без публикации", "Review of one card without publishing"),
    features: [t("Категория и обязательные поля", "Category and required fields"), t("Название, описание и изображения", "Title, description and images"), t("Сравнение с видимыми конкурентами", "Visible competitor comparison")],
    recommended: false,
  },
  {
    key: "optimization",
    title: t("Текст и SEO карточки", "Card copy and SEO"),
    description: t("Подберём запросы для товара и подготовим название, описание и характеристики без повторов ключевых слов.", "We research product searches and prepare the title, description and attributes without repeating keywords needlessly."),
    price: prices.marketplaces.optimization,
    duration: t("3–4 рабочих дня", "3–4 working days"),
    result: t("Название, описание, характеристики и карта поисковых фраз для одного артикула", "A title, description, attributes and search-phrase map for one SKU"),
    scope: t("Один артикул с одним раундом правок", "One SKU with one revision round"),
    features: [t("Карта поисковых фраз", "Search-phrase map"), t("Название и описание", "Title and description"), t("Характеристики для фильтров", "Filter-ready attributes"), t("Чек-лист публикации", "Publishing checklist")],
    recommended: true,
  },
  {
    key: "turnkey",
    title: t("Карточка с визуальной упаковкой", "Card with visual packaging"),
    description: t("На основе ваших материалов подготовим текст и до шести оформленных кадров, которые объясняют свойства товара покупателю.", "Using your materials, we prepare copy and up to six designed frames that explain the product's features to shoppers."),
    price: prices.marketplaces.turnkey,
    duration: t("5–7 рабочих дней", "5–7 working days"),
    result: t("Тексты, характеристики, до шести оформленных кадров и исходные файлы", "Copy, attributes, up to six designed frames and source files"),
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
      t("Количество заявок и продаж зависит от спроса, бюджета и посадочной страницы; мы не обещаем их заранее.", "Enquiry and sales volumes depend on demand, budget and the landing page; we do not promise them in advance."),
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
      implementationHours: isImplementation ? 12 : null,
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
      templates: input.id === "development-start" ? 1 : input.id === "development-business" ? 5 : null,
      pages: input.pageLimit,
      states: "by-agreement",
      integrations: input.id === "development-max" || input.id === "development-integrations-addon" ? "by-agreement" : "excluded",
      revisions: "requires-owner-approval",
      deployment: "by-agreement",
      repository: "included",
      ownership: "included",
      warranty: "included",
      supportBoundary: "excluded",
    };
  }

  if (input.service === "marketplaces") {
    const isTurnkey = input.id.endsWith("-turnkey");
    const isOptimization = input.id.endsWith("-optimization");
    return {
      kind: "marketplaces",
      platform: input.platform ?? "platform-agreed-in-brief",
      skus: input.pageLimit ?? 1,
      frames: isTurnkey ? 6 : null,
      sourceFiles: isTurnkey ? "included" : "by-agreement",
      publishing: "excluded",
      moderation: "excluded",
      revisions: isOptimization ? 1 : "requires-owner-approval",
    };
  }

  if (input.service === "yandex-ads") {
    const isSetup = input.id === "yandex-ads-setup";
    return {
      kind: "yandex-ads",
      services: isSetup ? 1 : "requires-owner-approval",
      regions: isSetup ? 1 : "requires-owner-approval",
      campaigns: isSetup ? 3 : 5,
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
        ...(contract.implementationHours === null ? [] : [line("Включённые часы исправлений", "Included fix hours", contract.implementationHours)]),
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
        line("Шаблоны страниц", "Page templates", contract.templates ?? (ru ? "фиксируются после проектирования" : "confirmed after discovery")),
        line("Страницы", "Pages", contract.pages ?? (ru ? "фиксируются после проектирования" : "confirmed after discovery")),
        line("Интеграции", "Integrations", boundary(contract.integrations)),
        line("Размещение сайта", "Deployment", boundary(contract.deployment)),
        line("Репозиторий исходников", "Source repository", boundary(contract.repository)),
        line("Исправление ошибок после сдачи", "Post-delivery defect fixes", contract.warranty === "included" ? (ru ? "30 календарных дней" : "30 calendar days") : boundary(contract.warranty)),
        line("Техническая поддержка после сдачи", "Post-delivery support", boundary(contract.supportBoundary)),
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
  return `${localizedPath(locale, "brief")}?offer=${encodeURIComponent(offerId)}`;
}
