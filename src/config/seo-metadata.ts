import type { Metadata } from "next";
import type { Article } from "@/src/content/articles";
import {
  localizedPath,
  publicRoutes,
  siteConfig,
  type Locale,
} from "./site";

export type PublicRoutePath = (typeof publicRoutes)[number];

type SeoCopy = {
  title: string;
  description: string;
};

const publicSeoCopy = {
  ru: {
    "": {
      title: "SEO-аудит и продвижение сайтов — KILENI",
      description: "KILENI проверяет и исправляет сайты, развивает поисковую видимость, настраивает рекламу и готовит карточки товаров для маркетплейсов.",
    },
    services: {
      title: "Услуги SEO, разработки и рекламы — KILENI",
      description: "Выберите задачу: SEO-аудит, продвижение, разработка сайта, Яндекс Реклама, контент или отдельный проверяемый этап для нестандартного проекта.",
    },
    seo: {
      title: "SEO-услуги: аудит или продвижение — KILENI",
      description: "Сравните SEO-аудит и регулярное продвижение: от бесплатной проверки до исправлений и ежемесячной работы с сайтом.",
    },
    "seo-audit": {
      title: "SEO-аудит сайта с планом работ — KILENI",
      description: "Проверим техническое состояние, индексирование, структуру и страницы сайта, расставим проблемы по приоритету и дадим критерии приёмки исправлений.",
    },
    "seo-promotion": {
      title: "SEO-продвижение по понятному плану — KILENI",
      description: "Исправляем сайт и развиваем полезные страницы по согласованному объёму: фиксируем приоритеты, внедряем изменения и повторно проверяем результат.",
    },
    marketplaces: {
      title: "Карточки товаров для маркетплейсов — KILENI",
      description: "Готовим карточки товаров отдельно для Wildberries, Ozon и Яндекс Маркета: характеристики, названия, тексты и план медиа.",
    },
    "marketplaces/wildberries": {
      title: "Оформление карточек Wildberries — KILENI",
      description: "Соберём карточку Wildberries из проверенных характеристик товара, понятного названия, последовательных изображений и текста без неподтверждённых обещаний.",
    },
    "marketplaces/ozon": {
      title: "Оформление карточек Ozon — KILENI",
      description: "Подготовим карточку Ozon: выберем точную категорию, заполним характеристики, согласуем название, описание и медиасценарий для сравнения товара.",
    },
    "marketplaces/yandex-market": {
      title: "Карточки для Яндекс Маркета — KILENI",
      description: "Приведём предложение к структуре Яндекс Маркета, заполним важные характеристики и подготовим данные, которые участвуют в фильтрах и сравнении товаров.",
    },
    "web-development": {
      title: "Разработка сайтов для поиска и рекламы — KILENI",
      description: "Разрабатываем сайты с понятной структурой, адаптивными экранами, формами, аналитикой и базовой SEO-подготовкой.",
    },
    "yandex-ads": {
      title: "Настройка Яндекс Рекламы с аналитикой — KILENI",
      description: "Разделим запросы по смыслу, подготовим объявления и страницы, настроим измеримые цели и покажем отдельно стоимость работ и рекламный бюджет.",
    },
    "content-materials": {
      title: "Тексты и материалы для сайта — KILENI",
      description: "Готовим статьи, страницы и другие материалы под конкретную задачу: проверяем факты, место в структуре сайта, поисковый спрос и критерий готовности.",
    },
    "custom-task": {
      title: "Разбор нестандартной digital-задачи — KILENI",
      description: "Разберём текущую ситуацию, зависимости и желаемый результат, затем предложим первый самостоятельный этап с понятными границами и приёмкой.",
    },
    pricing: {
      title: "Цены на SEO, разработку и рекламу — KILENI",
      description: "Сравните стоимость и границы услуг KILENI по задачам: SEO-аудит, продвижение, разработка, реклама, контент и индивидуальные проекты.",
    },
    calculator: {
      title: "Калькулятор стоимости digital-работ — KILENI",
      description: "Выберите задачу и параметры проекта, чтобы получить предварительный диапазон стоимости SEO, разработки, рекламы или материалов до обсуждения деталей.",
    },
    cases: {
      title: "Кейсы SEO и разработки сайтов — KILENI",
      description: "Смотрите проверяемые результаты проектов KILENI: исходная задача, выполненные изменения, контрольные проверки и показатели после внедрения.",
    },
    "cases/eco-santeh": {
      title: "SEO-кейс eco-santeh.ru: результат — KILENI",
      description: "Как для eco-santeh.ru исправили повторяющиеся ошибки шаблонов, проверили 509 страниц и подтвердили результат повторным техническим обходом.",
    },
    "cases/zasorservice": {
      title: "SEO-кейс засорсервис.рф: результат — KILENI",
      description: "Разбор работ для засорсервис.рф: структура, технические исправления, контроль доступности страниц и проверяемые результаты после внедрения.",
    },
    brief: {
      title: "Бриф на SEO, сайт или рекламу — KILENI",
      description: "Опишите сайт, товар или проект в коротком брифе KILENI. Уточним задачу и до начала работ согласуем состав, срок, стоимость и ограничения.",
    },
    blog: {
      title: "Блог о SEO, сайтах и маркетплейсах — KILENI",
      description: "Практические статьи KILENI об индексации, SEO-аудите, продвижении, скорости сайтов, рекламе и оформлении карточек для маркетплейсов.",
    },
    glossary: {
      title: "Словарь терминов SEO и digital — KILENI",
      description: "Короткие объяснения терминов из SEO, веб-разработки, аналитики, рекламы и маркетплейсов с примерами того, где они встречаются в работе.",
    },
    about: {
      title: "О компании KILENI: подход и реквизиты",
      description: "Информация о KILENI, принципах работы, проверке результата и владельце сайта. Здесь собраны подход компании, контакты и обязательные реквизиты.",
    },
    contacts: {
      title: "Контакты KILENI: телефон и MAX",
      description: "Позвоните в KILENI или напишите в MAX, чтобы обсудить SEO, разработку сайта, рекламу или карточки товаров и согласовать следующий шаг.",
    },
    privacy: {
      title: "Политика обработки персональных данных KILENI",
      description: "Политика KILENI описывает состав, цели, правовые основания, сроки и способы обработки персональных данных посетителей сайта и заявителей.",
    },
    consent: {
      title: "Согласие на обработку персональных данных KILENI",
      description: "Условия согласия на обработку персональных данных при отправке форм KILENI: перечень данных, цели, действия оператора, срок и порядок отзыва.",
    },
    "free-audit": {
      title: "Бесплатная SEO-проверка сайта — KILENI",
      description: "Запустите бесплатную SEO-проверку до 10 публичных страниц: получите статусы проверок, конкретные замечания по URL и ссылку на результат.",
    },
  },
  en: {
    "": {
      title: "SEO audits, growth and web development — KILENI",
      description: "KILENI audits and improves websites, grows organic visibility, sets up advertising, and prepares product listings for major marketplaces.",
    },
    services: {
      title: "SEO, web and advertising services — KILENI",
      description: "Choose a clear task: SEO audit, ongoing growth, website development, Yandex Ads, content production, or a scoped first stage for a custom project.",
    },
    seo: {
      title: "SEO audits and ongoing growth — KILENI",
      description: "Compare a one-time SEO audit with ongoing search growth, from a free check to implementation and monthly website improvements.",
    },
    "seo-audit": {
      title: "Website SEO audit with an action plan — KILENI",
      description: "We review technical access, indexing, structure and key pages, rank findings by impact, and define practical acceptance checks for every fix.",
    },
    "seo-promotion": {
      title: "Ongoing SEO growth with a clear scope — KILENI",
      description: "We improve the website and build useful pages within an agreed scope, then repeat the same checks to show what changed after implementation.",
    },
    marketplaces: {
      title: "Product listings for marketplaces — KILENI",
      description: "We prepare platform-specific product listings for Wildberries, Ozon and Yandex Market, including attributes, copy and a media plan.",
    },
    "marketplaces/wildberries": {
      title: "Wildberries product listing services — KILENI",
      description: "We build Wildberries listings from verified product attributes, a clear title, useful image sequence and accurate copy without unsupported claims.",
    },
    "marketplaces/ozon": {
      title: "Ozon product listing services — KILENI",
      description: "We prepare Ozon listings with the right category, complete attributes, a concise title, useful copy and a media sequence that supports comparison.",
    },
    "marketplaces/yandex-market": {
      title: "Yandex Market product listings — KILENI",
      description: "We adapt product data to Yandex Market, complete the attributes used in filters and comparison, and check the listing before catalogue delivery.",
    },
    "web-development": {
      title: "Web development for search and ads — KILENI",
      description: "We design and build websites with a clear structure, responsive layouts, working forms, analytics and basic technical SEO.",
    },
    "yandex-ads": {
      title: "Yandex Ads setup with clear analytics — KILENI",
      description: "We group search demand by intent, prepare ads and landing pages, configure measurable goals, and separate service fees from the advertising budget.",
    },
    "content-materials": {
      title: "Website content and production materials — KILENI",
      description: "We create articles, landing pages and supporting materials for one defined task, using verified facts, search demand and an agreed acceptance criterion.",
    },
    "custom-task": {
      title: "Scoping a custom digital project — KILENI",
      description: "We clarify the current state, dependencies and required outcome, then propose a self-contained first stage with explicit boundaries and acceptance checks.",
    },
    pricing: {
      title: "SEO, website and advertising prices — KILENI",
      description: "Compare KILENI service prices and scope for SEO audits, ongoing growth, web development, advertising, content and individually estimated projects.",
    },
    calculator: {
      title: "Digital services cost calculator — KILENI",
      description: "Choose the task and project parameters to see a preliminary cost range for SEO, web development, advertising or content before a detailed discussion.",
    },
    cases: {
      title: "SEO and web development case studies — KILENI",
      description: "Review KILENI project evidence: the original task, implemented changes, repeated checks and concrete measurements recorded after delivery.",
    },
    "cases/eco-santeh": {
      title: "eco-santeh.ru SEO case study — KILENI",
      description: "See how recurring template issues were fixed for eco-santeh.ru, 509 pages were checked, and the outcome was confirmed by a repeated technical crawl.",
    },
    "cases/zasorservice": {
      title: "Zasorservice SEO case study — KILENI",
      description: "A practical review of structure, technical fixes and page availability checks completed for засорсервис.рф, with evidence captured after delivery.",
    },
    brief: {
      title: "Brief us on SEO, a website or ads — KILENI",
      description: "Describe your website, product or project in a short KILENI brief. We will clarify the task and agree the scope, timing, price and exclusions first.",
    },
    blog: {
      title: "Practical SEO and digital marketing blog — KILENI",
      description: "Practical KILENI guides to indexing, SEO audits, organic growth, website speed, Yandex Ads and product listing work for major marketplaces.",
    },
    glossary: {
      title: "SEO and digital marketing glossary — KILENI",
      description: "Plain-language definitions for SEO, web development, analytics, advertising and marketplace terms, with context on where each one appears in practice.",
    },
    about: {
      title: "About KILENI: approach and company details",
      description: "Learn how KILENI scopes work, verifies delivery and records limitations, and find the company owner details, required legal information and contacts.",
    },
    contacts: {
      title: "Contact KILENI by phone or MAX",
      description: "Call KILENI or use MAX to discuss SEO, website development, advertising or marketplace product listings and agree a practical next step.",
    },
    privacy: {
      title: "KILENI personal data processing policy",
      description: "The KILENI policy explains what personal data is processed, for which purposes and legal grounds, for how long, and how visitors can exercise their rights.",
    },
    consent: {
      title: "Consent to personal data processing — KILENI",
      description: "Terms of consent for KILENI forms, including the data categories, processing purposes, operator actions, duration and the procedure for withdrawing consent.",
    },
    "free-audit": {
      title: "Free website SEO check for 10 pages — KILENI",
      description: "Run a free SEO check of up to 10 public pages and receive check statuses, URL-specific findings and a shareable result without admin access.",
    },
  },
} satisfies Record<Locale, Record<PublicRoutePath, SeoCopy>>;

