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
      description: "Проектируем и разрабатываем сайты с понятной структурой, адаптивными экранами, рабочими формами и аналитикой, готовые к рекламе и поиску.",
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
    "cases/mestoest-ff": {
      title: "SEO-кейс mestoest-ff.ru: фулфилмент — KILENI",
      description: "Разбор продвижения mestoest-ff.ru: структура услуг фулфилмента, локальные страницы для Подольска, выполненные изменения и ограничения данных о позициях.",
    },
    "cases/kamenmis": {
      title: "SEO-кейс kamenmis.ru: мастерская камня — KILENI",
      description: "Разбор работ для kamenmis.ru: структура изделий из камня, страницы материалов и портфолио, контроль видимости и ограничения опубликованных данных.",
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
} satisfies Record<"ru", Record<PublicRoutePath, SeoCopy>>;

const ARTICLE_SEO_TITLES: Record<"ru", Record<string, string>> = {
  ru: {
    "seo-audit-when-you-need-it": "SEO-аудит сайта: когда он нужен и что даёт",
    "wildberries-ozon-product-card": "Карточка товара для Wildberries и Ozon",
    "why-website-is-not-in-search": "Почему сайт не индексируется: проверка",
    "seo-vs-yandex-ads": "SEO или Яндекс Реклама: что выбрать бизнесу",
    "website-speed-loading": "Как найти причину медленной загрузки сайта",
    "seo-ecommerce-promotion": "SEO интернет-магазина: с каких страниц начать",
    "seo-promotion-cost": "Стоимость SEO-продвижения: из чего она складывается",
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
  "cases/mestoest-ff": "2026-10-01",
  "cases/kamenmis": "2026-10-01",
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
  const copy = publicSeoCopy.ru[path];
  return buildMetadata(locale, path, copy);
}

export function buildArticleMetadata(locale: Locale, article: Article): Metadata {
  const path = `blog/${article.slug}`;
  const title = ARTICLE_SEO_TITLES.ru[article.slug] ?? article.title;
  const canonical = absoluteLocalizedUrl(locale, path);
  const image = absoluteUrl(article.hero.src);

  return {
    title: { absolute: title },
    description: article.description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      siteName: siteConfig.name,
      title,
      description: article.description,
      url: canonical,
      locale: "ru_RU",
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
  const image = absoluteUrl("/brand/kileni-og.png");

  return {
    title: { absolute: copy.title },
    description: copy.description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      title: copy.title,
      description: copy.description,
      url: canonical,
      locale: "ru_RU",
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

function absoluteLocalizedUrl(locale: Locale, path: string): string {
  return absoluteUrl(localizedPath(locale, path));
}

function absoluteUrl(path: string): string {
  return new URL(path, siteConfig.baseUrl).toString();
}
