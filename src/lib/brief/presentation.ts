import { getOffer, localizedOffer } from "../../config/offers";
import type { Locale } from "../../config/site";
import {
  briefAnswerLabel,
  briefQuestionForAnswer,
  briefServices,
  type BriefService,
} from "../../content/brief";

export type BriefPresentationEntry = {
  key: string;
  label: string;
  value: string;
};

type BriefPresentationOptions = {
  offerDetails?: "include" | "exclude";
};

const identityKeys = new Set(["name", "contact", "consent"]);
const offerDetailKeys = new Set([
  "sourceOffer",
  "selectedOfferTitle",
  "selectedOfferPrice",
  "selectedOfferScope",
  "selectedOfferDuration",
  "selectedOfferResult",
]);

const serviceAliases: Readonly<Record<string, BriefService>> = {
  seo: "seo",
  audit: "audit",
  marketplaces: "marketplaces",
  development: "development",
  ads: "ads",
  custom: "custom",
  "seo-audit": "audit",
  "seo-promotion": "seo",
  "web-development": "development",
  "yandex-ads": "ads",
  "content-materials": "custom",
  "custom-task": "custom",
};

const metadataLabels: Readonly<Record<string, readonly [string, string]>> = {
  selectedOffer: ["Выбранное предложение", "Selected offer"],
  selectedOfferPrice: ["Стоимость", "Price"],
  selectedOfferScope: ["Объём", "Scope"],
  selectedOfferDuration: ["Срок", "Timing"],
  selectedOfferResult: ["Результат", "Result"],
  sourceService: ["Выбранное направление", "Selected direction"],
  selectedTier: ["Выбранный вариант", "Selected option"],
};

const answerValueLabels: Readonly<Record<string, readonly [string, string]>> = {
  yes: ["Да", "Yes"],
  no: ["Нет", "No"],
  unknown: ["Пока не знаю", "Not sure yet"],
  clear: ["Задача понятна", "The task is clear"],
  copy: ["Только тексты", "Copy only"],
  full: ["Полная упаковка", "Full package"],
  multiple: ["Несколько площадок", "Multiple platforms"],
  wildberries: ["Wildberries", "Wildberries"],
  ozon: ["Ozon", "Ozon"],
  "yandex-market": ["Яндекс Маркет", "Yandex Market"],
  megamarket: ["Мегамаркет", "Megamarket"],
  under50: ["До 50 000 ₽", "Up to 50,000 RUB"],
  "50-150": ["50 000–150 000 ₽", "50,000–150,000 RUB"],
  "150-400": ["150 000–400 000 ₽", "150,000–400,000 RUB"],
  "400plus": ["Более 400 000 ₽", "Over 400,000 RUB"],
  basic: ["Базовый", "Basic"],
  base: ["Базовый", "Basic"],
  extended: ["Расширенный", "Extended"],
  expanded: ["Расширенный", "Extended"],
  turnkey: ["Под ключ", "Turnkey"],
};

export function briefServiceName(value: unknown, locale: Locale = "ru"): string {
  const service = serviceAliases[String(value ?? "").trim()];
  const item = briefServices.find((candidate) => candidate.id === service);
  if (item) return locale === "ru" ? item.ru : item.en;
  return locale === "ru" ? "Направление не указано" : "Service not specified";
}

