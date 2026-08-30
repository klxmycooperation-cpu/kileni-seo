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
    const metadata = getAuditCheckMetadata("en", canonicalSlug[1]);
    if (metadata) return metadata;
  }

  if (canonicalSlug[0] === "glossary" && canonicalSlug.length === 2) {
    const metadata = getGlossaryDetailMetadata("en", canonicalSlug[1]);
    if (metadata) return metadata;
  }

  if (canonicalSlug[0] === "blog" && canonicalSlug.length === 2) {
    const article = getArticle("en", canonicalSlug[1]);
    if (article) return buildArticleMetadata("en", article);
  }

  if (isPublicRoutePath(path)) return buildPublicMetadata("en", path);

  return {
    title: { absolute: "Page not found — KILENI" },
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params }: RouteParams) {
  const { slug } = await params;
  if (slug[0] === "articles") {
    permanentRedirect(`/en/blog${slug[1] ? `/${slug[1]}` : ""}`);
  }
  if (slug.length === 1 && slug[0] === "seo") permanentRedirect("/en/seo-promotion");
  return <PublicRoute locale="en" parts={slug}/>;
}

function canonicalParts(parts: string[]): string[] {
  if (parts[0] === "articles") return ["blog", ...parts.slice(1)];
  if (parts.length === 1 && parts[0] === "seo") return ["seo-promotion"];
  return parts;
}
