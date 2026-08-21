import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { PublicRoute } from "@/src/components/pages/PublicRoute";
import { getArticle } from "@/src/content/articles";

const titles: Record<string, string> = { services: "Services", "seo-audit": "SEO audit", "seo-promotion": "SEO growth", marketplaces: "Marketplace product cards", "marketplaces/wildberries": "Wildberries product cards", "marketplaces/ozon": "Ozon product cards", "marketplaces/yandex-market": "Yandex Market product cards", "marketplaces/megamarket": "Megamarket product cards", "web-development": "Web development", "yandex-ads": "Yandex Ads", "content-materials": "Content and production materials", "custom-task": "Custom project", pricing: "Pricing", calculator: "Estimate calculator", cases: "Cases", "cases/eco-santeh": "eco-santeh.ru case", "cases/zasorservice": "засорсервис.рф case", brief: "Online brief", blog: "SEO and digital blog", articles: "SEO and digital blog", glossary: "SEO and digital glossary", about: "About", contacts: "Contact", privacy: "Privacy", consent: "Consent", "free-audit": "Free SEO check" };
const descriptions: Record<string, string> = { "free-audit": "Free SEO website check: we review up to 10 key public pages and show an overall score with the main risk areas." };
export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params; const canonicalSlug = slug[0] === "articles" ? ["blog", ...slug.slice(1)] : slug; const path = canonicalSlug.join("/"); const article = canonicalSlug[0] === "blog" && canonicalSlug[1] ? getArticle("en", canonicalSlug[1]) : undefined;
  const alternates = { canonical: `/en/${path}`, languages: { ru: `/${path}`, en: `/en/${path}`, "x-default": `/${path}` } };
  if (!article) return { title: titles[path] ?? "KILENI", description: descriptions[path], alternates };
  return { title: article.title, description: article.description, alternates, openGraph: { type: "article", title: article.title, description: article.description, publishedTime: article.date, authors: [article.author], images: [{ url: article.hero.src, alt: article.hero.alt }] }, twitter: { card: "summary_large_image", title: article.title, description: article.description, images: [article.hero.src] } };
}
export default async function Page({ params }: { params: Promise<{ slug: string[] }> }) { const { slug } = await params; if (slug[0] === "articles") permanentRedirect(`/en/blog${slug[1] ? `/${slug[1]}` : ""}`); return <PublicRoute locale="en" parts={slug}/>; }