export function briefPresentationEntries(
  answers: unknown,
  serviceValue: unknown,
  localeValue: unknown,
  options: BriefPresentationOptions = {},
): BriefPresentationEntry[] {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return [];
  const locale: Locale = localeValue === "en" ? "en" : "ru";
  const service = serviceAliases[String(serviceValue ?? "").trim()] ?? "custom";
  const values = answers as Record<string, unknown>;
  const excludeOfferDetails = options.offerDetails === "exclude";
  const hasSourceOffer = hasReadableValue(values.sourceOffer);

  return Object.entries(values).flatMap(([key, value]): BriefPresentationEntry[] => {
    if (identityKeys.has(key) || !hasReadableValue(value)) return [];
    if (excludeOfferDetails && (offerDetailKeys.has(key) || key === "sourceService" || key === "selectedTier")) return [];

    if (key === "sourceOffer") {
      const title = offerTitle(value, values.selectedOfferTitle, locale);
      return title ? [{ key: "selectedOffer", label: metadataLabel("selectedOffer", locale), value: title }] : [];
    }
    if (key === "selectedOfferTitle") {
      if (hasSourceOffer) return [];
      const title = cleanText(value);
      return title ? [{ key: "selectedOffer", label: metadataLabel("selectedOffer", locale), value: title }] : [];
    }
    if (["selectedOfferPrice", "selectedOfferScope", "selectedOfferDuration", "selectedOfferResult"].includes(key)) {
      return [{ key, label: metadataLabel(key, locale), value: formatBriefValue(value, locale) }];
    }
    if (key === "sourceService") {
      const sourceService = serviceAliases[String(value ?? "").trim()];
      return sourceService
        ? [{ key: "selectedDirection", label: metadataLabel(key, locale), value: briefServiceName(sourceService, locale) }]
        : [];
    }
    if (key === "selectedTier") {
      const tier = displayOptionValue(value, locale);
      return tier ? [{ key, label: metadataLabel(key, locale), value: tier }] : [];
    }

    const label = answerLabel(service, key, locale);
    return [{ key, label, value: formatQuestionValue(service, key, value, locale) }];
  });
}

export function formatBriefEmailCopy(
  locale: Locale,
  service: BriefService,
  answers: Readonly<Record<string, unknown>>,
): string {
  const serviceName = briefServiceName(service, locale);
  const heading = locale === "ru"
    ? `KILENI сохранил ваш бриф по направлению «${serviceName}». Ниже — копия ответов.`
    : `KILENI saved your “${serviceName}” brief. A copy of your answers follows.`;
  const rows = briefPresentationEntries(answers, service, locale)
    .map((entry) => `${entry.label}: ${entry.value}`);
  const footer = locale === "ru"
    ? "Это автоматическая копия. Мы свяжемся с вами в рабочее время."
    : "This is an automated copy. We will follow up during working hours.";
  return `${heading}\n\n${rows.join("\n")}\n\n${footer}`.slice(0, 20_000);
}

function offerTitle(value: unknown, fallback: unknown, locale: Locale): string | null {
  const offer = getOffer(typeof value === "string" ? value : undefined);
  if (offer) return localizedOffer(offer, locale).title;
  return cleanText(fallback);
}

function answerLabel(service: BriefService, key: string, locale: Locale): string {
  if (briefQuestionForAnswer(service, key)) return briefAnswerLabel(service, key, locale);
  return locale === "ru" ? "Дополнительная информация" : "Additional information";
}

function formatQuestionValue(service: BriefService, key: string, value: unknown, locale: Locale): string {
  const question = briefQuestionForAnswer(service, key);
  if (question?.options && typeof value === "string") {
    const option = question.options.find((candidate) => candidate.value === value);
    if (option) return locale === "ru" ? option.ru : option.en;
  }
  return formatBriefValue(value, locale);
}

function formatBriefValue(value: unknown, locale: Locale): string {
  if (typeof value === "boolean") return value ? localize("Да", "Yes", locale) : localize("Нет", "No", locale);
  if (Array.isArray(value)) return value.map((item) => formatBriefValue(item, locale)).join(", ");
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .filter(hasReadableValue)
      .map((item) => formatBriefValue(item, locale))
      .join("; ");
  }
  return displayOptionValue(value, locale) ?? localize("Не указано", "Not specified", locale);
}

function displayOptionValue(value: unknown, locale: Locale): string | null {
  const text = cleanText(value);
  if (!text) return null;
  return answerValueLabels[text]?.[locale === "ru" ? 0 : 1] ?? text;
}

function metadataLabel(key: string, locale: Locale): string {
  return metadataLabels[key]?.[locale === "ru" ? 0 : 1]
    ?? localize("Дополнительная информация", "Additional information", locale);
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  return text || null;
}

function hasReadableValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return Boolean(value.trim());
  if (Array.isArray(value)) return value.some(hasReadableValue);
  return true;
}

function localize(ru: string, en: string, locale: Locale): string {
  return locale === "ru" ? ru : en;
}
