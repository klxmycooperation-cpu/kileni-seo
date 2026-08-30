import { briefAnswerLabel, type BriefService } from "@/src/content/brief";
import type { Locale } from "@/src/config/site";

const submissionStatusLabels: Readonly<Record<string, string>> = {
  new: "Новая",
  contacted: "Связались",
  clarification: "Уточняем задачу",
  proposal_sent: "Предложение отправлено",
  in_work: "В работе",
  won: "Завершена успешно",
  lost: "Закрыта без сделки",
};

const serviceLabels: Readonly<Record<string, string>> = {
  seo: "SEO-продвижение",
  audit: "SEO-аудит",
  marketplaces: "Маркетплейсы",
  development: "Разработка сайта",
  ads: "Яндекс Реклама",
  custom: "Другая задача",
  "seo-audit": "SEO-аудит",
  "seo-promotion": "SEO-продвижение",
  "web-development": "Разработка сайта",
  "yandex-ads": "Яндекс Реклама",
  "content-materials": "Тексты и материалы",
};

const answerValueLabels: Readonly<Record<string, string>> = {
  yes: "Да",
  no: "Нет",
  unknown: "Пока не знаю",
  clear: "Задача понятна",
  copy: "Только тексты",
  full: "Полная упаковка",
  multiple: "Несколько площадок",
  wildberries: "Wildberries",
  ozon: "Ozon",
  "yandex-market": "Яндекс Маркет",
  megamarket: "Мегамаркет",
  under50: "До 50 000 ₽",
  "50-150": "50 000–150 000 ₽",
  "150-400": "150 000–400 000 ₽",
  "400plus": "Более 400 000 ₽",
};

export type AdminContactAction = {
  display: string;
  href: string | null;
  kind: "email" | "phone" | "telegram" | "unknown";
  actionLabel: string;
};

export function submissionStatusLabel(value: unknown): string {
  const status = String(value ?? "").trim();
  return submissionStatusLabels[status] ?? "Статус не определён";
}

export function serviceLabel(value: unknown): string {
  const service = String(value ?? "").trim();
  return serviceLabels[service] ?? (service || "Не указано");
}

export function localeLabel(value: unknown): string {
  return value === "en" ? "Английский" : value === "ru" ? "Русский" : "Не указан";
}

export function sourceLabel(value: unknown): string {
  const source = String(value ?? "").trim();
  const labels: Readonly<Record<string, string>> = {
    lead_form: "Форма заявки",
    "service-form": "Форма на странице услуги",
    calculator: "Калькулятор",
    brief: "Бриф",
    free_audit: "Бесплатная проверка",
  };
  return labels[source] ?? (source || "Не указан");
}

export function contactAction(contactValue: unknown, contactTypeValue?: unknown): AdminContactAction {
  const display = String(contactValue ?? "").trim().replace(/[\r\n]/gu, " ");
  const declaredType = String(contactTypeValue ?? "").trim();
  if (!display) return { display: "Не указан", href: null, kind: "unknown", actionLabel: "Связаться" };

  if (declaredType === "email" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(display)) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(display)
      ? { display, href: `mailto:${display}`, kind: "email", actionLabel: "Написать письмо" }
      : { display, href: null, kind: "unknown", actionLabel: "Связаться" };
  }

  const telegramHandle = telegramUsername(display, declaredType);
  if (telegramHandle) {
    return {
      display: display.startsWith("@") ? display : `@${telegramHandle}`,
      href: `https://t.me/${telegramHandle}`,
      kind: "telegram",
      actionLabel: "Открыть Telegram",
    };
  }

  const phone = phoneNumber(display, declaredType);
  if (phone) {
    return { display, href: `tel:${phone}`, kind: "phone", actionLabel: "Позвонить" };
  }

  return { display, href: null, kind: "unknown", actionLabel: "Связаться" };
}

