import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { PublicRoute } from "@/src/components/pages/PublicRoute";
import { getArticle } from "@/src/content/articles";

const titles: Record<string, string> = { services: "Услуги", "seo-audit": "SEO-аудит", "seo-promotion": "SEO-продвижение", marketplaces: "Карточки для маркетплейсов", "marketplaces/wildberries": "Карточки Wildberries", "marketplaces/ozon": "Карточки Ozon", "marketplaces/yandex-market": "Карточки Яндекс Маркета", "marketplaces/megamarket": "Карточки Мегамаркета", "web-development": "Разработка сайтов", "yandex-ads": "Яндекс Реклама", "content-materials": "Контент и материалы", "custom-task": "Нестандартная задача", pricing: "Цены", calculator: "Калькулятор стоимости", cases: "Кейсы", "cases/eco-santeh": "Кейс eco-santeh.ru", "cases/zasorservice": "Кейс засорсервис.рф", brief: "Онлайн-бриф", blog: "Блог о SEO и digital", articles: "Блог о SEO и digital", glossary: "Словарь SEO и digital", about: "О компании", contacts: "Контакты", privacy: "Политика данных", consent: "Согласие", "free-audit": "Бесплатная SEO-проверка" };
const descriptions: Record<string, string> = { "free-audit": "Бесплатная SEO-проверка сайта онлайн: проверяем до 10 ключевых публичных страниц, показываем общую оценку и основные зоны риска." };
export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params; const canonicalSlug = slug[0] === "articles" ? ["blog", ...slug.slice(1)] : slug; const path = canonicalSlug.join("/"); const article = canonicalSlug[0] === "blog" && canonicalSlug[1] ? getArticle("ru", canonicalSlug[1]) : undefined;
  const alternates = { canonical: `/${path}`, languages: { ru: `/${path}`, en: `/en/${path}`, "x-default": `/${path}` } };
  if (!article) return { title: titles[path] ?? "KILENI", description: descriptions[path], alternates };
  return { title: article.title, description: article.description, alternates, openGraph: { type: "article", title: article.title, description: article.description, publishedTime: article.date, authors: [article.author], images: [{ url: article.hero.src, alt: article.hero.alt }] }, twitter: { card: "summary_large_image", title: article.title, description: article.description, images: [article.hero.src] } };
}
export default async function Page({ params }: { params: Promise<{ slug: string[] }> }) { const { slug } = await params; if (slug[0] === "articles") permanentRedirect(`/blog${slug[1] ? `/${slug[1]}` : ""}`); return <PublicRoute locale="ru" parts={slug}/>; }
