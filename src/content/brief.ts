import type { Locale } from "../config/site";

export type BriefService = "seo" | "audit" | "marketplaces" | "development" | "ads" | "custom";
type Question = { key: string; ru: string; en: string; type?: "textarea" | "select" | "url"; options?: Array<{ value: string; ru: string; en: string }> };

export const briefEstimatedMinutes = "5–7";

export const briefServices: Array<{ id: BriefService; ru: string; en: string; textRu: string; textEn: string }> = [
  { id: "seo", ru: "SEO и продвижение", en: "SEO growth", textRu: "Регулярная техническая и контентная работа", textEn: "Ongoing technical and content delivery" },
  { id: "audit", ru: "SEO-аудит", en: "SEO audit", textRu: "Диагностика и план исправлений", textEn: "Diagnosis and remediation roadmap" },
  { id: "marketplaces", ru: "Маркетплейсы", en: "Marketplaces", textRu: "Wildberries, Ozon, Яндекс Маркет и Мегамаркет", textEn: "Wildberries, Ozon, Yandex Market and Megamarket" },
  { id: "development", ru: "Разработка сайта", en: "Web development", textRu: "От лендинга до сложной системы", textEn: "From landing page to complex system" },
  { id: "ads", ru: "Яндекс Реклама", en: "Yandex Ads", textRu: "Настройка или ведение кампаний", textEn: "Campaign setup or management" },
  { id: "custom", ru: "Нестандартная задача", en: "Custom project", textRu: "Опишите результат — состав предложим сами", textEn: "Describe the outcome and we will scope it" },
];

export const commonBriefQuestions: Question[] = [
  { key: "company", ru: "Компания или проект", en: "Company or project" },
  { key: "business", ru: "Чем занимается бизнес?", en: "What does the business do?", type: "textarea" },
  { key: "offer", ru: "Какие товары или услуги вы предлагаете?", en: "Which products or services do you offer?", type: "textarea" },
  { key: "audience", ru: "Кто основной клиент?", en: "Who is the primary customer?" },
  { key: "geography", ru: "География работы", en: "Geography" },
  { key: "problem", ru: "Что сейчас не устраивает?", en: "What is not working today?", type: "textarea" },
  { key: "result", ru: "Какой результат нужен?", en: "What outcome do you need?", type: "textarea" },
  { key: "timeline", ru: "Желаемый срок", en: "Preferred timeline" },
  { key: "budget", ru: "Бюджетный диапазон", en: "Budget range", type: "select", options: [{ value: "unknown", ru: "Пока не знаю", en: "Not sure yet" }, { value: "under50", ru: "До 50 000 ₽", en: "Entry scope" }, { value: "50-150", ru: "50 000–150 000 ₽", en: "Standard scope" }, { value: "150-400", ru: "150 000–400 000 ₽", en: "Extended scope" }, { value: "400plus", ru: "Более 400 000 ₽", en: "Large scope" }] },
  { key: "competitors", ru: "Известные конкуренты", en: "Known competitors", type: "textarea" },
  { key: "examples", ru: "Примеры, которые нравятся", en: "Examples you like", type: "textarea" },
  { key: "wishes", ru: "Дополнительные пожелания и ограничения", en: "Additional preferences and constraints", type: "textarea" },
];

