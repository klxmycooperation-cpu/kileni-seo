import type { Locale } from "./site";
import { priceLabel } from "./price-labels";
import type { MarketplaceId } from "../content/marketplaces";

type LocalizedText = { ru: string; en: string };

export type MarketplaceOffer = {
  id: "audit" | "optimization" | "turnkey";
  priceKey: "mp-audit" | "mp-optimization" | "mp-turnkey";
  featured?: boolean;
  name: LocalizedText;
  description: LocalizedText;
  limit: LocalizedText;
  duration: LocalizedText;
  mainResult: LocalizedText;
  features: Array<LocalizedText>;
};

const platformSpecific: Record<MarketplaceId, {
  audit: LocalizedText[];
  optimization: LocalizedText[];
  turnkey: LocalizedText[];
}> = {
  wildberries: {
    audit: [text("Проверка категории и обязательных характеристик", "Category and required-attribute review"), text("Разбор названия и видимых карточек конкурентов", "Title and visible-competitor review"), text("Список правок по приоритету", "Prioritised correction list")],
    optimization: [text("Название без переспама", "A clear title without keyword stuffing"), text("Характеристики для фильтров Wildberries", "Wildberries filter-ready attributes"), text("Описание и карта поисковых формулировок", "Description and search-phrase map")],
    turnkey: [text("Все поля оптимизированной карточки", "Every field from the optimised-card package"), text("Сценарий главного фото и последовательности кадров", "Primary-image and frame-sequence scenario"), text("Файлы и чек-лист перед публикацией", "Files and a pre-publish checklist")],
  },
  ozon: {
    audit: [text("Проверка типа товара, категории и фильтров", "Product type, category and filter review"), text("Разбор аннотации, описания и медиа", "Summary, description and media review"), text("Список правок по приоритету", "Prioritised correction list")],
    optimization: [text("Название, аннотация и описание", "Title, summary and description"), text("Матрица характеристик Ozon", "Ozon attribute matrix"), text("Карта поисковых формулировок", "Search-phrase map")],
    turnkey: [text("Все поля оптимизированной карточки", "Every field from the optimised-card package"), text("Сценарий изображений и rich-контента", "Image and rich-content scenario"), text("Файлы и чек-лист после модерации", "Files and a post-moderation checklist")],
  },
  "yandex-market": {
    audit: [text("Проверка категории и основных полей предложения", "Category and core-offer-field review"), text("Разбор параметров и качества изображений", "Parameter and image-quality review"), text("Список ошибок размещения", "Placement-error list")],
    optimization: [text("Название, производитель и описание", "Title, manufacturer and description"), text("Параметры для сравнения на Маркете", "Market comparison-ready parameters"), text("Таблица обязательных полей", "Required-field table")],
    turnkey: [text("Все поля оптимизированного предложения", "Every field from the optimised-offer package"), text("Требования к изображениям и ракурсам", "Image and angle requirements"), text("Файл передачи и протокол повторной проверки", "Handover file and repeat-check protocol")],
  },
  megamarket: {
    audit: [text("Проверка категории и обязательных атрибутов", "Category and required-attribute review"), text("Разбор названия, описания и медиа", "Title, description and media review"), text("Список недостающих данных", "Missing-data list")],
    optimization: [text("Название, описание и характеристики", "Title, description and attributes"), text("Матрица данных Мегамаркета", "Megamarket data matrix"), text("Карта поисковых формулировок", "Search-phrase map")],
    turnkey: [text("Все поля оптимизированной карточки", "Every field from the optimised-card package"), text("Медиа-задание по категории", "Category-specific media brief"), text("Файлы и чек-лист публикации", "Files and publishing checklist")],
  },
};

export const marketplaceOffers: Record<MarketplaceId, MarketplaceOffer[]> = Object.fromEntries(
  (Object.keys(platformSpecific) as MarketplaceId[]).map((platform) => [platform, [
    {
      id: "audit",
      priceKey: "mp-audit",
      name: text("Разбор карточки", "Card review"),
      description: text("Когда нужно понять, что мешает одной карточке и с чего начать.", "For understanding what blocks one card and what to fix first."),
      limit: text("1 карточка · без публикации", "1 card · publishing excluded"),
      duration: text("2 рабочих дня", "2 working days"),
      mainResult: text("Приоритетный список правок", "Prioritised correction list"),
      features: platformSpecific[platform].audit,
    },
    {
      id: "optimization",
      priceKey: "mp-optimization",
      featured: true,
      name: text("Оптимизация карточки", "Card optimisation"),
      description: text("Когда исходные фото готовы, а поля и тексты нужно привести в порядок.", "For ready source photos that need stronger fields and copy."),
      limit: text("1 артикул · 1 раунд правок", "1 SKU · 1 revision round"),
      duration: text("3–4 рабочих дня", "3–4 working days"),
      mainResult: text("Готовая структура полей и текстов", "Ready field and copy structure"),
      features: platformSpecific[platform].optimization,
    },
    {
      id: "turnkey",
      priceKey: "mp-turnkey",
      name: text("Упаковка под ключ", "Turnkey packaging"),
      description: text("Когда кроме полей нужен продуманный сценарий изображений и полный комплект передачи.", "For a full handover including fields, image scenario and publishing rules."),
      limit: text("1 артикул · дизайн без фотосъёмки", "1 SKU · design without photography"),
      duration: text("5–7 рабочих дней", "5–7 working days"),
      mainResult: text("Комплект карточки для публикации", "Publishing-ready card pack"),
      features: platformSpecific[platform].turnkey,
    },
  ]]),
) as Record<MarketplaceId, MarketplaceOffer[]>;

export function localizedMarketplaceOffers(platform: MarketplaceId, locale: Locale) {
  return marketplaceOffers[platform].map((offer) => ({
    id: offer.id,
    name: offer.name[locale],
    description: offer.description[locale],
    limit: offer.limit[locale],
    duration: offer.duration[locale],
    mainResult: offer.mainResult[locale],
    features: offer.features.map((feature) => feature[locale]),
    featured: Boolean(offer.featured),
    ...priceLabel(offer.priceKey, locale),
  }));
}

function text(ru: string, en: string): LocalizedText {
  return { ru, en };
}
