import Link from "next/link";
import { notFound } from "next/navigation";

import type { Locale } from "../../config/site";
import { localizedPath, siteConfig } from "../../config/site";
import {
  getGlossaryTerm,
  getRelatedGlossaryTerms,
} from "../../content/glossary";
import { glossaryDetailPath } from "../../lib/seo/glossary-metadata";
import { Breadcrumbs } from "../layout/Breadcrumbs";
import { PublicShell } from "../layout/PublicShell";
import { GlossaryReturnLink } from "../glossary/GlossaryReturnLink";

function formatEditorialDate(locale: Locale, value: string) {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function GlossaryTermPage({ locale, slug }: { locale: Locale; slug: string }) {
  const term = getGlossaryTerm(slug);
  if (!term) notFound();

  const ru = locale === "ru";
  const copy = term[locale];
  const related = getRelatedGlossaryTerms(term.slug);
  const canonical = glossaryDetailPath(locale, term.slug);
  const schema = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: copy.term,
    description: copy.definition,
    url: new URL(canonical, siteConfig.baseUrl).toString(),
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: ru ? "Словарь SEO и digital KILENI" : "KILENI SEO and digital glossary",
      url: new URL(localizedPath(locale, "glossary"), siteConfig.baseUrl).toString(),
    },
  };

  return (
    <PublicShell locale={locale}>
      <div className="glossary-page page-main">
        <Breadcrumbs
          locale={locale}
          items={[
            { label: ru ? "Словарь" : "Glossary", path: "glossary" },
            { label: copy.term },
          ]}
        />
        <div className="shell glossary-return-slot">
          <GlossaryReturnLink locale={locale}/>
        </div>
        <section className="glossary-hero shell">
          <p className="section-kicker">{ru ? "Термин простыми словами" : "Term in plain language"}</p>
          <h1>{copy.term}</h1>
          <p>{copy.definition}</p>
          <p className="glossary-provenance">
            <span>{copy.editor}</span>
            <span>{ru ? "Обновлено:" : "Updated:"} {formatEditorialDate(locale, term.updatedAt)}</span>
          </p>
        </section>

        <section className="glossary-grid shell" aria-label={ru ? `Разбор термина ${copy.term}` : `${copy.term} explained`}>
          <article className="glossary-item">
            <span>01</span>
            <h2>{ru ? "Что это значит" : "What it means"}</h2>
            <p>{copy.plain}</p>
          </article>
          <article className="glossary-item">
            <span>02</span>
            <h2>{ru ? "Почему это важно" : "Why it matters"}</h2>
            <p>{copy.why}</p>
          </article>
          <article className="glossary-item">
            <span>03</span>
            <h2>{ru ? "Пример" : "Example"}</h2>
            <p>{copy.example}</p>
            <Link href={copy.relatedHref}>
              {copy.relatedLabel}<span aria-hidden="true">↗</span>
            </Link>
          </article>
        </section>

        {related.length > 0 ? (
          <section className="shell" aria-labelledby="related-glossary-title">
            <div className="section-heading">
              <p className="section-kicker">{ru ? "Связанные понятия" : "Related terms"}</p>
              <h2 id="related-glossary-title">{ru ? "Продолжить разбор" : "Continue exploring"}</h2>
            </div>
            <div className="glossary-grid">
              {related.map((item, index) => {
                const relatedCopy = item[locale];
                return (
                  <article className="glossary-item" key={item.slug}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <h2>
                      <Link href={glossaryDetailPath(locale, item.slug)}>{relatedCopy.term}</Link>
                    </h2>
                    <p>{relatedCopy.definition}</p>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="glossary-cta shell">
          <h2>{ru ? "Нужно проверить термин на конкретном сайте?" : "Need to check this signal on a website?"}</h2>
          <Link className="button" href={localizedPath(locale, "free-audit")}>
            {ru ? "Запустить бесплатную проверку" : "Start the free check"} ↗
          </Link>
        </section>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</gu, "\\u003c") }}
        />
      </div>
    </PublicShell>
  );
}
