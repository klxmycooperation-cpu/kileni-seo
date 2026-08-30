import type { BriefService } from "../content/brief";
import type { MarketplaceId } from "../content/marketplaces";
import { prices } from "./prices";
import type { Locale } from "./site";

export type LocalizedText = Readonly<{ ru: string; en: string }>;
export type OfferBillingUnit = "project" | "month" | "sku";
export type OfferPriceMode = "fixed" | "from" | "individual";
export type OfferService =
  | "seo-audit"
  | "seo-promotion"
  | "web-development"
  | "marketplaces"
  | "yandex-ads"
  | "content-materials"
  | "custom-task";

export type Offer = Readonly<{
  id: string;
  service: OfferService;
  title: LocalizedText;
  shortTitle: LocalizedText;
  description: LocalizedText;
  price: number | null;
  oldPrice: number | null;
  priceMode: OfferPriceMode;
  billingUnit: OfferBillingUnit;
  pageLimit: number | null;
  duration: LocalizedText;
  result: LocalizedText;
  features: readonly LocalizedText[];
  recommended: boolean;
  discount: number | null;
  briefType: BriefService;
  platform?: MarketplaceId;
  scope: LocalizedText;
}>;

export type LocalizedOffer = Omit<Offer, "title" | "shortTitle" | "description" | "duration" | "result" | "features" | "scope"> & {
  title: string;
  shortTitle: string;
  description: string;
  duration: string;
  result: string;
  features: string[];
  scope: string;
};

const t = (ru: string, en: string): LocalizedText => ({ ru, en });

