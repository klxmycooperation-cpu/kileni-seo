import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { PublicRoute } from "@/src/components/pages/PublicRoute";
import {
  buildArticleMetadata,
  buildPublicMetadata,
  isPublicRoutePath,
} from "@/src/config/seo-metadata";
import { getArticle } from "@/src/content/articles";
import { getAuditCheckMetadata } from "@/src/lib/seo/audit-check-metadata";
import { getGlossaryDetailMetadata } from "@/src/lib/seo/glossary-metadata";

type RouteParams = { params: Promise<{ slug: string[] }> };

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  const canonicalSlug = canonicalParts(slug);
  const path = canonicalSlug.join("/");

  if (canonicalSlug[0] === "checks" && canonicalSlug.length <= 2) {
    const metadata = getAuditCheckMetadata("ru", canonicalSlug[1]);
    if (metadata) return metadata;
  }

  if (canonicalSlug[0] === "glossary" && canonicalSlug.length === 2) {
    const metadata = getGlossaryDetailMetadata("ru", canonicalSlug[1]);
    if (metadata) return metadata;
  }

  if (canonicalSlug[0] === "blog" && canonicalSlug.length === 2) {
    const article = getArticle("ru", canonicalSlug[1]);
    if (article) return buildArticleMetadata("ru", article);
  }

  if (isPublicRoutePath(path)) return buildPublicMetadata("ru", path);

  return {
    title: { absolute: "Страница не найдена — KILENI" },
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params }: RouteParams) {
  const { slug } = await params;
  if (slug.length === 2 && slug[0] === "marketplaces" && slug[1] === "megamarket") {
    permanentRedirect("/marketplaces");
  }
  if (slug[0] === "articles") {
    permanentRedirect(`/blog${slug[1] ? `/${slug[1]}` : ""}`);
  }
  return <PublicRoute locale="ru" parts={slug}/>;
}

function canonicalParts(parts: string[]): string[] {
  if (parts[0] === "articles") return ["blog", ...parts.slice(1)];
  return parts;
}
