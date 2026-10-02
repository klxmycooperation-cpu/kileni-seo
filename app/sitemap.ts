import type { MetadataRoute } from "next";
import { localizedPath, publicRoutes, siteConfig } from "@/src/config/site";
import { publicRouteLastModified } from "@/src/config/seo-metadata";
import { articleSlugs, getArticle } from "@/src/content/articles";
import { getGlossaryTerm } from "@/src/content/glossary";
import { auditCheckSitemapEntries } from "@/src/lib/seo/audit-check-metadata";
import { glossarySitemapPaths } from "@/src/lib/seo/glossary-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const sources = [
    ...publicRoutes.map((path) => ({ path, lastModified: publicRouteLastModified(path) })),
    ...articleSlugs.map((slug) => ({
      path: `blog/${slug}`,
      lastModified: articleLastModified(slug),
    })),
    ...auditCheckSitemapEntries.map(({ path, updatedAt }) => ({
      path,
      lastModified: updatedAt,
    })),
    ...glossarySitemapPaths.map((path) => ({
      path,
      lastModified: glossaryLastModified(path),
    })),
  ];

  return sources.map(({ path, lastModified }) => ({ url: absoluteUrl(localizedPath("ru", path)), lastModified }));
}

function absoluteUrl(path: string): string {
  return new URL(path, siteConfig.baseUrl).toString();
}

function articleLastModified(slug: string): string {
  const article = getArticle("ru", slug);
  if (!article) throw new Error(`Sitemap article is missing: ${slug}`);
  return article.date;
}

function glossaryLastModified(path: string): string {
  const slug = path.slice("glossary/".length);
  const term = getGlossaryTerm(slug);
  if (!term) throw new Error(`Sitemap glossary term is missing: ${slug}`);
  return term.updatedAt;
}
