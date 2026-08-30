import {
  formatOfferPrice,
  getOffer,
  localizedOffer,
  type Offer,
} from "../config/offers";
import { localizedPath, type Locale } from "../config/site";

export const serviceDirectionIds = ["seo", "development", "marketplaces", "custom"] as const;

export type ServiceDirectionId = (typeof serviceDirectionIds)[number];

export type ServiceDirection = Readonly<{
  id: ServiceDirectionId;
  label: string;
  title: string;
  problem: string;
  promise: string;
  journey: readonly string[];
  actions: readonly string[];
  outcomes: readonly string[];
  included: readonly string[];
  offerId: string;
  price: string;
  duration: string;
  primaryCta: Readonly<{ label: string; href: string }>;
  secondaryCta?: Readonly<{ label: string; href: string }>;
  visual: Readonly<{
    label: string;
    stages: readonly [string, string, string, string];
    result: string;
  }>;
}>;

type DirectionCopy = Omit<ServiceDirection, "price" | "duration" | "primaryCta" | "secondaryCta"> & {
  primaryCta: Readonly<{ label: string; path: string }>;
  secondaryCta?: Readonly<{ label: string; path: string }>;
};

const directionCopy: Record<Locale, readonly DirectionCopy[]> = {
  ru: [
    {
      id: "seo",
      label: "SEO",
      title: "Найти, что мешает сайту, исправить и развивать",
      problem: "Сайт плохо находят, подрядчик присылает непонятные отчёты или вы не знаете, с чего начать.",
      promise: "Покажем конкретные проблемы, исправим согласованный объём и перепроверим результат.",
      journey: ["Бесплатная проверка", "SEO-аудит", "Аудит с внедрением", "SEO-продвижение"],
      actions: [
        "Проверяем, открываются ли важные страницы для поиска",
        "Находим проблемы на конкретных адресах",
        "Исправляем согласованный объём",
        "Повторно проверяем результат",
      ],
      outcomes: [
        "Список задач по важности",
        "Примеры проблемных страниц",
        "Понятные задания на исправление",
        "Результат повторной проверки",
      ],
      included: [
        "Проверка страниц и повторяющихся шаблонов",
        "Проверка названий, описаний и внутренних ссылок",
        "Проверка скорости и мобильной версии",
        "Разбор результата без сложных терминов",
      ],
      offerId: "seo-audit-50",
      primaryCta: { label: "Перейти к SEO", path: "seo" },
      secondaryCta: { label: "Бесплатно проверить до 10 страниц", path: "free-audit" },
      visual: {
        label: "Путь SEO-работы",
        stages: ["Карта сайта", "Зоны риска", "Исправления", "Динамика"],
        result: "Страницы готовы к повторной проверке",
      },
    },
    {
      id: "development",
      label: "Разработка сайтов",
      title: "Собрать сайт под задачу бизнеса, а не просто набор страниц",
      problem: "Нужен новый сайт, но пока неясно, какие страницы, функции и материалы действительно помогут клиенту сделать выбор.",
      promise: "Сначала соберём структуру и прототип, затем разработаем адаптивный сайт и передадим исходники.",
      journey: ["Старт", "Бизнес · Рекомендуем", "Максимум"],
      actions: [
        "Уточняем задачу и путь клиента",
        "Собираем структуру и прототип",
        "Проектируем интерфейс для всех экранов",
        "Разрабатываем, подключаем формы и проверяем",
      ],
      outcomes: [
        "Рабочая мобильная и desktop-версия",
        "Подключённые формы и измерение обращений",
        "Панель управления содержимым",
        "Исходники и инструкция по запуску",
      ],
      included: [
        "Структура страниц и прототип",
        "Оригинальный дизайн ключевых экранов",
        "Адаптивная разработка",
        "Формы, базовая аналитика и подготовка к поиску",
      ],
      offerId: "development-start",
      primaryCta: { label: "Выбрать формат сайта", path: "web-development" },
      visual: {
        label: "Путь разработки сайта",
        stages: ["Структура", "Прототип", "Интерфейс", "Готовый сайт"],
        result: "Сайт готов к запуску и передаче",
      },
    },
    {
      id: "marketplaces",
      label: "Маркетплейсы",
      title: "Подготовить карточки под правила конкретной площадки",
      problem: "Карточка теряет важные данные, плохо участвует в сравнении или выглядит непоследовательно на выбранной площадке.",
      promise: "Соберём поля, тексты и изображения под правила площадки и подготовим комплект для публикации.",
      journey: ["Wildberries", "Ozon", "Яндекс Маркет"],
      actions: [
        "Проверяем категорию и обязательные поля",
        "Собираем поисковые фразы и характеристики",
        "Готовим тексты и план изображений",
        "Передаём материалы и чек-лист публикации",
      ],
      outcomes: [
        "SEO и тексты карточки",
        "Заполненные характеристики",
        "Сценарий изображений",
        "Комплект для публикации и сопровождения",
      ],
      included: [
        "Проверка категории и видимых конкурентов",
        "Название, описание и характеристики",
        "План изображений под выбранную площадку",
        "Один раунд согласованных правок",
      ],
      offerId: "marketplace-wildberries-audit",
      primaryCta: { label: "Выбрать площадку", path: "marketplaces" },
      visual: {
        label: "Путь подготовки карточки товара",
        stages: ["Пустая карточка", "Данные", "Изображения", "Готовая карточка"],
        result: "Материалы готовы к публикации",
      },
    },
    {
      id: "custom",
      label: "Нестандартная задача",
      title: "Разобрать задачу, для которой не подходит готовый тариф",
      problem: "Опишите результат, который хотите получить. Мы предложим состав, проверяемый первый этап, срок и стоимость.",
      promise: "Отделим цель от способа решения и предложим первый самостоятельный этап, который можно проверить и принять.",
      journey: ["Контекст", "Границы", "Первый этап", "Приёмка"],
      actions: [
        "Фиксируем текущее и нужное состояние",
        "Проверяем зависимости и ограничения",
        "Выделяем самостоятельный первый этап",
        "Согласуем способ проверки результата",
      ],
      outcomes: [
        "Понятная граница первого этапа",
        "Список входных данных и зависимостей",
        "Срок и смета до начала работы",
        "Критерий готовности результата",
      ],
      included: [
        "Короткий разбор задачи",
        "Фиксация неизвестных и допущений",
        "Варианты решения с ограничениями",
        "Состав первого проверяемого этапа",
      ],
      offerId: "custom-task-consultation",
      primaryCta: { label: "Разобрать задачу", path: "custom-task" },
      visual: {
        label: "Путь разбора нестандартной задачи",
        stages: ["Элементы", "Связи", "Схема", "Первый этап"],
        result: "Задачу можно оценить и принять",
      },
    },
  ],
  en: [
    {
      id: "seo",
      label: "SEO",
      title: "Find what holds the website back, fix it and keep improving",
      problem: "The website is hard to find, reports are unclear, or you do not know where to start.",
      promise: "We show specific issues, implement the agreed scope and verify the result again.",
      journey: ["Free check", "SEO audit", "Audit with implementation", "SEO promotion"],
      actions: [
        "Check whether important pages are open to search engines",
        "Find issues on specific URLs",
        "Implement the agreed scope",
        "Verify the result again",
      ],
      outcomes: [
        "Prioritised task list",
        "Examples of affected pages",
        "Clear implementation requirements",
        "Repeat-check result",
      ],
      included: [
        "Page and repeated-template review",
        "Titles, descriptions and internal links",
        "Speed and mobile review",
        "A plain-language results walkthrough",
      ],
      offerId: "seo-audit-50",
      primaryCta: { label: "Explore SEO", path: "seo" },
      secondaryCta: { label: "Check up to 10 pages for free", path: "free-audit" },
      visual: {
        label: "SEO workflow",
        stages: ["Site map", "Risk areas", "Fixes", "Progress"],
        result: "Pages are ready for a repeat check",
      },
    },
    {
      id: "development",
      label: "Website development",
      title: "Build a website around the business task, not a pile of pages",
      problem: "You need a new website, but the pages, features and content that will help customers choose are not yet clear.",
      promise: "We define the structure and prototype first, then build a responsive website and hand over the source code.",
      journey: ["Start", "Business · Recommended", "Maximum"],
      actions: [
        "Clarify the task and customer journey",
        "Build the structure and prototype",
        "Design the interface for every screen size",
        "Develop, connect forms and verify",
      ],
      outcomes: [
        "Working mobile and desktop versions",
        "Connected forms and enquiry measurement",
        "Manageable website content",
        "Source code and launch guidance",
      ],
      included: [
        "Page structure and prototype",
        "Original key-screen design",
        "Responsive development",
        "Forms, basic analytics and search preparation",
      ],
      offerId: "development-start",
      primaryCta: { label: "Choose a website format", path: "web-development" },
      visual: {
        label: "Website development path",
        stages: ["Structure", "Prototype", "Interface", "Live website"],
        result: "The website is ready to launch and hand over",
      },
    },
    {
      id: "marketplaces",
      label: "Marketplaces",
      title: "Prepare product cards for the rules of a specific marketplace",
      problem: "The card loses important data, compares poorly or presents the product inconsistently on the chosen platform.",
      promise: "We prepare fields, copy and images for the platform and hand over a publication-ready package.",
      journey: ["Wildberries", "Ozon", "Yandex Market"],
      actions: [
        "Review the category and required fields",
        "Prepare search phrases and attributes",
        "Write the copy and image plan",
        "Hand over materials and a publishing checklist",
      ],
      outcomes: [
        "Product-card SEO and copy",
        "Complete attributes",
        "Image sequence",
        "Publishing and support package",
      ],
      included: [
        "Category and visible-competitor review",
        "Title, description and attributes",
        "Platform-specific image plan",
        "One agreed revision round",
      ],
      offerId: "marketplace-wildberries-audit",
      primaryCta: { label: "Choose a marketplace", path: "marketplaces" },
      visual: {
        label: "Product-card preparation path",
        stages: ["Blank card", "Data", "Images", "Ready card"],
        result: "Materials are ready for publication",
      },
    },
    {
      id: "custom",
      label: "Non-standard task",
      title: "Define a task that does not fit a ready-made package",
      problem: "Describe the result you need. We will propose the scope, a verifiable first stage, timing and cost.",
      promise: "We separate the goal from the assumed solution and propose a self-contained first stage that can be checked and accepted.",
      journey: ["Context", "Boundaries", "First stage", "Acceptance"],
      actions: [
        "Record the current and required state",
        "Check dependencies and constraints",
        "Define a self-contained first stage",
        "Agree how its result will be verified",
      ],
      outcomes: [
        "A clear first-stage boundary",
        "Required inputs and dependencies",
        "Timing and estimate before work starts",
        "A clear acceptance check",
      ],
      included: [
        "A concise task review",
        "Known unknowns and assumptions",
        "Solution options with limitations",
        "Scope of the first verifiable stage",
      ],
      offerId: "custom-task-consultation",
      primaryCta: { label: "Define the task", path: "custom-task" },
      visual: {
        label: "Non-standard task definition path",
        stages: ["Elements", "Links", "Solution map", "First stage"],
        result: "The task can now be estimated and accepted",
      },
    },
  ],
};

export function getServiceDirections(locale: Locale): ServiceDirection[] {
  return directionCopy[locale].map((direction) => {
    const offer = requiredOffer(direction.offerId);
    const localized = localizedOffer(offer, locale);
    return {
      ...direction,
      price: formatOfferPrice(offer, locale),
      duration: localized.duration,
      primaryCta: {
        label: direction.primaryCta.label,
        href: localizedPath(locale, direction.primaryCta.path),
      },
      secondaryCta: direction.secondaryCta
        ? {
            label: direction.secondaryCta.label,
            href: localizedPath(locale, direction.secondaryCta.path),
          }
        : undefined,
    };
  });
}

function requiredOffer(offerId: string): Offer {
  const offer = getOffer(offerId);
  if (!offer) throw new Error(`Unknown services hub offer: ${offerId}`);
  return offer;
}
