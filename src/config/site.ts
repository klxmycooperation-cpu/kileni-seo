import { PUBLIC_AUDIT_PAGE_LIMIT } from "./public-audit";

const defaultPublicPhone = "+7 925 225-60-20";
const publicPhone = process.env.PUBLIC_PHONE?.trim() || defaultPublicPhone;

export const siteConfig = {
  name: "KILENI",
  descriptor: "SEO",
  pronunciation: "Килени",
  baseUrl: resolvedBaseUrl(),
  audit: {
    // Public audit scope is a product boundary, not a deployment override.
    pageLimit: PUBLIC_AUDIT_PAGE_LIMIT,
    timeoutMs: configuredNumber(process.env.AUDIT_TIMEOUT_MS, 420_000, 30_000, 420_000),
    cacheDays: 7,
    // Protect the public checker without blocking a person after a few retries.
    rateLimit: { hourly: 12, daily: 50 },
    retentionDays: configuredNumber(process.env.AUDIT_RESULT_RETENTION_DAYS, 90, 90, 3_650),
  },
  publicContacts: {
    phone: publicPhone,
    email: process.env.PUBLIC_EMAIL?.trim() ?? "",
    telegram: process.env.PUBLIC_TELEGRAM?.trim() || "@kmdozz",
    whatsapp: process.env.PUBLIC_WHATSAPP?.trim() ?? "",
    maxPhone: process.env.PUBLIC_MAX?.trim() || publicPhone,
    maxUrl: process.env.PUBLIC_MAX_URL?.trim() || "https://web.max.ru/",
  },
  legal: {
    name: process.env.LEGAL_NAME ?? "",
    address: process.env.LEGAL_ADDRESS ?? "",
    email: process.env.LEGAL_EMAIL ?? "",
    inn: process.env.LEGAL_INN ?? "",
    version: process.env.LEGAL_POLICY_VERSION ?? "2026-08-15",
    policyUrl: process.env.LEGAL_POLICY_URL ?? "",
    consentUrl: process.env.LEGAL_CONSENT_URL ?? "",
    prelaunch: process.env.PRELAUNCH_MODE !== "false",
  },
  forms: {
    enabled: publicFormsAreEnabled(),
  },
} as const;

function resolvedBaseUrl(): string {
  if (process.env.APP_BASE_URL?.trim()) return process.env.APP_BASE_URL.trim();
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  return vercelHost ? `https://${vercelHost.replace(/^https?:\/\//, "").replace(/\/$/, "")}` : "http://localhost:3000";
}

function configuredNumber(raw: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const value = Number(raw ?? fallback);
  return Number.isFinite(value) ? Math.max(minimum, Math.min(maximum, Math.floor(value))) : fallback;
}

export type Locale = "ru" | "en";

export const publicRoutes = [
  "",
  "services",
  "seo-audit",
  "seo-promotion",
  "marketplaces",
  "marketplaces/wildberries",
  "marketplaces/ozon",
  "marketplaces/yandex-market",
  "marketplaces/megamarket",
  "web-development",
  "yandex-ads",
  "content-materials",
  "custom-task",
  "pricing",
  "calculator",
  "cases",
  "cases/eco-santeh",
  "cases/zasorservice",
  "brief",
  "blog",
  "glossary",
  "about",
  "contacts",
  "privacy",
  "consent",
  "free-audit",
] as const;

export function localizedPath(locale: Locale, path = ""): string {
  const clean = path.replace(/^\/+|\/+$/g, "");
  if (locale === "en") return clean ? `/en/${clean}` : "/en";
  return clean ? `/${clean}` : "/";
}

/** Read at request time so an operator can disable every public mutation endpoint. */
export function publicFormsAreEnabled(): boolean {
  const configured = process.env.FORMS_ENABLED?.trim();
  if (configured) return configured !== "false";
  // A serverless deployment without legal/storage configuration must never
  // silently open public submissions. Local development keeps its useful
  // default, while Vercel requires an explicit opt-in.
  return process.env.VERCEL !== "1";
}

export function siteIsInPrelaunchMode(): boolean {
  return process.env.PRELAUNCH_MODE !== "false";
}

export function prelaunchRobotsMetadata(): { index: false; follow: false; nocache: true } | undefined {
  return siteIsInPrelaunchMode() ? { index: false, follow: false, nocache: true } : undefined;
}

export function legalDocumentsAreComplete(): boolean {
  const legal = siteConfig.legal;
  return [legal.name, legal.address, legal.email, legal.inn, legal.version, legal.policyUrl, legal.consentUrl]
    .every((value) => value.trim().length > 0);
}

export function legalOperatorSummary(locale: Locale): string | null {
  if (!legalDocumentsAreComplete()) return null;
  const legal = siteConfig.legal;
  return locale === "ru"
    ? `${legal.name} · ИНН ${legal.inn} · ${legal.address} · ${legal.email}`
    : `${legal.name} · Tax ID ${legal.inn} · ${legal.address} · ${legal.email}`;
}

let legalWarningShown = false;
let integrationWarningShown = false;

export function warnIfProductionLegalConfigIsIncomplete(): void {
  if (legalWarningShown || process.env.NODE_ENV !== "production" || !publicFormsAreEnabled()) return;
  const missing = Object.entries(siteConfig.legal)
    .filter(([key, value]) => key !== "prelaunch" && key !== "version" && typeof value === "string" && !value.trim())
    .map(([key]) => key);
  if (!missing.length) return;
  legalWarningShown = true;
  console.warn(`[KILENI LEGAL CONFIG] Публичные формы включены, но не заполнены обязательные поля: ${missing.join(", ")}. Заполните LEGAL_* и проверьте документы с юристом до публичного запуска.`);
}

export function warnIfProductionIntegrationConfigIsIncomplete(): void {
  if (integrationWarningShown || process.env.NODE_ENV !== "production") return;
  const hasTurnstileSiteKey = Boolean(process.env.TURNSTILE_SITE_KEY?.trim());
  const hasTurnstileSecret = Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
  if (hasTurnstileSiteKey === hasTurnstileSecret) return;
  integrationWarningShown = true;
  console.warn("[KILENI TURNSTILE CONFIG] Для включения защиты одновременно заполните TURNSTILE_SITE_KEY и TURNSTILE_SECRET_KEY. При одном секретном ключе сервер отклоняет отправку fail-closed.");
}