export const serviceQuestions: Record<BriefService, Question[]> = {
  seo: [{ key: "url", ru: "Ссылка на сайт", en: "Website URL", type: "url" }, { key: "priorities", ru: "Приоритетные услуги", en: "Priority services", type: "textarea" }, { key: "regions", ru: "Приоритетные регионы", en: "Priority regions" }, { key: "promotion", ru: "Продвигался ли сайт раньше?", en: "Has the website had SEO before?", type: "select", options: yesNoUnknown() }, { key: "history", ru: "Что уже пробовали?", en: "What has already been tried?", type: "textarea" }, { key: "analytics", ru: "Есть система аналитики?", en: "Is analytics available?", type: "select", options: yesNoUnknown() }, { key: "searchConsoles", ru: "Есть доступ к поисковым кабинетам?", en: "Are search console accounts available?", type: "select", options: yesNoUnknown() }, { key: "developer", ru: "Есть разработчик для внедрения?", en: "Is a developer available for implementation?", type: "select", options: yesNoUnknown() }],
  audit: [{ key: "url", ru: "Ссылка на сайт", en: "Website URL", type: "url" }, { key: "concern", ru: "Что беспокоит?", en: "What concerns you?", type: "textarea" }, { key: "changes", ru: "Что недавно изменилось?", en: "What changed recently?", type: "textarea" }, { key: "promotion", ru: "Проводилось ли продвижение?", en: "Has SEO been attempted?", type: "select", options: yesNoUnknown() }, { key: "auditComment", ru: "Комментарий", en: "Comment", type: "textarea" }],
  marketplaces: [{ key: "platform", ru: "Площадка", en: "Platform", type: "select", options: [{ value: "wildberries", ru: "Wildberries", en: "Wildberries" }, { value: "ozon", ru: "Ozon", en: "Ozon" }, { value: "yandex-market", ru: "Яндекс Маркет", en: "Yandex Market" }, { value: "megamarket", ru: "Мегамаркет", en: "Megamarket" }, { value: "multiple", ru: "Несколько площадок", en: "Multiple platforms" }, { value: "unknown", ru: "Пока не знаю", en: "Not sure yet" }] }, { key: "cards", ru: "Ссылки и артикулы", en: "Links and SKUs", type: "textarea" }, { key: "cardCount", ru: "Количество карточек", en: "Number of product cards" }, { key: "scope", ru: "Нужны только тексты или полная упаковка?", en: "Copy only or full packaging?", type: "select", options: [{ value: "copy", ru: "Только тексты", en: "Copy only" }, { value: "full", ru: "Полная упаковка", en: "Full packaging" }, { value: "unknown", ru: "Не знаю", en: "Not sure" }] }, { key: "sourcePhotos", ru: "Есть исходные фотографии?", en: "Are source photos available?", type: "select", options: yesNoUnknown() }, { key: "images", ru: "Нужны новые изображения?", en: "Are new images required?", type: "select", options: yesNoUnknown() }, { key: "infographics", ru: "Нужна инфографика?", en: "Is infographic design required?", type: "select", options: yesNoUnknown() }, { key: "generatedLooks", ru: "Нужна генерация образов?", en: "Are generated product looks required?", type: "select", options: yesNoUnknown() }, { key: "video", ru: "Нужно видео?", en: "Is video required?", type: "select", options: yesNoUnknown() }, { key: "publishing", ru: "Нужна публикация карточек?", en: "Is card publishing required?", type: "select", options: yesNoUnknown() }, { key: "scheduledReplacement", ru: "Нужна замена материалов по расписанию?", en: "Is scheduled asset replacement required?", type: "select", options: yesNoUnknown() }, { key: "ongoing", ru: "Нужно регулярное сопровождение?", en: "Is ongoing support required?", type: "select", options: yesNoUnknown() }],
  development: [{ key: "existing", ru: "Ссылка на действующий сайт, если есть", en: "Existing website URL, if any", type: "url" }, { key: "siteType", ru: "Какой сайт нужен?", en: "What kind of website is needed?" }, { key: "goal", ru: "Основная цель", en: "Primary goal", type: "textarea" }, { key: "pages", ru: "Нужные страницы", en: "Required pages", type: "textarea" }, { key: "functions", ru: "Нужные функции", en: "Required functions", type: "textarea" }, { key: "catalog", ru: "Нужен каталог?", en: "Is a catalogue required?", type: "select", options: yesNoUnknown() }, { key: "payment", ru: "Нужна онлайн-оплата?", en: "Is online payment required?", type: "select", options: yesNoUnknown() }, { key: "account", ru: "Нужен личный кабинет?", en: "Is a user account required?", type: "select", options: yesNoUnknown() }, { key: "integrations", ru: "Нужны интеграции?", en: "Are integrations required?", type: "select", options: yesNoUnknown() }, { key: "logo", ru: "Готов логотип?", en: "Is a logo ready?", type: "select", options: yesNoUnknown() }, { key: "identity", ru: "Готов фирменный стиль?", en: "Is a brand identity ready?", type: "select", options: yesNoUnknown() }, { key: "texts", ru: "Готовы тексты?", en: "Is copy ready?", type: "select", options: yesNoUnknown() }, { key: "photos", ru: "Готовы фотографии?", en: "Are photos ready?", type: "select", options: yesNoUnknown() }, { key: "likedSites", ru: "Понравившиеся сайты", en: "Websites you like", type: "textarea" }, { key: "developmentTimeline", ru: "Желаемый срок запуска", en: "Preferred launch timeline" }],
  ads: [{ key: "url", ru: "Ссылка на сайт", en: "Website URL", type: "url" }, { key: "campaigns", ru: "Есть действующие камании?", en: "Are there existing campaigns?", type: "select", options: yesNoUnknown() }, { key: "regions", ru: "Регионы и приоритетные услуги", en: "Regions and priority services" }, { key: "goals", ru: "Какие действия считаются целевыми?", en: "Which actions count as conversions?", type: "textarea" }],
  custom: [{ key: "context", ru: "Опишите задачу и ограничения", en: "Describe the task and constraints", type: "textarea" }, { key: "examples", ru: "Ссылки и примеры", en: "Links and examples", type: "textarea" }, { key: "certainty", ru: "Насколько ясен состав работ?", en: "How clear is the required scope?", type: "select", options: [{ value: "clear", ru: "Понятен", en: "Clear" }, { value: "unknown", ru: "Не уверен — помогите определить", en: "Not sure — help define it" }] }],
};

export const qLabel = (question: Question, locale: Locale) => locale === "ru" ? question.ru : question.en;

export function briefAnswerLabel(service: BriefService, key: string, locale: Locale): string {
  const question = [...commonBriefQuestions, ...serviceQuestions[service]].find((item) => item.key === key);
  if (question) return qLabel(question, locale);
  const fallback: Record<string, [string, string]> = {
    name: ["Имя", "Name"],
    contact: ["E-mail", "Email"],
    consent: ["Согласие", "Consent"],
    sourceService: ["Выбранное направление", "Selected direction"],
    selectedTier: ["Выбранный уровень", "Selected tier"],
    sourceOffer: ["Выбранное предложение", "Selected offer"],
  };
  return fallback[key]?.[locale === "ru" ? 0 : 1] ?? key;
}

function yesNoUnknown(): Array<{ value: string; ru: string; en: string }> {
  return [{ value: "yes", ru: "Да", en: "Yes" }, { value: "no", ru: "Нет", en: "No" }, { value: "unknown", ru: "Не знаю", en: "Not sure" }];
}
