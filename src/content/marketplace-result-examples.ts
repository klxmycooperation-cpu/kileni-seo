import type { Locale } from "../config/site";
import { marketplacePlatforms, marketplaceName, type MarketplaceId } from "./marketplaces";

type ExampleState = { label: string; title: string; items: string[] };

export type MarketplaceResultExample = {
  title: string;
  lead: string;
  before: ExampleState;
  after: ExampleState;
  rows: Array<{ key: "search-phrases" | "card-fields" | "image-scenario" | "files" | "publishing-rules"; label: string; value: string }>;
  disclaimer: string;
};

const details: Record<MarketplaceId, {
  sourceRu: string[];
  sourceEn: string[];
  readyRu: string[];
  readyEn: string[];
  fieldsRu: string;
  fieldsEn: string;
  imagesRu: string;
  imagesEn: string;
}> = {
  wildberries: {
    sourceRu: ["Название повторяет запросы и не уточняет товар", "Характеристики заполнены частично", "Кадры не отвечают на вопросы о размере и использовании"],
    sourceEn: ["The title repeats queries without identifying the item", "Attributes are only partially completed", "Frames do not answer size and use questions"],
    readyRu: ["Название описывает товар и главное отличие", "Поля собраны по категории и фильтрам Wildberries", "Кадры идут от выбора к доказательствам и деталям"],
    readyEn: ["The title identifies the item and its main difference", "Fields follow the Wildberries category and filters", "Frames move from choice to proof and details"],
    fieldsRu: "Название → категория → обязательные характеристики → варианты → описание",
    fieldsEn: "Title → category → required attributes → variants → description",
    imagesRu: "Главное фото → отличие → размеры → детали → применение → комплектация",
    imagesEn: "Primary image → difference → size → details → use → package contents",
  },
  ozon: {
    sourceRu: ["Тип товара и категория выбраны без проверки", "Аннотация дублирует описание", "Медиа не выстроено для сравнения"],
    sourceEn: ["Product type and category were not verified", "The summary duplicates the description", "Media is not ordered for comparison"],
    readyRu: ["Тип товара и поля соответствуют категории Ozon", "Аннотация даёт краткий ответ, описание раскрывает детали", "Изображения и rich-контент работают как один сценарий"],
    readyEn: ["Product type and fields match the Ozon category", "The summary answers quickly and the description adds detail", "Images and rich content follow one scenario"],
    fieldsRu: "Тип товара → название → аннотация → характеристики → описание → варианты",
    fieldsEn: "Product type → title → summary → attributes → description → variants",
    imagesRu: "Главное фото → выгода → сравнение → характеристики → применение → rich-контент",
    imagesEn: "Primary image → benefit → comparison → attributes → use → rich content",
  },
  "yandex-market": {
    sourceRu: ["Предложение не связано с точной категорией", "Параметров недостаточно для сравнения", "Изображения не показывают важные размеры"],
    sourceEn: ["The offer is not mapped to the precise category", "Parameters are insufficient for comparison", "Images omit important dimensions"],
    readyRu: ["Категория и основные поля предложения согласованы", "Параметры участвуют в сравнении на Маркете", "Ракурсы и схемы показывают размер и комплектацию"],
    readyEn: ["Category and core offer fields are aligned", "Parameters support comparison on Market", "Angles and diagrams show dimensions and contents"],
    fieldsRu: "Категория → название → производитель → параметры → описание → идентификаторы",
    fieldsEn: "Category → title → manufacturer → parameters → description → identifiers",
    imagesRu: "Главное изображение → ракурсы → размерная схема → детали → комплектация",
    imagesEn: "Primary image → angles → dimension diagram → details → package contents",
  },
  megamarket: {
    sourceRu: ["Обязательные атрибуты собраны не полностью", "Название и описание не разделяют задачи", "Нет понятного задания на дополнительные фото"],
    sourceEn: ["Required attributes are incomplete", "Title and description do not have separate jobs", "There is no clear brief for additional photos"],
    readyRu: ["Матрица содержит обязательные поля категории", "Название идентифицирует товар, описание помогает выбрать", "Медиа-задание фиксирует ракурсы, размеры и детали"],
    readyEn: ["The matrix contains required category fields", "The title identifies the item and the description helps selection", "The media brief defines angles, dimensions and details"],
    fieldsRu: "Категория → название → характеристики → описание → идентификаторы",
    fieldsEn: "Category → title → attributes → description → identifiers",
    imagesRu: "Главное фото → преимущества → размеры → детали → применение → комплект",
    imagesEn: "Primary image → benefits → dimensions → details → use → package contents",
  },
};

export function getMarketplaceResultExample(platformId: MarketplaceId, locale: Locale): MarketplaceResultExample {
  const platform = marketplacePlatforms.find((item) => item.id === platformId)!;
  const name = marketplaceName(platform, locale);
  const item = details[platformId];
  const ru = locale === "ru";
  return {
    title: ru ? `Пример комплекта для ${name}` : `Example ${name} handover`,
    lead: ru
      ? "Это демонстрация структуры результата: конкретные формулировки появятся после проверки товара, категории и исходных материалов."
      : "This demonstrates the deliverable structure. Exact wording follows a review of the product, category and source assets.",
    before: {
      label: ru ? "Исходная карточка" : "Source card",
      title: ru ? "Данные есть, но покупателю трудно сравнить товар" : "Data exists, but the product is hard to compare",
      items: ru ? item.sourceRu : item.sourceEn,
    },
    after: {
      label: ru ? "Рекомендуемая структура" : "Recommended structure",
      title: ru ? "Поля, тексты и медиа собраны в один сценарий" : "Fields, copy and media follow one buying path",
      items: ru ? item.readyRu : item.readyEn,
    },
    rows: [
      { key: "search-phrases", label: ru ? "Поисковые фразы" : "Search phrases", value: ru ? "Группы формулировок покупателей без механического повторения в тексте" : "Shopper-language groups without mechanical repetition in copy" },
      { key: "card-fields", label: ru ? "Структура карточки" : "Card structure", value: ru ? item.fieldsRu : item.fieldsEn },
      { key: "image-scenario", label: ru ? "Сценарий изображений" : "Image scenario", value: ru ? item.imagesRu : item.imagesEn },
      { key: "files", label: ru ? "Файлы" : "Files", value: ru ? "Таблица полей и текстов, карта кадров, папка исходников и готовых материалов" : "Field-and-copy table, frame map, source-assets folder and ready files" },
      { key: "publishing-rules", label: ru ? "Правила публикации" : "Publishing rules", value: ru ? "Чек-лист полей, форматов, порядка загрузки и повторной проверки" : "Checklist for fields, formats, upload order and repeat verification" },
    ],
    disclaimer: ru
      ? "Пример не обещает рост позиций или продаж: он показывает состав материалов и критерии, по которым можно принять работу."
      : "The example does not promise rankings or sales. It shows the supplied materials and the criteria used to accept delivery.",
  };
}
