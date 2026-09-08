import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Locale } from "../../config/site";
import { localizedPath, siteConfig } from "../../config/site";
import { getArticle, getArticles } from "../../content/articles";
import { Breadcrumbs } from "../layout/Breadcrumbs";
import { PublicShell } from "../layout/PublicShell";
import { ArticlesIndex } from "./ArticlesIndex";

function formatDate(locale: Locale, value: string) {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function ArticleCard({ locale, slug }: { locale: Locale; slug: string }) {
  const article = getArticle(locale, slug);
  if (!article) return null;
  const ru = locale === "ru";
  return (
    <Link className="article-card" href={localizedPath(locale, `blog/${article.slug}`)}>
      <figure className="article-card-image">
        <Image
          src={article.hero.src}
          alt={article.hero.alt}
          width={2000}
          height={1250}
          sizes="(max-width: 820px) 100vw, 36vw"
          quality={60}
          loading="lazy"
        />
      </figure>
      <div className="article-card-copy">
        <div className="article-card-meta">
          <span>{article.searchIntent.label}</span>
          <span>{article.readingMinutes} {ru ? "мин" : "min"}</span>
        </div>
        <h2>{article.title}</h2>
        <p>{article.description}</p>
        <div className="article-card-result">
          <strong>{ru ? "После чтения" : "After reading"}</strong>
          <span>{article.readerOutcome}</span>
        </div>
        <span className="text-link">{ru ? "Открыть статью" : "Open article"}</span>
      </div>
    </Link>
  );
}

export function ArticlesPage({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  return (
    <PublicShell locale={locale}>
      <div className="editorial-page editorial-index-page">
        <div className="page-dark-top compact-top editorial-index-top">
          <Breadcrumbs locale={locale} items={[{ label: ru ? "Блог" : "Blog" }]}/>
          <section className="page-hero shell">
            <p className="eyebrow light">{ru ? "Блог KILENI" : "KILENI blog"}</p>
            <h1>{ru ? "Практичные статьи о поиске, сайте и продажах" : "Practical guides to search, websites and sales"}</h1>
            <p>{ru ? "Аудит, индексация, скорость, интернет-магазин, каналы и стоимость SEO. Внутри — порядок действий, данные двух проектов и официальные источники." : "Auditing, indexing, speed, e-commerce, channels and SEO cost. Every guide gives an action order, evidence from two projects and official sources."}</p>
          </section>
        </div>
        <section className="section section-light article-index-section">
          <ArticlesIndex articles={getArticles(locale)} locale={locale} />
        </section>
      </div>
    </PublicShell>
  );
}

export function ArticlePage({ locale, slug }: { locale: Locale; slug: string }) {
  const article = getArticle(locale, slug);
  if (!article) notFound();
  const ru = locale === "ru";
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: article.title,
        description: article.description,
        image: {
          "@type": "ImageObject",
          url: new URL(article.hero.src, siteConfig.baseUrl).toString(),
          contentUrl: new URL(article.hero.src, siteConfig.baseUrl).toString(),
          caption: article.hero.alt,
          creditText: article.hero.credit,
          license: article.hero.licenseUrl ?? article.hero.license,
          ...(article.hero.sourceUrl ? { acquireLicensePage: article.hero.sourceUrl } : {}),
        },
        datePublished: article.date,
        dateModified: article.date,
        inLanguage: locale,
        author: { "@type": "Organization", name: article.author, url: siteConfig.baseUrl },
        publisher: { "@type": "Organization", name: "KILENI", logo: { "@type": "ImageObject", url: new URL("/brand/kileni-logo-current.svg", siteConfig.baseUrl).toString(), width: 484, height: 108 } },
        mainEntityOfPage: new URL(localizedPath(locale, `blog/${article.slug}`), siteConfig.baseUrl).toString(),
      },
      {
        "@type": "FAQPage",
        mainEntity: article.faq.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })),
      },
    ],
  };
  return (
    <PublicShell locale={locale}>
      <article className="article-page editorial-page">
        <div className="page-dark-top article-top">
          <Breadcrumbs locale={locale} items={[{ label: ru ? "Блог" : "Blog", path: "blog" }, { label: article.title }]}/>
          <header className="shell article-header">
            <p className="eyebrow light">{article.searchIntent.label}</p>
            <h1>{article.title}</h1>
            <p>{article.readerOutcome}</p>
            <div className="article-meta"><span>{article.author}</span><span>{formatDate(locale, article.date)}</span><span>{article.readingMinutes} {ru ? "минут чтения" : "min read"}</span></div>
          </header>
        </div>
        <figure className="shell article-hero-image">
          <Image
            src={article.hero.src}
            alt={article.hero.alt}
            width={2000}
            height={1250}
            sizes="(max-width: 1560px) 94vw, 1440px"
            quality={60}
            loading="eager"
            fetchPriority="high"
          />
          <figcaption>
            {article.hero.sourceUrl ? <a href={article.hero.sourceUrl} target="_blank" rel="noreferrer noopener">{article.hero.credit}</a> : <span>{article.hero.credit}</span>}
            <span aria-hidden="true"> · </span>
            {article.hero.licenseUrl ? <a href={article.hero.licenseUrl} target="_blank" rel="noreferrer noopener">{article.hero.license}</a> : <span>{article.hero.license}</span>}
          </figcaption>
        </figure>
        <div className="shell article-layout">
          <aside className="article-toc">
            <p className="eyebrow">{ru ? "Содержание" : "Contents"}</p>
            <nav aria-label={ru ? "Содержание статьи" : "Article contents"}>
              {article.toc.map((item, index) => <a key={item.id} href={`#${item.id}`}><span>{String(index + 1).padStart(2, "0")}</span>{item.title}</a>)}
            </nav>
          </aside>
          <div className="article-body">
            {article.sections.map((section) => (
              <section id={section.id} key={section.id}>
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.definitions?.length ? <dl className="article-definitions">{section.definitions.map((item) => <div key={item.term}><dt>{item.term}</dt><dd>{item.definition}</dd></div>)}</dl> : null}
                {section.bullets?.length ? <ul>{section.bullets.map((item) => <li key={item}>{item}</li>)}</ul> : null}
                {section.comparison ? <div className="article-table-wrap" role="region" aria-label={`${ru ? "Сравнительная таблица" : "Comparison table"}: ${section.heading}`} tabIndex={0}><table><thead><tr>{section.comparison.columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead><tbody>{section.comparison.rows.map((row) => <tr key={row.label}><th scope="row">{row.label}</th><td>{row.left}</td><td>{row.right}</td></tr>)}</tbody></table></div> : null}
                {section.callout ? <aside className={`article-callout article-callout-${section.callout.tone ?? "note"}`}><strong>{section.callout.title}</strong><p>{section.callout.text}</p></aside> : null}
              </section>
            ))}
            <section className="article-faq" aria-labelledby="article-faq-title">
              <p className="eyebrow">{ru ? "Вопросы" : "Questions"}</p>
              <h2 id="article-faq-title">{ru ? "Коротко о главном" : "Key questions"}</h2>
              <div className="faq-list">{article.faq.map((item) => <details key={item.question}><summary>{item.question}<span aria-hidden="true">＋</span></summary><p>{item.answer}</p></details>)}</div>
            </section>
            <section className="article-sources">
              <h2>{ru ? "Официальные источники" : "Official sources"}</h2>
              <ol>{article.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer noopener">{source.title}</a></li>)}</ol>
            </section>
          </div>
        </div>
        <section className="section article-cta"><div className="shell"><p className="eyebrow light">{ru ? "Следующий шаг" : "Next step"}</p><h2>{article.cta.title}</h2><p>{article.cta.text}</p><Link className="button button-light" href={localizedPath(locale, article.cta.href)}>{article.cta.label}</Link></div></section>
        <section className="section section-soft article-related-section"><div className="shell"><div className="section-heading"><p className="eyebrow">{ru ? "По теме" : "Related"}</p><h2>{ru ? "Следующий вопрос" : "Choose the next question"}</h2></div><div className="article-related-grid">{article.related.map((related) => <ArticleCard key={related} locale={locale} slug={related}/>)}</div></div></section>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</gu, "\\u003c") }}/>
      </article>
    </PublicShell>
  );
}
