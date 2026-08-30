import type { Locale } from "../config/site";

export type Dictionary = typeof dictionaries.ru;

export const dictionaries = {
  ru: {
    nav: { services: "Услуги", audit: "Бесплатная проверка", pricing: "Цены", cases: "Кейсы", articles: "Блог", brief: "Бриф", cta: "Проверить сайт" },
    hero: {
      eyebrow: "Бесплатная SEO-проверка до 10 страниц",
      title: "Сайт есть. Пора сделать так, чтобы его находили.",
      text: "Бесплатно проверим до 10 страниц, оценим техническое состояние сайта и покажем основные зоны риска. Без доступа к админке.",
      scanWords: ["Индексация", "Структура", "Скорость", "Оптимизация"],
    },
    auditForm: {
      title: "Бесплатная предварительная проверка",
      url: "Адрес сайта", name: "Ваше имя", contact: "Telegram или e-mail",
      consent: "Согласен на обработку данных и получение ответа.",
      authority: "Я имею отношение к сайту или вправе запросить проверку его публичной части.",
      submit: "Проверить сайт бесплатно", details: "Что именно проверяется?", pending: "Отправляем сайт на проверку…",
    },
    scenarios: [
      { title: "Проверить сайт", text: "Найдём главные ошибки и покажем, что исправлять сначала.", href: "/seo-audit", code: "01" },
      { title: "Продвигать сайт", text: "Будем исправлять страницы и регулярно добавлять новые.", href: "/seo-promotion", code: "02" },
      { title: "Улучшить карточки", text: "Подготовим тексты, фотографии и инфографику для Wildberries и Ozon.", href: "/marketplaces", code: "03" },
      { title: "Сделать новый сайт", text: "Спроектируем, оформим, разработаем и запустим.", href: "/web-development", code: "04" },
      { title: "Обсудить другую задачу", text: "Опишите задачу — назовём состав, срок и цену.", href: "/brief", code: "05" },
    ],
    process: [
      { title: "Проверяем", text: "Собираем публичные страницы и фиксируем исходное состояние без доступа к админке." },
      { title: "Объясняем", text: "Отделяем важные риски от второстепенных и показываем понятный порядок действий." },
      { title: "Исправляем", text: "После согласования состава и цены вносим только подтверждённые изменения." },
      { title: "Перепроверяем", text: "Повторяем те же проверки и показываем, что действительно изменилось." },
    ],
    common: {
      learnMore: "Подробнее", from: "от", order: "Обсудить задачу", send: "Отправить", back: "Назад", next: "Далее",
      individual: "Рассчитаем после короткого брифа", noGuarantee: "Никто не может заранее обещать позицию в поиске или число продаж: на них влияют спрос, конкуренты, сезонность и сам продукт. Мы заранее фиксируем состав, срок и стоимость работ, а после изменений всё проверяем ещё раз.",
      responseTime: "Свяжемся в течение одного рабочего часа ежедневно с 10:00 до 20:00 по московскому времени.",
    },
  },
  en: {
    nav: { services: "Services", audit: "Free check", pricing: "Prices", cases: "Cases", articles: "Blog", brief: "Brief", cta: "Check a website" },
    hero: {
      eyebrow: "Free SEO check for up to 10 pages",
      title: "Your website is live. Now make it discoverable.",
      text: "We will check up to 10 pages, assess the technical baseline and highlight the main risk areas. No admin access required.",
      scanWords: ["Indexing", "Structure", "Speed", "Optimisation"],
    },
    auditForm: {
      title: "Free preliminary website check", url: "Website address", name: "Your name", contact: "Telegram or email",
      consent: "I agree to personal data processing and receiving a response.",
      authority: "I am associated with this website or authorized to request a check of its public pages.",
      submit: "Check my website", details: "What is checked?", pending: "Sending the website for review…",
    },
    scenarios: [
      { title: "Check a website", text: "Find the main issues and decide what to fix first.", href: "/seo-audit", code: "01" },
      { title: "Improve search traffic", text: "Fix existing pages and publish useful new ones each month.", href: "/seo-promotion", code: "02" },
      { title: "Improve product listings", text: "Prepare copy, images and infographics for Wildberries and Ozon.", href: "/marketplaces", code: "03" },
      { title: "Build a new website", text: "Plan, design, build and launch it.", href: "/web-development", code: "04" },
      { title: "Discuss another task", text: "Describe it and we will name the work, timing and price.", href: "/brief", code: "05" },
    ],
    process: [
      { title: "Check", text: "Collect public pages and record the initial state without admin access." },
      { title: "Explain", text: "Separate material risks from secondary issues and set a clear order of work." },
      { title: "Fix", text: "After agreeing scope and price, make only the confirmed changes." },
      { title: "Recheck", text: "Repeat the same checks and show exactly what changed." },
    ],
    common: {
      learnMore: "Explore", from: "from", order: "Discuss the project", send: "Send", back: "Back", next: "Next",
      individual: "Quoted after a short brief", noGuarantee: "Nobody can promise a search position or number of sales in advance: demand, competitors, seasonality and the product all matter. We agree the work, timing and price upfront, then check everything again after the changes.",
      responseTime: "We reply during the first working hour between 10:00 and 20:00 Moscow time.",
    },
  },
} as const;

export function getDictionary(locale: Locale) { return dictionaries[locale]; }
