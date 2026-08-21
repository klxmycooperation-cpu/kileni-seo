import type { Locale } from "../config/site";

export type MarketplaceId = "wildberries" | "ozon" | "yandex-market" | "megamarket";

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
  color: string;
  ru: MarketplaceCopy;
  en: MarketplaceCopy;
  docs: Array<{ label: string; labelEn: string; url: string }>;
};

export const marketplacePlatforms: MarketplacePlatform[] = [
  {
    id: "wildberries", name: "Wildberries", nameEn: "Wildberries", mark: "WB", iconSrc: "/marketplaces/wildberries.ico", color: "#7b2cff",
    ru: {
      lead: "Собираем карточку вокруг точных характеристик, понятного названия и последовательного сценария выбора.",
      visibility: ["категория и обязательные характеристики", "полнота полей для фильтров", "соответствие названия реальному товару"],
      fields: ["название и категория", "характеристики и варианты", "описание без повторения ключей", "артикулы, размеры и идентификаторы"],
      content: ["главное фото", "последовательность кадров", "инфографика по преимуществам", "видео — отдельной задачей"],
      work: ["проверяем карточку и видимых конкурентов", "собираем формулировки покупателей", "готовим поля и тексты", "передаём карту кадров и чек-лист"],
      result: ["таблица запросов и характеристик", "готовые тексты", "задание на изображения", "проверка перед публикацией"],
      extra: ["дизайн инфографики", "массовая обработка ассортимента", "проверка после публикации"],
      access: "Для подготовки материалов доступ к кабинету не нужен. Публикация возможна только отдельным согласованным этапом с ограниченным доступом.",
      price: "Стоимость зависит от числа артикулов и состава медиа. Точный вариант и предел выбираются на странице цен до старта.",
      acceptance: ["все согласованные поля заполнены в передаваемой таблице", "файлы медиа соответствуют утверждённой карте кадров"],
    },
    en: {
      lead: "We build the card around accurate attributes, a clear title and a coherent buying path.",
      visibility: ["category and required attributes", "filter-ready field completeness", "a title that matches the actual product"],
      fields: ["title and category", "attributes and variants", "useful copy without keyword repetition", "SKUs, sizes and identifiers"],
      content: ["primary image", "frame sequence", "benefit-led infographics", "video as a separate scope"],
      work: ["review the card and visible competitors", "map shopper language", "prepare fields and copy", "deliver a frame map and checklist"],
      result: ["query and attribute table", "ready-to-use copy", "image brief", "pre-publish review"],
      extra: ["infographic design", "bulk catalogue processing", "post-publish review"],
      access: "No seller-account access is needed to prepare materials. Publishing is a separately agreed stage with limited access.",
      price: "The quote depends on SKU count and media scope. The exact package boundary is agreed before work begins.",
      acceptance: ["all agreed fields are present in the handover table", "media files follow the approved frame map"],
    },
    docs: [{ label: "Wildberries: инструкции продавца", labelEn: "Wildberries seller documentation", url: "https://seller.wildberries.ru/instructions/ru" }],
  },
  {
    id: "ozon", name: "Ozon", nameEn: "Ozon", mark: "OZON", iconSrc: "/marketplaces/ozon.png", color: "#005bff",
    ru: {
      lead: "Помогаем покупателю сравнить товар: заполняем характеристики, выстраиваем медиа и убираем разрыв между обещанием и карточкой.",
      visibility: ["корректный тип товара и категория", "характеристики, используемые в фильтрах", "релевантное и читаемое описание"],
      fields: ["название по правилам площадки", "аннотация и описание", "обязательные и дополнительные характеристики", "варианты и идентификаторы"],
      content: ["изображения товара", "видео", "rich-контент", "порядок визуальных аргументов"],
      work: ["разбираем карточку и выдачу", "группируем запросы без дублей", "заполняем матрицу характеристик", "проектируем порядок медиа"],
      result: ["карта полей", "тексты и характеристики", "сценарий медиа", "список проверок после модерации"],
      extra: ["rich-контент", "инфографика", "массовое наполнение"],
      access: "Исходные данные можно передать таблицей. Доступ к кабинету нужен только для отдельно заказанной публикации или проверки ошибок загрузки.",
      price: "Тексты, rich-контент и публикация считаются разными блоками. До начала фиксируем выбранные блоки и число SKU.",
      acceptance: ["тексты и атрибуты переданы в согласованном формате", "медиа и rich-контент прошли внутренний чек-лист перед загрузкой"],
    },
    en: {
      lead: "We make the product easier to compare through complete attributes, useful media and consistent promises.",
      visibility: ["correct product type and category", "filter-ready attributes", "relevant and readable copy"],
      fields: ["platform-compliant title", "summary and description", "required and optional attributes", "variants and identifiers"],
      content: ["product images", "video", "rich content", "the order of visual proof"],
      work: ["review the card and results", "cluster queries without duplication", "complete the attribute matrix", "design the media sequence"],
      result: ["field map", "copy and attributes", "media scenario", "post-moderation checklist"],
      extra: ["rich content", "infographic design", "bulk catalogue work"],
      access: "Source data can be shared as a table. Account access is only required for separately scoped publishing or upload troubleshooting.",
      price: "Copy, rich content and publishing are separate blocks. Selected blocks and SKU count are fixed before delivery begins.",
      acceptance: ["copy and attributes are supplied in the agreed format", "media and rich content pass the pre-upload checklist"],
    },
    docs: [{ label: "Ozon: руководство по контенту товара", labelEn: "Ozon product content guide", url: "https://docs.ozon.ru/global/products/" }],
  },
  {
    id: "yandex-market", name: "Яндекс Маркет", nameEn: "Yandex Market", mark: "Я", iconSrc: "/marketplaces/yandex-market.ico", color: "#ffcc00",
    ru: {
      lead: "Приводим предложение к структуре Маркета, чтобы характеристики участвовали в сравнении и карточка не теряла важные данные.",
      visibility: ["привязка к категории", "точные параметры", "качество предложения и изображений"],
      fields: ["название и производитель", "описание и характеристики", "варианты", "идентификаторы предложения"],
      content: ["основное изображение", "дополнительные ракурсы", "схемы и размеры", "изображения без вводящих в заблуждение элементов"],
      work: ["проверяем размещение и ошибки", "сопоставляем поля с категорией", "готовим данные и медиа", "проверяем отображение после загрузки"],
      result: ["таблица обязательных полей", "готовые тексты", "требования к изображениям", "протокол повторной проверки"],
      extra: ["подготовка фида", "массовая нормализация данных", "разбор ошибок кабинета"],
      access: "Для контентной подготовки достаточно выгрузки ассортимента. Доступ обсуждается отдельно, если нужна загрузка или разбор ошибок кабинета.",
      price: "Фид, ручное заполнение и сопровождение загрузки — разные объёмы. Смета строится по числу предложений и способу передачи данных.",
      acceptance: ["обязательные поля заполнены по выбранной категории", "результат повторно проверен в карточке или отчёте загрузки"],
    },
    en: {
      lead: "We align the offer with Market requirements so attributes work in comparisons and important data is retained.",
      visibility: ["category mapping", "accurate parameters", "offer and image quality"],
      fields: ["title and manufacturer", "description and attributes", "variants", "offer identifiers"],
      content: ["primary image", "additional angles", "size diagrams", "images without misleading overlays"],
      work: ["review placement errors", "map fields to category requirements", "prepare data and media", "verify the published result"],
      result: ["required-field table", "ready copy", "image requirements", "repeat-check protocol"],
      extra: ["feed preparation", "bulk data normalisation", "account error review"],
      access: "A catalogue export is enough for content preparation. Access is discussed only for upload support or account-error review.",
      price: "Feed preparation, manual field work and upload support are separate scopes. The quote follows offer count and data-transfer method.",
      acceptance: ["required fields are completed for the selected category", "the result is rechecked in the card or upload report"],
    },
    docs: [
      { label: "Яндекс Маркет: основные поля", labelEn: "Yandex Market: core offer fields", url: "https://yandex.ru/support/marketplace/ru/assortment/create/main-fields/general" },
      { label: "Яндекс Маркет: требования к изображениям", labelEn: "Yandex Market: image requirements", url: "https://yandex.ru/support/marketplace/ru/assortment/create/main-fields/images" },
    ],
  },
  {
    id: "megamarket", name: "Мегамаркет", nameEn: "Megamarket", mark: "M", iconSrc: "/marketplaces/megamarket.ico", color: "#7c3cff",
    ru: {
      lead: "Собираем понятную карточку и проверяем полноту данных до передачи ассортимента на площадку.",
      visibility: ["категория и обязательные атрибуты", "качество названия и описания", "достаточность медиа"],
      fields: ["название", "характеристики", "описание", "идентификаторы товара и предложения"],
      content: ["основное фото", "дополнительные фото", "схемы и размеры", "медиа-задание для категории"],
      work: ["проверяем исходные данные", "собираем требования категории", "готовим карточку", "фиксируем критерии приёмки"],
      result: ["матрица данных", "готовый текст", "медиа-задание", "чек-лист публикации"],
      extra: ["инфографика", "массовая обработка", "сопровождение загрузки"],
      access: "Карточки можно подготовить по таблице и исходным материалам. Кабинет требуется только для отдельно согласованной публикации.",
      price: "Цена зависит от готовности исходных данных, числа карточек и необходимости сопровождать загрузку. Эти границы фиксируются в предложении.",
      acceptance: ["матрица содержит все согласованные поля", "текст и медиа-задание готовы к передаче на публикацию"],
    },
    en: {
      lead: "We assemble a clear product card and verify data completeness before the catalogue is uploaded.",
      visibility: ["category and required attributes", "title and description quality", "media completeness"],
      fields: ["title", "attributes", "description", "product and offer identifiers"],
      content: ["primary photo", "additional photos", "size diagrams", "category-specific media brief"],
      work: ["review source data", "map category requirements", "prepare the card", "define acceptance checks"],
      result: ["data matrix", "ready copy", "media brief", "publishing checklist"],
      extra: ["infographic design", "bulk processing", "upload support"],
      access: "Cards can be prepared from tables and source assets. Seller-account access is required only for separately agreed publishing.",
      price: "The quote follows source-data readiness, card count and upload support. Those boundaries are fixed in the proposal.",
      acceptance: ["the matrix contains every agreed field", "copy and the media brief are ready for publishing handover"],
    },
    docs: [{ label: "Мегамаркет: база знаний партнёра", labelEn: "Megamarket partner knowledge base", url: "https://partner-wiki.megamarket.ru/" }],
  },
];

export function marketplaceName(platform: MarketplacePlatform, locale: Locale): string {
  return locale === "ru" ? platform.name : platform.nameEn;
}
