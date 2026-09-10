import type { Locale } from "../config/site";
import { marketplacePlatforms, marketplaceName, type MarketplaceId } from "./marketplaces";

type ExampleState = { label: string; title: string; items: string[] };

export type MarketplaceResultExample = {
  title: string;
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
    sourceRu: ["Сверяем название с фактическим товаром", "Проверяем обязательные характеристики категории", "Отмечаем, каких ракурсов, размеров и деталей не хватает"],
    sourceEn: ["Match the title to the actual product", "Check the category's required attributes", "Record missing angles, dimensions and details"],
    readyRu: ["Передаём проверенный вариант названия", "Заполняем таблицу полей по выбранной категории", "Описываем каждый нужный кадр и его задачу"],
    readyEn: ["Deliver a verified title version", "Complete the field table for the selected category", "Describe every required frame and its purpose"],
    fieldsRu: "Сначала согласуем название и категорию, затем заполняем обязательные характеристики, варианты товара и описание.",
    fieldsEn: "Title → category → required attributes → variants → description",
    imagesRu: "Главное фото показывает товар, а следующие кадры объясняют отличия, размеры, детали, применение и комплектацию.",
    imagesEn: "Primary image → difference → size → details → use → package contents",
  },
  ozon: {
    sourceRu: ["Сверяем тип товара и категорию", "Проверяем, не дублируют ли друг друга краткий и полный тексты", "Отмечаем недостающие изображения и сведения"],
    sourceEn: ["Verify the product type and category", "Check whether summary and description duplicate each other", "Record missing images and product facts"],
    readyRu: ["Передаём таблицу полей для выбранной категории", "Разделяем краткое описание и подробности", "Задаём проверяемый порядок изображений и дополнительных блоков"],
    readyEn: ["Deliver a field table for the selected category", "Separate the summary from detailed information", "Define a verifiable order for images and extra blocks"],
    fieldsRu: "Сначала определяем тип товара и название, затем готовим аннотацию, характеристики, описание и варианты.",
    fieldsEn: "Product type → title → summary → attributes → description → variants",
    imagesRu: "После главного фото показываем пользу товара, сравнение, характеристики, применение и расширенные материалы.",
    imagesEn: "Primary image → benefit → comparison → attributes → use → rich content",
  },
  "yandex-market": {
    sourceRu: ["Сверяем выбранную категорию", "Проверяем обязательные параметры и идентификаторы", "Отмечаем недостающие ракурсы, размеры и комплектацию"],
    sourceEn: ["Verify the selected category", "Check required parameters and identifiers", "Record missing angles, dimensions and package contents"],
    readyRu: ["Передаём таблицу полей для выбранной категории", "Готовим проверенные параметры и тексты", "Описываем требования к ракурсам, размерам и комплектации"],
    readyEn: ["Deliver a field table for the selected category", "Prepare verified parameters and copy", "Define requirements for angles, dimensions and package contents"],
    fieldsRu: "Сначала проверяем категорию, название и производителя, затем заполняем параметры, описание и идентификаторы.",
    fieldsEn: "Category → title → manufacturer → parameters → description → identifiers",
    imagesRu: "После главного изображения показываем дополнительные ракурсы, размерную схему, детали и комплектацию.",
    imagesEn: "Primary image → angles → dimension diagram → details → package contents",
  },
};

export function getMarketplaceResultExample(platformId: MarketplaceId, locale: Locale): MarketplaceResultExample {
  const platform = marketplacePlatforms.find((item) => item.id === platformId)!;
  const name = marketplaceName(platform, locale);
  const item = details[platformId];
  const ru = locale === "ru";
  return {
    title: ru ? `Как выглядит передача материалов для ${name}` : `What the ${name} handover looks like`,
    before: {
      label: ru ? "Что проверяем" : "What we review",
      title: ru ? "На входе: карточка и данные продавца" : "Input: seller card and source data",
      items: ru ? item.sourceRu : item.sourceEn,
    },
    after: {
      label: ru ? "Что передаём" : "What we deliver",
      title: ru ? "На выходе: материалы для проверки перед загрузкой" : "Output: materials to verify before upload",
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
      ? "Результат не обещает позицию или продажи. Работу принимают по переданным файлам, заполненным полям и согласованному списку проверок."
      : "The result does not promise rankings or sales. Delivery is accepted against the supplied files, completed fields and agreed checklist.",
  };
}