const ARTICLE_SEO_TITLES: Record<Locale, Record<string, string>> = {
  ru: {
    "seo-audit-when-you-need-it": "SEO-аудит сайта: когда он нужен и что даёт",
    "wildberries-ozon-product-card": "Карточка товара для Wildberries и Ozon",
    "why-website-is-not-in-search": "Почему сайт не индексируется: проверка",
    "seo-vs-yandex-ads": "SEO или Яндекс Реклама: что выбрать бизнесу",
    "website-speed-loading": "Как найти причину медленной загрузки сайта",
    "seo-ecommerce-promotion": "SEO интернет-магазина: с каких страниц начать",
    "seo-promotion-cost": "Стоимость SEO-продвижения: из чего она складывается",
  },
  en: {
    "seo-audit-when-you-need-it": "SEO audits: when you need one and what it delivers",
    "wildberries-ozon-product-card": "Product listings for Wildberries and Ozon",
    "why-website-is-not-in-search": "Why a website is not indexed: a practical check",
    "seo-vs-yandex-ads": "SEO or Yandex Ads: which should a business choose?",
    "website-speed-loading": "How to diagnose and improve website loading speed",
    "seo-ecommerce-promotion": "E-commerce SEO: which pages to build first",
    "seo-promotion-cost": "How much SEO costs and what the price includes",
  },
};