const coreOffers: Offer[] = [
  {
    id: "seo-audit-free",
    service: "seo-audit",
    title: t("Бесплатная проверка", "Free website check"),
    shortTitle: t("До 10 страниц", "Up to 10 pages"),
    description: t("Автоматически проверим открытые страницы и покажем основные найденные проблемы.", "Automatically check public pages and show the main issues found."),
    price: prices.audits.preliminary,
    oldPrice: null,
    priceMode: "fixed",
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
    discount: null,
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
    priceMode: "fixed",
    billingUnit: "project",
    pageLimit: 50,
    duration: t("3–5 рабочих дней", "3–5 working days"),
    result: t("Короткий отчёт и порядок исправлений", "A concise report and fix order"),
    features: [t("Проверка ключевых страниц", "Key-page review"), t("Примеры проблем", "Issue examples"), t("Порядок исправлений", "Fix order"), t("Разбор результата", "Results walkthrough")],
    recommended: false,
    discount: null,
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
    priceMode: "fixed",
    billingUnit: "project",
    pageLimit: 200,
    duration: t("5–7 рабочих дней", "5–7 working days"),
    result: t("Подробный список задач с доказательствами", "A detailed evidence-based task list"),
    features: [t("Проверка страниц и шаблонов", "Page and template review"), t("Ошибки на конкретных адресах", "Issues on specific URLs"), t("Проверка скорости", "Speed review"), t("Задачи для разработчика", "Developer-ready tasks")],
    recommended: true,
    discount: null,
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
    priceMode: "fixed",
    billingUnit: "project",
    pageLimit: 500,
    duration: t("7–10 рабочих дней", "7–10 working days"),
    result: t("Аудит и план развития на три месяца", "Audit and a three-month growth plan"),
    features: [t("Проверка до 500 страниц", "Review up to 500 pages"), t("Структура поискового спроса", "Search-demand structure"), t("Сравнение с конкурентами", "Competitor comparison"), t("План на три месяца", "Three-month plan")],
    recommended: false,
    discount: null,
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
    priceMode: "from",
    billingUnit: "project",
    pageLimit: 200,
    duration: t("Срок после проверки сайта", "Timing after the website review"),
    result: t("Исправления и повторная проверка", "Implemented fixes and a repeat check"),
    features: [t("Полный аудит", "Full audit"), t("До 12 часов согласованных правок", "Up to 12 hours of agreed fixes"), t("Список внесённых изменений", "Change log"), t("Повторная проверка", "Repeat verification")],
    recommended: false,
    discount: null,
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
    priceMode: "from",
    billingUnit: "month",
    pageLimit: 5,
    duration: t("Ежемесячная работа", "Monthly service"),
    result: t("Исправленные приоритетные страницы и один новый материал", "Improved priority pages and one new content item"),
    features: [t("5 приоритетных страниц", "5 priority pages"), t("1 материал в месяц", "1 content item per month"), t("До 3 часов правок", "Up to 3 hours of fixes")],
    recommended: false,
    discount: null,
    briefType: "seo",
    scope: t("1 регион · 5 страниц · 1 материал", "1 region · 5 pages · 1 content item"),
  },
  {
    id: "seo-promotion-growth",
    service: "seo-promotion",
    title: t("Развитие", "Growth"),
    shortTitle: t("Развитие", "Growth"),
    description: t("Для регулярного улучшения страниц и расширения поискового спроса.", "For regular page improvements and broader search demand."),
    price: prices.seo.growth,
    oldPrice: null,
    priceMode: "fixed",
    billingUnit: "month",
    pageLimit: 10,
    duration: t("Ежемесячная работа", "Monthly service"),
    result: t("Регулярные исправления и новые страницы", "Regular fixes and new pages"),
    features: [t("10 приоритетных страниц", "10 priority pages"), t("2 материала в месяц", "2 content items per month"), t("До 6 часов правок", "Up to 6 hours of fixes"), t("Встреча раз в месяц", "Monthly review call")],
    recommended: true,
    discount: null,
    briefType: "seo",
    scope: t("До 2 регионов · 10 страниц · 2 материала", "Up to 2 regions · 10 pages · 2 content items"),
  },
  {
    id: "seo-promotion-team",
    service: "seo-promotion",
    title: t("Команда", "Team"),
    shortTitle: t("Команда", "Team"),
    description: t("Для нескольких направлений с постоянными задачами по сайту.", "For several business directions with ongoing website work."),
    price: prices.seo.full,
    oldPrice: null,
    priceMode: "from",
    billingUnit: "month",
    pageLimit: 20,
    duration: t("Ежемесячная работа", "Monthly service"),
    result: t("Постоянная работа с сайтом и еженедельный статус", "Ongoing website work and a weekly status"),
    features: [t("20 приоритетных страниц", "20 priority pages"), t("4 материала в месяц", "4 content items per month"), t("До 10 часов правок", "Up to 10 hours of fixes"), t("Статус раз в неделю", "Weekly status")],
    recommended: false,
    discount: null,
    briefType: "seo",
    scope: t("До 3 регионов · 20 страниц · 4 материала", "Up to 3 regions · 20 pages · 4 content items"),
  },
  {
    id: "development-start",
    service: "web-development",
    title: t("Start", "Start"),
    shortTitle: t("Лендинг", "Landing page"),
    description: t("Одностраничный сайт для одной услуги или предложения.", "A one-page website for one service or offer."),
    price: prices.development.landing,
    oldPrice: null,
    priceMode: "from",
    billingUnit: "project",
    pageLimit: 1,
    duration: t("Обычно 5–7 недель", "Usually 5–7 weeks"),
    result: t("Рабочий адаптивный лендинг с формами и аналитикой", "A responsive landing page with forms and analytics"),
    features: [t("Структура и прототип", "Structure and prototype"), t("Оригинальный дизайн", "Original design"), t("Мобильная версия", "Mobile version"), t("Формы и аналитика", "Forms and analytics")],
    recommended: false,
    discount: null,
    briefType: "development",
    scope: t("Одна услуга · один язык", "One service · one language"),
  },
  {
    id: "development-business",
    service: "web-development",
    title: t("Business", "Business"),
    shortTitle: t("Сайт компании", "Company website"),
    description: t("Многостраничный сайт с понятной структурой услуг и материалов.", "A multi-page website with a clear service and content structure."),
    price: prices.development.corporate,
    oldPrice: null,
    priceMode: "fixed",
    billingUnit: "project",
    pageLimit: null,
    duration: t("Срок после короткого брифа", "Timing after a short brief"),
    result: t("Готовый сайт компании с управляемым содержимым", "A complete company website with manageable content"),
    features: [t("Структура страниц", "Page structure"), t("Дизайн ключевых экранов", "Key-screen design"), t("Адаптивная разработка", "Responsive development"), t("Подготовка к поиску", "Search preparation")],
    recommended: true,
    discount: null,
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
    priceMode: "from",
    billingUnit: "project",
    pageLimit: null,
    duration: t("Срок после проектирования", "Timing after discovery"),
    result: t("Рабочий каталог или магазин с нужными интеграциями", "A working catalogue or shop with the required integrations"),
    features: [t("Проектирование каталога", "Catalogue design"), t("Корзина или заявки", "Cart or enquiry flows"), t("Нужные интеграции", "Required integrations"), t("Передача исходников", "Source-code handover")],
    recommended: false,
    discount: null,
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
    priceMode: "fixed",
    billingUnit: "project",
    pageLimit: null,
    duration: t("7–10 рабочих дней", "7–10 working days"),
    result: t("Готовые к запуску кампании и настроенные цели", "Launch-ready campaigns and configured goals"),
    features: [t("Структура кампаний", "Campaign structure"), t("Объявления", "Ads"), t("Исключения", "Exclusions"), t("Настроенные цели", "Configured goals")],
    recommended: true,
    discount: null,
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
    priceMode: "fixed",
    billingUnit: "month",
    pageLimit: null,
    duration: t("Ежемесячная работа", "Monthly service"),
    result: t("Понятный список изменений и расходов", "A clear record of changes and spend"),
    features: [t("Проверка поисковых запросов", "Search-query review"), t("Корректировка ставок", "Bid adjustments"), t("Проверка обращений", "Enquiry review"), t("Отчёт по изменениям", "Change report")],
    recommended: false,
    discount: null,
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
    priceMode: "fixed",
    billingUnit: "project",
    pageLimit: 1,
    duration: t("После уточнения задачи", "After scope clarification"),
    result: t("Готовый к публикации материал", "A publication-ready content item"),
    features: [t("План", "Outline"), t("Текст", "Copy"), t("Название и описание страницы", "Page title and description"), t("Один раунд правок", "One revision round")],
    recommended: true,
    discount: null,
    briefType: "custom",
    scope: t("Один материал · один раунд правок", "One content item · one revision round"),
  },
  {
    id: "custom-task-consultation",
    service: "custom-task",
    title: t("Разбор нестандартной задачи", "Non-standard task review"),
    shortTitle: t("Разбор задачи", "Task review"),
    description: t("Сначала уточним цель, входные данные, ограничения и самостоятельный первый результат.", "First clarify the goal, inputs, constraints and a useful first deliverable."),
    price: null,
    oldPrice: null,
    priceMode: "individual",
    billingUnit: "project",
    pageLimit: null,
    duration: t("Срок определим после короткого брифа", "Timing is confirmed after a short brief"),
    result: t("Понятные границы первого этапа и смета до начала работы", "A clear first-stage scope and an estimate before work starts"),
    features: [t("Текущее состояние", "Current state"), t("Нужный результат", "Required outcome"), t("Зависимости и ограничения", "Dependencies and constraints"), t("Критерий готовности", "Acceptance check")],
    recommended: false,
    discount: null,
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
    priceMode: "fixed",
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
    discount: null,
    briefType: "marketplaces",
    scope: t("До 10 артикулов · изображения не входят", "Up to 10 SKUs · images excluded"),
  },
];

