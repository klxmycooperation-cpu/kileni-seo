import Link from "next/link";

import type { Locale } from "../../config/site";
import { glossaryTerms } from "../../content/glossary";
import { glossaryDetailPath } from "../../lib/seo/glossary-metadata";

export function InlineGlossaryTerms({ locale, slugs }: { locale: Locale; slugs: readonly string[] }) {
  const terms = slugs
    .slice(0, 4)
    .map((slug) => glossaryTerms.find((term) => term.slug === slug))
    .filter((term): term is (typeof glossaryTerms)[number] => Boolean(term));
  const ru = locale === "ru";

  if (terms.length === 0) return null;

  return (
    <section className="svc-inline-glossary" aria-label={ru ? "Термины этого раздела" : "Terms in this section"}>
      <div className="shell svc-inline-glossary-grid">
        <div>
          <p className="svc-kicker">{ru ? "Простыми словами" : "In plain language"}</p>
          <p className="svc-inline-glossary-intro">
            {ru ? "Три термина, которые встретятся в этой услуге." : "Three terms used in this service."}
          </p>
        </div>
        <div className="svc-inline-glossary-list">
          {terms.map((term) => {
            const copy = term[locale];
            const glossaryHref = glossaryDetailPath(locale, term.slug);
            return (
              <details key={term.slug}>
                <summary>
                  <span>{copy.term}</span>
                  <span aria-hidden="true">+</span>
                </summary>
                <div>
                  <p>{copy.plain}</p>
                  <p>{copy.why}</p>
                  <Link href={glossaryHref}>{ru ? "Открыть в словаре" : "Open in glossary"}<span aria-hidden="true">↗</span></Link>
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </section>
  );
}
