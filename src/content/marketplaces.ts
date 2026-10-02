import type { Locale } from "../config/site";

export type MarketplaceId = "wildberries" | "ozon" | "yandex-market";

type MarketplaceCopy = {
  lead: string;
  visibility: string[];
  fields: string[];
  content: string[];
  work: string[];
  result: string[];
  extra: string[];
  access: string;
  price: string;
  acceptance: string[];
};

export type MarketplacePlatform = {
  id: MarketplaceId;
  name: string;
  nameEn: string;
  mark: string;
  iconSrc: string;
  iconWidth: number;
  iconHeight: number;
  color: string;
  ru: MarketplaceCopy;
  en: MarketplaceCopy;
  docs: Array<{ label: string; labelEn: string; url: string }>;
};

export const marketplacePlatforms: MarketplacePlatform[] = [
  {
    id: "wildberries", name: "Wildberries", nameEn: "Wildberries", mark: "WB", iconSrc: "/marketplaces/wildberries.svg", iconWidth: 500, iconHeight: 75, color: "#7b2cff",
    ru: {
      lead: "Проверяем реальную карточку Wildberries: категорию, характеристики, название и порядок изображений. Затем передаём готовую таблицу полей и точное задание на медиа.",
      visibility: ["верно ли выбрана категория товара", "заполнены ли характеристики, по которым покупатель ставит фильтры", "соответствуют ли название и изображения фактическому товару"],
      fields: ["название без неподтверждённых обещаний", "обязательные характеристики выбранной категории", "размеры, варианты и артикулы", "описание с проверяемыми свойствами товара"],
      content: ["главное фото с понятным видом товара", "размеры, комплектация и важные детали", "порядок изображений от общего вида к деталям", "инфографика и видео — только если входят в согласованный объём"],
      work: ["получаем ссылку, артикул и исходные данные", "сверяем поля с требованиями категории Wildberries", "фиксируем ошибки и недостающие сведения", "передаём таблицу полей, тексты и план изображений"],
      result: ["список замечаний по исходной карточке", "таблица готовых полей и текстов", "понятный план каждого изображения", "чек-лист для проверки перед загрузкой"],
      extra: ["дизайн инфографики по утверждённому плану", "обработка нескольких артикулов по одной схеме", "проверка карточки после публикации"],
      access: "Для подготовки материалов доступ к кабинету не нужен. Публикация возможна только отдельным согласованным этапом с ограниченным доступом.",
      price: "Стоимость зависит от числа артикулов и состава медиа. Подходящий состав работ и цену выбирают на странице цен до старта.",
      acceptance: ["все согласованные поля заполнены в передаваемой таблице", "файлы медиа соответствуют утверждённой карте кадров"],
    },
    en: {
      lead: "We audit an actual Wildberries card: category, attributes, title and image order. Then we hand over a completed field table and an exact media brief.",
      visibility: ["whether the correct product category is selected", "whether the attributes used by buyer filters are complete", "whether the title and images match the actual product"],
      fields: ["a title without unverified claims", "required attributes for the selected category", "sizes, variants and SKUs", "a description based on verifiable product properties"],
      content: ["a primary image that shows the product clearly", "sizes, contents and important details", "an image order from the overall view to details", "infographics and video only when included in the agreed scope"],
      work: ["receive the card link, SKU and source product data", "check the fields against Wildberries category requirements", "record errors and missing facts", "deliver the field table, copy and image plan"],
      result: ["an issue list for the source card", "a completed table of fields and copy", "a clear plan for every image", "a pre-upload review checklist"],
      extra: ["infographic design based on the approved plan", "processing several SKUs with one agreed structure", "a post-publish card review"],
      access: "No seller-account access is needed to prepare materials. Publishing is a separately agreed stage with limited access.",
      price: "The quote depends on SKU count and media scope. The exact package boundary is agreed before work begins.",
      acceptance: ["all agreed fields are present in the handover table", "media files follow the approved frame map"],
    },
    docs: [{ label: "Wildberries: инструкции продавца", labelEn: "Wildberries seller documentation", url: "https://seller.wildberries.ru/instructions/ru" }],
  },
  {
    id: "ozon", name: "Ozon", nameEn: "Ozon", mark: "OZON", iconSrc: "/marketplaces/ozon.svg", iconWidth: 485, iconHeight: 106, color: "#005bff",
    ru: {
      lead: "Проверяем тип и категорию товара на Ozon, обязательные характеристики, текст и медиа. На выходе — файлы, которые можно проверить до загрузки в кабинет.",
      visibility: ["подходит ли выбранный тип и категория товара", "заполнены ли поля, которые участвуют в фильтрах", "нет ли в названии и описании неподтверждённых свойств"],
      fields: ["название по правилам выбранной категории", "краткое описание без дублирования основного текста", "обязательные и полезные дополнительные характеристики", "варианты товара и идентификаторы"],
      content: ["главное и дополнительные изображения", "порядок кадров для сравнения товара", "видео — при наличии подходящего исходника", "расширенное оформление — отдельным согласованным блоком"],
      work: ["получаем ссылку на карточку и данные о товаре", "сверяем тип товара и обязательные поля Ozon", "отмечаем ошибки и запрашиваем недостающие факты", "готовим таблицу, тексты и план изображений"],
      result: ["список конкретных ошибок исходной карточки", "таблица характеристик и готовые тексты", "план изображений по кадрам", "чек-лист повторной проверки после модерации"],
      extra: ["расширенное оформление карточки", "дизайн инфографики по утверждённому плану", "подготовка нескольких карточек по одной структуре"],
      access: "Исходные данные можно передать таблицей. Доступ к кабинету нужен только для отдельно заказанной публикации или проверки ошибок загрузки.",
      price: "Тексты, расширенное оформление и публикация считаются разными блоками. До начала фиксируем выбранные блоки и число артикулов.",
      acceptance: ["тексты и характеристики переданы в согласованном формате", "изображения, видео и расширенное оформление проверены по согласованному списку перед загрузкой"],
    },
    en: {
      lead: "We audit the Ozon product type and category, required attributes, copy and media. The deliverables are files that can be reviewed before any account upload.",
      visibility: ["whether the selected product type and category are correct", "whether fields used by filters are complete", "whether the title and description avoid unverified properties"],
      fields: ["a title that follows the selected category rules", "a short description without duplicating the main copy", "required and useful optional attributes", "product variants and identifiers"],
      content: ["primary and additional product images", "an image order that helps compare the product", "video when a suitable source file is available", "rich content as a separately agreed block"],
      work: ["receive the card link and source product data", "check the product type and required Ozon fields", "record errors and request missing facts", "prepare the table, copy and image plan"],
      result: ["specific errors in the source card", "an attribute table and ready copy", "a frame-by-frame image plan", "a post-moderation review checklist"],
      extra: ["rich product content", "infographic design based on the approved plan", "several cards prepared with one agreed structure"],
      access: "Source data can be shared as a table. Account access is only required for separately scoped publishing or upload troubleshooting.",
      price: "Copy, rich content and publishing are separate blocks. Selected blocks and SKU count are fixed before delivery begins.",
      acceptance: ["copy and attributes are supplied in the agreed format", "images, video and rich content pass the agreed pre-upload checklist"],
    },
    docs: [{ label: "Ozon: руководство по контенту товара", labelEn: "Ozon product content guide", url: "https://docs.ozon.ru/global/products/" }],
  },
  {
    id: "yandex-market", name: "Яндекс Маркет", nameEn: "Yandex Market", mark: "Я", iconSrc: "/marketplaces/yandex-market.svg", iconWidth: 194, iconHeight: 37, color: "#ffcc00",
    ru: {
      lead: "Сверяем предложение с категорией Яндекс Маркета: название, производителя, параметры и изображения. Передаём данные в формате, который можно проверить до загрузки.",
      visibility: ["привязано ли предложение к точной категории", "хватает ли параметров для сравнения с похожими товарами", "соответствуют ли изображения товару и требованиям площадки"],
      fields: ["название и производитель", "обязательные параметры выбранной категории", "описание и варианты товара", "артикул и другие идентификаторы предложения"],
      content: ["основное изображение без лишних надписей", "дополнительные ракурсы товара", "схемы размеров и комплектации", "только подтверждённые свойства и визуальные материалы"],
      work: ["получаем ссылку или выгрузку ассортимента", "сверяем категорию и список обязательных параметров", "исправляем структуру данных и описываем требования к изображениям", "после загрузки проверяем карточку или отчёт с ошибками"],
      result: ["таблица обязательных и заполненных полей", "готовые тексты без неподтверждённых обещаний", "список требований к каждому изображению", "протокол повторной проверки после загрузки"],
      extra: ["файл для массовой загрузки", "приведение нескольких выгрузок к одной структуре", "разбор конкретных ошибок в кабинете"],
      access: "Для контентной подготовки достаточно выгрузки ассортимента. Доступ обсуждается отдельно, если нужна загрузка или разбор ошибок кабинета.",
      price: "Фид, ручное заполнение и сопровождение загрузки — разные объёмы. Смета строится по числу предложений и способу передачи данных.",
      acceptance: ["обязательные поля заполнены по выбранной категории", "результат повторно проверен в карточке или отчёте загрузки"],
    },
    en: {
      lead: "We check the offer against Yandex Market category requirements: title, manufacturer, parameters and images. We hand over data in a format that can be reviewed before upload.",
      visibility: ["whether the offer is mapped to the exact category", "whether there are enough parameters for comparison with similar products", "whether images match the product and platform requirements"],
      fields: ["title and manufacturer", "required parameters for the selected category", "description and product variants", "SKU and other offer identifiers"],
      content: ["a primary image without unnecessary text", "additional product angles", "size and package diagrams", "only verified properties and visual materials"],
      work: ["receive a product link or catalogue export", "check the category and required parameter list", "correct the data structure and define image requirements", "review the card or error report after upload"],
      result: ["a table of required and completed fields", "ready copy without unverified claims", "requirements for every image", "a repeat-check protocol after upload"],
      extra: ["a bulk-upload file", "normalising several exports into one structure", "reviewing specific seller-account errors"],
      access: "A catalogue export is enough for content preparation. Access is discussed only for upload support or account-error review.",
      price: "Feed preparation, manual field work and upload support are separate scopes. The quote follows offer count and data-transfer method.",
      acceptance: ["required fields are completed for the selected category", "the result is rechecked in the card or upload report"],
    },
    docs: [
      { label: "Яндекс Маркет: основные поля", labelEn: "Yandex Market: core offer fields", url: "https://yandex.ru/support/marketplace/ru/assortment/create/main-fields/general" },
      { label: "Яндекс Маркет: требования к изображениям", labelEn: "Yandex Market: image requirements", url: "https://yandex.ru/support/marketplace/ru/assortment/create/main-fields/images" },
    ],
  },
];

export function marketplaceName(platform: MarketplacePlatform, locale: Locale): string {
  return locale === "ru" ? platform.name : platform.nameEn;
}