const marketplaceNames: Record<MarketplaceId, LocalizedText> = {
  wildberries: t("Wildberries", "Wildberries"),
  ozon: t("Ozon", "Ozon"),
  "yandex-market": t("Яндекс Маркет", "Yandex Market"),
  megamarket: t("Мегамаркет", "Megamarket"),
};

const marketplaceVariants = [
  {
    key: "audit",
    title: t("Разбор карточки", "Card review"),
    description: t("Покажем, что мешает карточке и что исправить сначала.", "Show what blocks the card and what to fix first."),
    price: prices.marketplaces.audit,
    duration: t("2 рабочих дня", "2 working days"),
    result: t("Список правок по приоритету", "Prioritised correction list"),
    scope: t("1 карточка · без публикации", "1 card · publishing excluded"),
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
    scope: t("1 артикул · 1 раунд правок", "1 SKU · 1 revision round"),
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
    scope: t("1 артикул · дизайн без фотосъёмки", "1 SKU · design without photography"),
    features: [t("Текст и характеристики", "Copy and attributes"), t("Сценарий изображений", "Image scenario"), t("До шести кадров", "Up to six frames"), t("Файлы для передачи", "Handover files")],
    recommended: false,
  },
] as const;

const marketplaceCatalog: Offer[] = (Object.keys(marketplaceNames) as MarketplaceId[]).flatMap((platform) =>
  marketplaceVariants.map((variant) => ({
    id: `marketplace-${platform}-${variant.key}`,
    service: "marketplaces" as const,
    title: t(`${variant.title.ru} · ${marketplaceNames[platform].ru}`, `${variant.title.en} · ${marketplaceNames[platform].en}`),
    shortTitle: variant.title,
    description: variant.description,
    price: variant.price,
    oldPrice: null,
    priceMode: "fixed" as const,
    billingUnit: "sku" as const,
    pageLimit: null,
    duration: variant.duration,
    result: variant.result,
    features: variant.features,
    recommended: variant.recommended,
    discount: null,
    briefType: "marketplaces" as const,
    platform,
    scope: variant.scope,
  })),
);

export const offerCatalog: readonly Offer[] = [...coreOffers, ...marketplaceCatalog];

const offersById = new Map(offerCatalog.map((offer) => [offer.id, offer]));

export function getOffer(id: string | null | undefined): Offer | undefined {
  return id ? offersById.get(id) : undefined;
}

export function offersForService(service: OfferService, platform?: MarketplaceId): Offer[] {
  return offerCatalog.filter((offer) => offer.service === service && (!platform || offer.platform === platform));
}

export function localizedOffer(offer: Offer, locale: Locale): LocalizedOffer {
  return {
    ...offer,
    title: offer.title[locale],
    shortTitle: offer.shortTitle[locale],
    description: offer.description[locale],
    duration: offer.duration[locale],
    result: offer.result[locale],
    features: offer.features.map((feature) => feature[locale]),
    scope: offer.scope[locale],
  };
}

export function formatOfferPrice(offer: Offer, locale: Locale): string {
  if (offer.priceMode === "individual" || offer.price === null) {
    return locale === "ru" ? "Стоимость после короткого брифа" : "Price after a short brief";
  }
  if (locale === "en") return "Individual estimate";
  const prefix = offer.priceMode === "from" ? "от " : "";
  const suffix = offer.billingUnit === "month" ? " в месяц" : offer.billingUnit === "sku" ? " за артикул" : "";
  return `${prefix}${new Intl.NumberFormat("ru-RU").format(offer.price)} ₽${suffix}`;
}

export function offerBriefHref(offerId: string, locale: Locale): string {
  const prefix = locale === "en" ? "/en" : "";
  return `${prefix}/brief?offer=${encodeURIComponent(offerId)}`;
}
