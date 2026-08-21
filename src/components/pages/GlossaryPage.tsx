import "../../../app/service-pricing-brief-10.css";

import Link from "next/link";
import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";
import { glossaryTerms } from "../../content/glossary";
import { PublicShell } from "../layout/PublicShell";

export function GlossaryPage({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  return (
    <PublicShell locale={locale}>
    <div className="glossary-page page-main">
      <section className="glossary-hero shell"><p className="section-kicker">{ru ? "Словарь" : "Glossary"}</p><h1>{ru ? "Термины — простыми словами" : "Search and digital terms in plain language"}</h1><p>{ru ? "Короткие определения без попытки спрятать смысл за профессиональной лексикой." : "Short definitions without hiding meaning behind professional jargon."}</p></section>
      <section className="glossary-grid shell">
        {glossaryTerms.map((term, index) => {
          const copy = term[locale];
          return (
            <article className="glossary-item" id={term.slug} key={term.slug}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h2>{copy.term}</h2>
              <p>{copy.definition}</p>
              <details>
                <summary>{ru ? "Разобрать на примере" : "Explain with an example"}</summary>
                <p><strong>{ru ? "Простыми словами:" : "In plain language:"}</strong> {copy.plain}</p>
                <p><strong>{ru ? "Почему важно:" : "Why it matters:"}</strong> {copy.why}</p>
                <p><strong>{ru ? "Пример:" : "Example:"}</strong> {copy.example}</p>
              </details>
              <Link href={copy.relatedHref}>{copy.relatedLabel}<span aria-hidden="true">↗</span></Link>
            </article>
          );
        })}
      </section>
      <section className="glossary-cta shell"><h2>{ru ? "Нужно проверить конкретный сайт?" : "Need to review a specific website?"}</h2><Link className="button" href={localizedPath(locale, "free-audit")}>{ru ? "Запустить бесплатную проверку" : "Start the free check"} ↗</Link></section>
    </div>
    </PublicShell>
  );
}