/**
 * Editorial dates, not build timestamps. Update only the route whose visible
 * content changed materially; a technical deploy must leave this map intact.
 */
const PUBLIC_ROUTE_LAST_MODIFIED = {
  "": "2026-08-24",
  services: "2026-08-24",
  seo: "2026-08-30",
  "seo-audit": "2026-08-24",
  "seo-promotion": "2026-08-24",
  marketplaces: "2026-08-24",
  "marketplaces/wildberries": "2026-08-24",
  "marketplaces/ozon": "2026-08-24",
  "marketplaces/yandex-market": "2026-08-24",
  "web-development": "2026-08-24",
  "yandex-ads": "2026-08-24",
  "content-materials": "2026-08-24",
  "custom-task": "2026-08-24",
  pricing: "2026-08-24",
  calculator: "2026-08-24",
  cases: "2026-08-24",
  "cases/eco-santeh": "2026-08-24",
  "cases/zasorservice": "2026-08-24",
  brief: "2026-08-24",
  blog: "2026-08-24",
  glossary: "2026-08-24",
  about: "2026-08-23",
  contacts: "2026-08-23",
  privacy: "2026-08-23",
  consent: "2026-08-23",
  "free-audit": "2026-08-24",
} as const satisfies Record<PublicRoutePath, string>;

