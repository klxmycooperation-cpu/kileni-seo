import type { Locale } from "../../config/site";
import { getDictionary } from "../../content/dictionary";
import { HeroAuditTool } from "./HeroAuditTool";
import { HeroFreeAuditUsageCounter } from "./HeroFreeAuditUsageCounter";

export function HeroScan({ locale }: { locale: Locale }) {
  const d = getDictionary(locale);
  const ru = locale === "ru";

  return (
    <section className="hero hero-ready signal-hero" aria-labelledby="hero-title">
      <div className="shell hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">{ru ? "Бесплатная SEO-проверка до 10 страниц" : "Free SEO check for up to 10 pages"}</p>
          <h1 id="hero-title">{ru ? "Сайт есть. Пора сделать так, чтобы его находили." : "Your website is live. Now make it discoverable."}</h1>
          <p className="hero-lead">
            {ru
              ? "Проверим до 10 публичных страниц: открываются ли они, могут ли попасть в поиск, правильно ли заполнены заголовки и ссылки. Покажем, что исправить в первую очередь. Доступ к сайту не нужен."
              : "We will check up to 10 pages, assess the technical baseline and highlight the main risk areas. No admin access required."}
          </p>
          <p className="hero-honesty">
            {ru
              ? "Сначала факты. Потом разговор о продвижении."
              : "Facts first. Then a conversation about growth."}
          </p>
          <HeroFreeAuditUsageCounter locale={locale} />
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
              ? "Обычно 3–7 минут. Результат покажет конкретные замечания по проверенным страницам и откроется сразу на сайте."
              : "Usually 3–7 minutes. Specific URLs and a remediation plan are included in the extended audit."}
          </p>
          <div
            className="scan-keywords"
            aria-label={locale === "ru" ? "Что даст проверка" : "What the check provides"}
          >
            {d.hero.scanWords.map((word, index) => (
              <span key={word}>
                <b>{String(index + 1).padStart(2, "0")}</b>
                <em>{word}</em>
              </span>
            ))}
          </div>
        </div>
        <HeroAuditTool locale={locale} />
      </div>
    </section>
  );
}
