"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";

import type { Locale } from "../../config/site";
import type { GlossaryTerm } from "../../content/glossary";
import { glossaryDetailPath } from "../../lib/seo/glossary-metadata";

type GlossaryGroup = {
  letter: string;
  id: string;
  terms: readonly GlossaryTerm[];
};

export function GlossaryExplorer({
  locale,
  terms,
}: {
  locale: Locale;
  terms: readonly GlossaryTerm[];
}) {
  const ru = locale === "ru";
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeSearchText(query, locale);
  const groups = useMemo(
    () => groupTerms(terms.filter((term) => termMatches(term, locale, normalizedQuery)), locale),
    [locale, normalizedQuery, terms],
  );
  const resultCount = groups.reduce((total, group) => total + group.terms.length, 0);

  return (
    <section className="glossary-explorer shell" aria-labelledby="glossary-explorer-title">
      <div className="glossary-search">
        <div>
          <p className="section-kicker">{ru ? "Быстрый поиск" : "Quick search"}</p>
          <h2 id="glossary-explorer-title">{ru ? "Найдите термин или описание" : "Find a term or description"}</h2>
        </div>
        <div className="glossary-search__field">
          <label htmlFor="glossary-search-input">{ru ? "Найти термин" : "Find a term"}</label>
          <div>
            <input
              id="glossary-search-input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={ru ? "Например: индексация" : "For example: indexing"}
              aria-controls="glossary-results"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")}>
                {ru ? "Очистить поиск" : "Clear search"}
              </button>
            ) : null}
          </div>
          <p role="status" aria-live="polite">
            {resultCount > 0
              ? (ru ? `Найдено: ${resultCount}` : `Found: ${resultCount}`)
              : (ru ? "Ничего не найдено" : "Nothing found")}
          </p>
        </div>
      </div>

      <nav className="glossary-alphabet" aria-label={ru ? "Быстрый переход по буквам" : "Quick jump by letter"}>
        {groups.map((group) => <a href={`#${group.id}`} key={group.id}>{group.letter}</a>)}
      </nav>

      <div className="glossary-results" id="glossary-results">
        {groups.length > 0 ? groups.map((group) => (
          <section className="glossary-letter-group" id={group.id} key={group.id} aria-labelledby={`${group.id}-title`}>
            <h2 id={`${group.id}-title`}>{group.letter}</h2>
            <div className="glossary-grid">
              {group.terms.map((term, index) => {
                const copy = term[locale];
                return (
                  <article className="glossary-item" id={term.slug} key={term.slug}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <h3><Link href={glossaryDetailPath(locale, term.slug)}><HighlightedText text={copy.term} query={query} locale={locale}/></Link></h3>
                    <p><HighlightedText text={copy.definition} query={query} locale={locale}/></p>
                    <details>
                      <summary>{ru ? "Разобрать на примере" : "Explain with an example"}</summary>
                      <p><strong>{ru ? "Простыми словами:" : "In plain language:"}</strong> <HighlightedText text={copy.plain} query={query} locale={locale}/></p>
                      <p><strong>{ru ? "Почему важно:" : "Why it matters:"}</strong> <HighlightedText text={copy.why} query={query} locale={locale}/></p>
                      <p><strong>{ru ? "Пример:" : "Example:"}</strong> <HighlightedText text={copy.example} query={query} locale={locale}/></p>
                    </details>
                    <Link href={copy.relatedHref}>{copy.relatedLabel}<span aria-hidden="true">↗</span></Link>
                  </article>
                );
              })}
            </div>
          </section>
        )) : (
          <div className="glossary-empty">
            <strong>{ru ? "Совпадений нет" : "No matches"}</strong>
            <p>{ru ? "Попробуйте другое слово или очистите поиск." : "Try another word or clear the search."}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function groupTerms(terms: readonly GlossaryTerm[], locale: Locale): GlossaryGroup[] {
  const collator = new Intl.Collator(locale === "ru" ? "ru" : "en", { sensitivity: "base" });
  const sorted = [...terms].sort((left, right) => collator.compare(left[locale].term, right[locale].term));
  const groups = new Map<string, GlossaryTerm[]>();
  for (const term of sorted) {
    const letter = firstSearchLetter(term[locale].term, locale);
    const group = groups.get(letter) ?? [];
    group.push(term);
    groups.set(letter, group);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => collator.compare(left, right))
    .map(([letter, groupedTerms]) => ({
      letter,
      id: `glossary-letter-${letter.codePointAt(0)?.toString(16) ?? "other"}`,
      terms: groupedTerms,
    }));
}

function firstSearchLetter(value: string, locale: Locale): string {
  const letter = value.match(/[\p{L}\p{N}]/u)?.[0] ?? "#";
  return letter.toLocaleUpperCase(locale === "ru" ? "ru-RU" : "en-US");
}

function termMatches(term: GlossaryTerm, locale: Locale, query: string): boolean {
  if (!query) return true;
  const copy = term[locale];
  return [copy.term, copy.definition, copy.plain, copy.why, copy.example]
    .some((value) => normalizeSearchText(value, locale).includes(query));
}

function normalizeSearchText(value: string, locale: Locale): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/ё/giu, "е")
    .toLocaleLowerCase(locale === "ru" ? "ru-RU" : "en-US")
    .trim();
}

function HighlightedText({ text, query, locale }: { text: string; query: string; locale: Locale }) {
  const trimmed = query.trim();
  if (!trimmed) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(trimmed)})`, "giu"));
  const loweredQuery = trimmed.toLocaleLowerCase(locale === "ru" ? "ru-RU" : "en-US");
  return parts.map((part, index) => (
    part.toLocaleLowerCase(locale === "ru" ? "ru-RU" : "en-US") === loweredQuery
      ? <mark key={`${part}-${index}`}>{part}</mark>
      : <Fragment key={`${part}-${index}`}>{part}</Fragment>
  ));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