export function publicRouteLastModified(path: PublicRoutePath): string {
  return PUBLIC_ROUTE_LAST_MODIFIED[path];
}

export function isPublicRoutePath(path: string): path is PublicRoutePath {
  return (publicRoutes as readonly string[]).includes(path);
}

export function buildPublicMetadata(locale: Locale, path: PublicRoutePath): Metadata {
  const copy = publicSeoCopy[locale][path];
  return buildMetadata(locale, path, copy);
}

export function buildArticleMetadata(locale: Locale, article: Article): Metadata {
  const path = `blog/${article.slug}`;
  const title = ARTICLE_SEO_TITLES[locale][article.slug] ?? article.title;
  const canonical = absoluteLocalizedUrl(locale, path);
  const image = absoluteUrl(article.hero.src);
  const languages = alternateLanguageUrls(path);

  return {
    title: { absolute: title },
    description: article.description,
    alternates: { canonical, languages },
    openGraph: {
      type: "article",
      siteName: siteConfig.name,
      title,
      description: article.description,
      url: canonical,
      locale: locale === "ru" ? "ru_RU" : "en_US",
      alternateLocale: locale === "ru" ? ["en_US"] : ["ru_RU"],
      publishedTime: article.date,
      modifiedTime: article.date,
      authors: [article.author],
      section: article.searchIntent.label,
      tags: article.searchIntent.relatedQueries,
      images: [{ url: image, alt: article.hero.alt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: article.description,
      images: [image],
    },
  };
}

function buildMetadata(locale: Locale, path: string, copy: SeoCopy): Metadata {
  const canonical = absoluteLocalizedUrl(locale, path);
  const languages = alternateLanguageUrls(path);
  const image = absoluteUrl("/brand/kileni-og.png");

  return {
    title: { absolute: copy.title },
    description: copy.description,
    alternates: { canonical, languages },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      title: copy.title,
      description: copy.description,
      url: canonical,
      locale: locale === "ru" ? "ru_RU" : "en_US",
      alternateLocale: locale === "ru" ? ["en_US"] : ["ru_RU"],
      images: [{ url: image, width: 1200, height: 630, alt: "KILENI" }],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
      images: [image],
    },
  };
}

function alternateLanguageUrls(path: string): Record<"ru" | "en" | "x-default", string> {
  const ru = absoluteLocalizedUrl("ru", path);
  return {
    ru,
    en: absoluteLocalizedUrl("en", path),
    "x-default": ru,
  };
}

function absoluteLocalizedUrl(locale: Locale, path: string): string {
  return absoluteUrl(localizedPath(locale, path));
}

function absoluteUrl(path: string): string {
  return new URL(path, siteConfig.baseUrl).toString();
}
