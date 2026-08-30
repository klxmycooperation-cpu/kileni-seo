import type { Metadata } from "next";

import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";
import { auditChecks, getAuditCheck } from "../../content/audit-checks";

export const auditCheckSitemapEntries = [
  { path: "checks", updatedAt: "2026-08-24" },
  ...auditChecks.map((check) => ({ path: `checks/${check.slug}`, updatedAt: check.updatedAt })),
];

export function getAuditCheckMetadata(locale: Locale, slug?: string): Metadata | null {
  if (!slug) {
    const title = locale === "ru" ? "Методика бесплатного SEO-аудита" : "Free SEO audit methodology";
    const description = locale === "ru"
      ? "30 проверок KILENI: доступность, индексация, структура, скорость, разметка, контент и изображения — с критериями и ограничениями."
      : "The 30 KILENI checks for access, indexing, structure, performance, markup, content and images, with criteria and limitations.";
    return metadata(locale, "checks", title, description);
  }

  const check = getAuditCheck(slug);
  if (!check) return null;
  const copy = check[locale];
  const description = compact(`${copy.summary} ${copy.pass}`);
  const title = locale === "ru"
    ? `${copy.title}: критерий SEO-проверки`
    : `${copy.title}: website SEO audit check`;
  return metadata(locale, `checks/${check.slug}`, title, description, true);
}

function metadata(locale: Locale, path: string, title: string, description: string, absoluteTitle = false): Metadata {
  const canonical = localizedPath(locale, path);
  const ru = localizedPath("ru", path);
  const en = localizedPath("en", path);
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical, languages: { ru, en, "x-default": ru } },
    openGraph: {
      type: "article",
      siteName: "KILENI",
      title,
      description,
      url: canonical,
      locale: locale === "ru" ? "ru_RU" : "en_GB",
      images: [{ url: "/brand/kileni-og.png", width: 1200, height: 630, alt: "KILENI" }],
    },
  };
}

function compact(value: string): string {
  const normalized = value.replace(/\s+/gu, " ").trim();
  if (normalized.length <= 160) return normalized;
  const candidate = normalized.slice(0, 157);
  const boundary = candidate.lastIndexOf(" ");
  return `${candidate.slice(0, boundary > 90 ? boundary : 157).trimEnd()}…`;
}