export function briefAnswerEntries(
  answers: unknown,
  serviceValue: unknown,
  localeValue: unknown,
): Array<{ key: string; label: string; value: string }> {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return [];
  const service = validBriefService(serviceValue);
  const locale: Locale = localeValue === "en" ? "en" : "ru";
  return Object.entries(answers as Record<string, unknown>)
    .filter(([key, value]) => !["name", "contact", "consent"].includes(key) && hasReadableValue(value))
    .map(([key, value]) => ({
      key,
      label: service ? briefAnswerLabel(service, key, locale) : fallbackFieldLabel(key),
      value: formatAnswerValue(value),
    }));
}

export function readableEntries(value: unknown): Array<{ key: string; label: string; value: string }> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => hasReadableValue(item))
    .map(([key, item]) => ({ key, label: fallbackFieldLabel(key), value: formatAnswerValue(item) }));
}

export function notificationLabel(value: unknown): string {
  const status = String(value ?? "").trim();
  const labels: Readonly<Record<string, string>> = {
    sent: "Отправлено",
    failed: "Ошибка отправки",
    skipped: "Не отправлялось",
    queued: "Ожидает отправки",
    pending: "Ожидает отправки",
  };
  return labels[status] ?? (status || "Статус не указан");
}

export function channelLabel(value: unknown): string {
  const channel = String(value ?? "").trim();
  if (channel === "email") return "Email";
  if (channel === "telegram") return "Telegram";
  return channel || "Канал не указан";
}

function validBriefService(value: unknown): BriefService | null {
  const service = String(value ?? "") as BriefService;
  return ["seo", "audit", "marketplaces", "development", "ads", "custom"].includes(service) ? service : null;
}

function telegramUsername(value: string, declaredType: string): string | null {
  let candidate = value;
  if (/^https?:\/\/(?:www\.)?t\.me\//iu.test(candidate)) {
    try {
      candidate = new URL(candidate).pathname.split("/").filter(Boolean)[0] ?? "";
    } catch {
      return null;
    }
  } else if (/^(?:www\.)?t\.me\//iu.test(candidate)) {
    candidate = candidate.replace(/^(?:www\.)?t\.me\//iu, "").split("/")[0] ?? "";
  } else {
    candidate = candidate.replace(/^@/u, "");
  }
  if (declaredType !== "telegram" && !value.startsWith("@") && !/t\.me\//iu.test(value)) return null;
  return /^[A-Za-z0-9_]{5,32}$/u.test(candidate) ? candidate : null;
}

function phoneNumber(value: string, declaredType: string): string | null {
  if (declaredType !== "phone" && !/^\+?[\d\s()-]+$/u.test(value)) return null;
  const digits = value.replace(/\D/gu, "");
  if (digits.length < 10 || digits.length > 15) return null;
  return `${value.startsWith("+") ? "+" : ""}${digits}`;
}

function hasReadableValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return Boolean(value.trim());
  return true;
}

function formatAnswerValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  if (Array.isArray(value)) return value.map(formatAnswerValue).join(", ");
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => hasReadableValue(item))
      .map(([key, item]) => `${fallbackFieldLabel(key)}: ${formatAnswerValue(item)}`)
      .join("; ");
  }
  const text = String(value ?? "").trim();
  return answerValueLabels[text] ?? (text || "Не указано");
}

function fallbackFieldLabel(key: string): string {
  const labels: Readonly<Record<string, string>> = {
    pageUrl: "Страница отправки",
    utm: "Рекламные метки",
    utmSource: "Источник рекламы",
    utmMedium: "Тип рекламы",
    utmCampaign: "Кампания",
    consentVersion: "Версия согласия",
    kind: "Вид расчёта",
    minPrice: "Стоимость от",
    maxPrice: "Стоимость до",
    answers: "Ответы",
    createdAt: "Создано",
  };
  if (labels[key]) return labels[key];
  return key
    .replace(/([a-zа-я])([A-ZА-Я])/gu, "$1 $2")
    .replace(/[_-]+/gu, " ")
    .replace(/^./u, (letter) => letter.toUpperCase());
}
