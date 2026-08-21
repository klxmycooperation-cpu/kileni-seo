import type { Locale } from "../../config/site";
import { getDictionary } from "../../content/dictionary";
import { BrandIntro } from "./BrandIntro";
import { HeroAuditTool } from "./HeroAuditTool";

export function HeroScan({ locale }: { locale: Locale }) {
  const d = getDictionary(locale);
  const ru = locale === "ru";

  return (
    <section className="hero hero-ready signal-hero" aria-labelledby="hero-title">
      <BrandIntro />
      <div className="shell hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">{ru ? "Бесплатная SEO-проверка до 10 страниц" : "Free SEO check for up to 10 pages"}</p>
          <h1 id="hero-title">{ru ? "Сайт есть. Пора сделать так, чтобы его находили." : "Your website is live. Now make it discoverable."}</h1>
          <p className="hero-lead">
            {ru
              ? "Бесплатно проверим до 10 страниц, оценим техническое состояние сайта и покажем основные зоны риска. Без доступа к админке."
              : "We will check up to 10 pages, assess the technical baseline and highlight the main risk areas. No admin access required."}
          </p>
          <p className="hero-honesty">
            {ru
              ? "Сначала факты. Потом разговор о продвижении."
              : "Facts first. Then a conversation about growth."}
          </p>
          <p className="hero-free-audit-usage" aria-label={ru ? "1 267 страниц уже прошли бесплатную проверку KILENI" : "1,267 pages have already completed a free KILENI check"}>
            <span className="hero-free-audit-usage__dot" aria-hidden="true" />
            <strong>{ru ? "1 267" : "1,267"}</strong>
            <span>{ru ? "страниц уже прошли проверку KILENI" : "pages have already completed a KILENI check"}</span>
          </p>
          <div className="hero-entry-actions">
            <a className="button button-primary" href="#free-check">
              {ru ? "Проверить сайт бесплатно" : "Check a website for free"}<span aria-hidden="true">↓</span>
            </a>
            <a className="hero-proof-link" href="#home-cases">
              {ru ? "Посмотреть реальные результаты" : "See real results"}<span aria-hidden="true">↗</span>
            </a>
          </div>
          <p className="hero-microcopy">
            {ru
              ? "Обычно 3–7 минут. Конкретные URL и план исправлений входят в расширенный аудит."
              : "Usually 3–7 minutes. Specific URLs and a remediation plan are included in the extended audit."}
          </p>
          <div
            className="scan-keywords"
            aria-label={locale === "ru" ? "Что даст проверка" : "What the check provides"}
          >
            {d.hero.scanWords.map((word, index) => (
              <span key={word}>
                <b>{String(index + 1).padStart(2, "0")}</b>
                {word}
              </span>
            ))}
          </div>
        </div>
        <HeroAuditTool locale={locale} />
      </div>
    </section>
  );
}
