import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";
import { HeroAuditTool } from "./HeroAuditTool";
import { CanvasText } from "../ui/canvas-text";
import { HeroFreeAuditUsageCounter } from "./HeroFreeAuditUsageCounter";
import { HomeCheckCategories } from "./HomeProcessSteps";

export function HeroScan({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const heroTitle = ru
    ? "Сайт есть Пора сделать так, что бы его находили"
    : "Your website is live. Now make it discoverable.";
  const checks = ru
    ? [
        { title: "Индексация", text: "Может ли страница попасть в поиск", slug: "indexing" },
        { title: "Структура", text: "Понятны ли заголовки и связи страниц", slug: "on-page" },
        { title: "Скорость", text: "Не мешает ли загрузка посетителю", slug: "core-web-vitals" },
        { title: "Оптимизация", text: "Что исправить в первую очередь", slug: "seo-audit" },
      ]
    : [
        { title: "Indexing", text: "Can the page enter search results?", slug: "indexing" },
        { title: "Structure", text: "Are headings and page links clear?", slug: "on-page" },
        { title: "Speed", text: "Does loading get in the visitor's way?", slug: "core-web-vitals" },
        { title: "Optimisation", text: "What should be fixed first?", slug: "seo-audit" },
      ];

  return (
    <section className="hero hero-ready signal-hero" aria-labelledby="hero-title">
      <div className="shell hero-grid">
        <div className="hero-copy">
          <h1 id="hero-title">
            <CanvasText className="hero-title-canvas" text={heroTitle}>
              {ru ? <>
                <span className="hero-title-canvas__line">{"Сайт\u00a0есть"}</span><br />
                <span className="hero-title-canvas__line">{"Пора\u00a0сделать\u00a0так,"}</span><br />
                <span className="hero-title-canvas__line">{"что\u00a0бы\u00a0его\u00a0находили"}</span>
              </> : heroTitle}
            </CanvasText>
          </h1>
          <p className="hero-lead">
            {ru
              ? "Проверим сайт и простыми словами покажем, что мешает ему появляться в поиске и что исправить в первую очередь."
              : "We will check your website and explain in plain language what is preventing it from appearing in search and what to fix first."}
          </p>
          <p className="hero-offer">
            {ru
              ? "Бесплатная SEO-проверка до 10 страниц"
              : "Free SEO check for up to 10 pages"}
          </p>
          <HeroFreeAuditUsageCounter locale={locale} />
          <div className="hero-entry-actions">
            <a className="button button-primary" href="#free-check">
              {ru ? "Узнать, что мешает сайту" : "See what is holding the website back"}<span aria-hidden="true">↓</span>
            </a>
            <a className="hero-proof-link" href="#home-cases">
              {ru ? "Посмотреть реальные результаты" : "See real results"}<span aria-hidden="true">↗</span>
            </a>
          </div>
          <p className="hero-microcopy">
            {ru
              ? "Обычно 1–3 минуты. Результат покажет конкретные замечания по проверенным страницам и откроется сразу на сайте."
              : "Usually 3–7 minutes. Specific URLs and a remediation plan are included in the extended audit."}
          </p>
          <HomeCheckCategories locale={locale} variant="hero" items={checks.map((check) => ({ ...check, href: localizedPath(locale, `glossary/${check.slug}`) }))}/>
        </div>
        <HeroAuditTool locale={locale} />
      </div>
    </section>
  );
}
