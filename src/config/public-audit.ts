/** Public product limit for the introductory audit. */
export const PUBLIC_AUDIT_PAGE_LIMIT = 10 as const;

/** Approved historic baseline, extended only by completed public audit jobs. */
export const FREE_AUDIT_PAGE_BASELINE = 1_267 as const;

export function freeAuditUsageLabel(locale: "ru" | "en", count: number): string {
  if (locale === "en") return "pages have completed a free KILENI check";
  const absolute = Math.abs(count) % 100;
  const remainder = absolute % 10;
  if (absolute > 10 && absolute < 20) return "страниц прошли бесплатную проверку KILENI";
  if (remainder === 1) return "страница прошла бесплатную проверку KILENI";
  if (remainder >= 2 && remainder <= 4) return "страницы прошли бесплатную проверку KILENI";
  return "страниц прошли бесплатную проверку KILENI";
}
