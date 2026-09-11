import Link from "next/link";
import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";
import { HeroAuditTool } from "./HeroAuditTool";
import { HeroFreeAuditUsageCounter } from "./HeroFreeAuditUsageCounter";

export function HeroScan({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const checks = ru
    ? [
        { title: "Индексация", text: "Может ли страница попасть в поиск", slug: "indexing" },
        { title: "Структура", text: "Точно ли заголовки описывают страницы", slug: "on-page" },
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
          <p className="eyebrow">{ru ? "Бесплатная SEO-проверка до 10 страниц" : "Free SEO check for up to 10 pages"}</p>
          <h1 id="hero-title">
            <span className="hero-title-lock">{ru ? "Сайт есть." : "Your website is live."}</span>{" "}
            {ru ? "Пора сделать так, чтобы его находили." : "Now make it discoverable."}
          </h1>
          <p className="hero-lead">
            {ru
              ? "Проверим сайт и простыми словами покажем, что мешает ему появляться в поиске и что исправить в первую очередь."
              : "We will check up to 10 pages, assess the technical baseline and highlight the main risk areas. No admin access required."}
          </p>
          <p className="hero-honesty">
            {ru
              ? "Проверка покажет, с каких исправлений стоит начать."
              : "The check shows which improvements should come first."}
          </p>
          <HeroFreeAuditUsageCounter locale={locale} />
          <div className="hero-entry-actions">
            <a className="button button-primary" href="#free-check">
              {ru ? "Проверить сайт" : "Check your website"}<span aria-hidden="true">↓</span>
            </a>
            <a className="hero-proof-link" href="#home-cases">
              {ru ? "Посмотреть реальные результаты" : "See real results"}<span aria-hidden="true">↗</span>
            </a>
          </div>
          <p className="hero-microcopy">
            {ru
              ? "Обычно 3–7 минут. Результат покажет конкретные замечания по проверенным страницам и откроется сразу на сайте."
              : "Usually 3–7 minutes. Specific URLs and a remediation plan are included in the extended audit."}
          </p>
          <div
            className="scan-keywords"
            aria-label={locale === "ru" ? "Что даст проверка" : "What the check provides"}
          >
            {checks.map((check, index) => (
              <Link className="hero-check-link" href={localizedPath(locale, `glossary/${check.slug}`)} key={check.slug}>
                <b>{String(index + 1).padStart(2, "0")}</b>
                <span>
                  <em>{check.title}</em>
                  <small>{check.text}</small>
                </span>
                <i aria-hidden="true">↗</i>
              </Link>
            ))}
          </div>
        </div>
        <HeroAuditTool locale={locale} />
      </div>
    </section>
  );
}
