"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";
import type { Article } from "../../content/articles";

export function ArticlesIndex({ articles, locale }: { articles: readonly Article[]; locale: Locale }) {
  const ru = locale === "ru";
  const [topic, setTopic] = useState("all");
  const topics = useMemo(() => Array.from(new Set(articles.map((article) => articleCategory(article.slug, locale)))), [articles, locale]);
  const visible = topic === "all" ? articles : articles.filter((article) => articleCategory(article.slug, locale) === topic);

  return (
    <div className="shell article-index-browser">
      <nav className="article-topic-filter" aria-label={ru ? "Темы статей" : "Article topics"}>
        <button type="button" aria-pressed={topic === "all"} onClick={() => setTopic("all")}>{ru ? "Все материалы" : "All guides"}</button>
        {topics.map((item) => (
          <button type="button" aria-pressed={topic === item} onClick={() => setTopic(item)} key={item}>{item}</button>
        ))}
      </nav>

      <div className="article-index-grid" aria-live="polite">
        {visible.map((article, index) => (
          <ArticleIndexCard article={article} eager={index < 2} featured={index === 0} key={article.slug} locale={locale} />
        ))}
      </div>
    </div>
  );
}

function ArticleIndexCard({ article, eager, featured, locale }: { article: Article; eager: boolean; featured: boolean; locale: Locale }) {
  const ru = locale === "ru";
  const articleHref = localizedPath(locale, `blog/${article.slug}`);
  const service = articleService(article.slug, locale);
  return (
    <article className={`article-card${featured ? " article-card-featured" : ""}`}>
      <Link className="article-card-image-link" href={articleHref} aria-label={article.title}>
        <figure className="article-card-image">
          <Image
            src={article.hero.src}
            alt={article.hero.alt}
            width={1600}
            height={900}
            sizes={featured ? "(max-width: 820px) 100vw, 52vw" : "(max-width: 820px) 100vw, 38vw"}
            preload={featured}
            loading={eager && !featured ? "eager" : undefined}
          />
          <figcaption aria-hidden="true">{article.hero.credit}</figcaption>
        </figure>
      </Link>
      <div className="article-card-copy">
        <div className="article-card-meta">
          {featured ? <span>{ru ? "Главный материал" : "Featured"}</span> : null}
          <span>{articleCategory(article.slug, locale)}</span>
          <span>{article.readingMinutes} {ru ? "мин" : "min"}</span>
        </div>
        <h2><Link href={articleHref}>{article.title}</Link></h2>
        <p>{article.description}</p>
        <div className="article-card-result"><strong>{ru ? "После чтения" : "After reading"}</strong><span>{article.readerOutcome}</span></div>
        <Link className="article-card-service" href={localizedPath(locale, service.path)}>
          <strong>{ru ? "Связанная услуга" : "Related service"}</strong>
          <span>{service.label}</span>
        </Link>
        <Link className="text-link" href={articleHref}>{ru ? "Открыть статью" : "Open article"}</Link>
      </div>
    </article>
  );
}

function articleService(slug: string, locale: Locale) {
  const ru = locale === "ru";
  const services: Record<string, { labels: [string, string]; path: string }> = {
    "seo-audit-when-you-need-it": { labels: ["SEO-аудит", "SEO audit"], path: "seo-audit" },
    "why-website-is-not-in-search": { labels: ["SEO-аудит", "SEO audit"], path: "seo-audit" },
    "seo-vs-yandex-ads": { labels: ["Яндекс Реклама", "Yandex Ads"], path: "yandex-ads" },
    "wildberries-ozon-product-card": { labels: ["Маркетплейсы", "Marketplaces"], path: "marketplaces" },
    "website-speed-loading": { labels: ["Разработка сайтов", "Web development"], path: "web-development" },
    "seo-ecommerce-promotion": { labels: ["SEO-продвижение", "SEO growth"], path: "seo-promotion" },
    "seo-promotion-cost": { labels: ["SEO-продвижение", "SEO growth"], path: "seo-promotion" },
  };
  const item = services[slug] ?? { labels: ["SEO-аудит", "SEO audit"], path: "seo-audit" };
  return { label: item.labels[ru ? 0 : 1], path: item.path };
}

function articleCategory(slug: string, locale: Locale) {
  const ru = locale === "ru";
  const categories: Record<string, [string, string]> = {
    "seo-audit-when-you-need-it": ["Простыми словами", "Plain language"],
    "why-website-is-not-in-search": ["SEO", "SEO"],
    "seo-vs-yandex-ads": ["Реклама", "Advertising"],
    "wildberries-ozon-product-card": ["Маркетплейсы", "Marketplaces"],
    "website-speed-loading": ["Разработка", "Development"],
    "seo-ecommerce-promotion": ["SEO", "SEO"],
    "seo-promotion-cost": ["Аналитика", "Analytics"],
  };
  const item = categories[slug] ?? ["SEO", "SEO"];
  return item[ru ? 0 : 1];
}
