import type { MetadataRoute } from "next";
import { publicRoutes, siteConfig } from "@/src/config/site";
import { articleSlugs } from "@/src/content/articles";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [...publicRoutes, ...articleSlugs.map((slug) => `blog/${slug}`)];
  return paths.flatMap((path) => {
    const ru = path ? `/${path}` : "/"; const en = path ? `/en/${path}` : "/en";
    return [{ url: new URL(ru, siteConfig.baseUrl).toString(), lastModified: new Date("2026-08-17"), changeFrequency: path.startsWith("blog") ? "monthly" : "weekly", priority: path === "" ? 1 : .7, alternates: { languages: { ru: new URL(ru, siteConfig.baseUrl).toString(), en: new URL(en, siteConfig.baseUrl).toString() } } }, { url: new URL(en, siteConfig.baseUrl).toString(), lastModified: new Date("2026-08-17"), changeFrequency: path.startsWith("blog") ? "monthly" : "weekly", priority: path === "" ? .8 : .65, alternates: { languages: { ru: new URL(ru, siteConfig.baseUrl).toString(), en: new URL(en, siteConfig.baseUrl).toString() } } }];
  });
}
