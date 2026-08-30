import type { Metadata } from "next";

import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";
import {
  getGlossaryTerm,
  indexableGlossarySlugs,
} from "../../content/glossary";

export const glossarySitemapPaths = indexableGlossarySlugs.map(
  (slug) => `glossary/${slug}`,
);

export function glossaryDetailPath(locale: Locale, slug: string): string {
  return localizedPath(locale, `glossary/${slug}`);
}

/**
 * Integration hook for the RU and EN catch-all routes.
 * Draft terms remain useful from the glossary hub but must stay out of search
 * until their term-specific copy passes editorial review.
 */
export function getGlossaryDetailMetadata(
  locale: Locale,
  slug: string,
): Metadata | null {
  const term = getGlossaryTerm(slug);
  if (!term) return null;

  const copy = term[locale];
  const canonical = glossaryDetailPath(locale, term.slug);
  const russian = glossaryDetailPath("ru", term.slug);
  const english = glossaryDetailPath("en", term.slug);
  const description = compactDescription(`${copy.term}: ${copy.definition} ${copy.why}`);
  const title = locale === "ru"
    ? `${copy.term}: что означает термин в digital`
    : `${copy.term}: plain-language digital definition`;

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical,
      languages: { ru: russian, en: english, "x-default": russian },
    },
    ...(term.indexable ? {} : { robots: { index: false, follow: true } }),
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

function compactDescription(value: string): string {
  const normalized = value.replace(/\s+/gu, " ").trim();
  if (normalized.length <= 160) return normalized;
  const shortened = normalized.slice(0, 157);
  const wordBoundary = shortened.lastIndexOf(" ");
  return `${shortened.slice(0, wordBoundary > 90 ? wordBoundary : 157).trimEnd()}…`;
}
