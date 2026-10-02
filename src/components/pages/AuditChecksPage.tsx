import Link from "next/link";
import { notFound } from "next/navigation";

import type { Locale } from "../../config/site";
import { localizedPath, siteConfig } from "../../config/site";
import {
  auditCheckCategoryLabels,
  auditChecks,
  getAuditCheck,
  type AuditCheckCategory,
} from "../../content/audit-checks";
import { Breadcrumbs } from "../layout/Breadcrumbs";
import { PublicShell } from "../layout/PublicShell";
import { CanvasText } from "../ui/canvas-text";
import { CompactPageToc } from "./CompactPageToc";

const categoryOrder: readonly AuditCheckCategory[] = [
  "technicalIndexing",
  "structureOnPage",
  "performanceMobile",
  "trustStructuredData",
  "contentImages",
];

export function AuditChecksIndexPage({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  return (
    <PublicShell locale={locale}>
      <div className="glossary-page checks-page page-main">
        <Breadcrumbs locale={locale} items={[{ label: ru ? "Методика аудита" : "Audit methodology" }]}/>
        <section className="glossary-hero shell">
          <p className="section-kicker">{ru ? "30 проверок бесплатного аудита" : "30 checks in the free audit"}</p>
          <h1><CanvasText text={ru ? "Что именно проверяет KILENI" : "What KILENI actually checks"} lineGap={7} animationDuration={10}/></h1>
          <p>{ru ? "Показываем, что именно проверяет система, когда результат считается успешным, как исправить проблему и чего нельзя подтвердить автоматически. Скрытых псевдопоказателей нет." : "See what the system checks, what counts as a pass, how to fix a problem and what cannot be confirmed automatically. No hidden vanity metrics."}</p>
        </section>
        <CompactPageToc
          label={ru ? "Разделы методики" : "Methodology sections"}
          items={categoryOrder.map((category) => ({
            id: `checks-${category}`,
            label: auditCheckCategoryLabels[locale][category],
          }))}
        />
        {categoryOrder.map((category) => {
          const items = auditChecks.filter((check) => check.category === category);
          return (
            <section className="shell checks-category" id={`checks-${category}`} key={category} aria-labelledby={`checks-${category}-title`}>
              <div className="section-heading">
                <p className="section-kicker">{String(categoryOrder.indexOf(category) + 1).padStart(2, "0")}</p>
                <h2 id={`checks-${category}-title`}>{auditCheckCategoryLabels[locale][category]}</h2>
              </div>
              <div className="glossary-grid checks-grid">
                {items.map((check, index) => {
                  const copy = check[locale];
                  return (
                    <article className="glossary-item audit-check-card" key={check.slug}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <h3><Link href={localizedPath(locale, `checks/${check.slug}`)}>{copy.title}</Link></h3>
                      <p>{copy.summary}</p>
                      <Link href={localizedPath(locale, `checks/${check.slug}`)}>{ru ? "Открыть критерии" : "Open criteria"}<span aria-hidden="true">↗</span></Link>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
        <section className="glossary-cta shell">
          <h2>{ru ? "Проверить эти параметры на своём сайте" : "Check these parameters on your website"}</h2>
          <Link className="button" href={localizedPath(locale, "free-audit")}>{ru ? "Запустить бесплатный аудит" : "Start the free audit"} ↗</Link>
        </section>
      </div>
    </PublicShell>
  );
}

export function AuditCheckPage({ locale, slug }: { locale: Locale; slug: string }) {
  const check = getAuditCheck(slug);
  if (!check) notFound();
  const ru = locale === "ru";
  const copy = check[locale];
  const related = auditChecks.filter((item) => item.category === check.category && item.slug !== check.slug).slice(0, 3);
  const canonical = localizedPath(locale, `checks/${check.slug}`);
  const schema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: copy.title,
    description: copy.summary,
    datePublished: check.updatedAt,
    dateModified: check.updatedAt,
    inLanguage: locale,
    author: { "@type": "Organization", name: "KILENI", url: siteConfig.baseUrl },
    publisher: { "@type": "Organization", name: "KILENI", url: siteConfig.baseUrl },
    mainEntityOfPage: new URL(canonical, siteConfig.baseUrl).toString(),
  };
  const sections = [
    { code: "01", title: ru ? "Что измеряется" : "What is measured", text: copy.measures },
    { code: "02", title: ru ? "Критерий успешной проверки" : "Pass criterion", text: copy.pass },
    { code: "03", title: ru ? "Что исправлять" : "What to fix", text: copy.action },
    { code: "04", title: ru ? "Граница автоматического вывода" : "Automation limit", text: copy.caveat },
  ];
  return (
    <PublicShell locale={locale}>
      <div className="glossary-page checks-page page-main">
        <Breadcrumbs locale={locale} items={[{ label: ru ? "Методика аудита" : "Audit methodology", path: "checks" }, { label: copy.title }]}/>
        <section className="glossary-hero shell checks-detail-hero">
          <p className="section-kicker">{auditCheckCategoryLabels[locale][check.category]}</p>
          <h1><CanvasText text={copy.title} lineGap={7} animationDuration={10}/></h1>
          <p>{copy.summary}</p>
        </section>
        <section className="glossary-grid shell checks-detail-grid" aria-label={ru ? `Критерии проверки: ${copy.title}` : `Check criteria: ${copy.title}`}>
          {sections.map((section) => (
            <article className="glossary-item" key={section.code}>
              <span>{section.code}</span>
              <h2>{section.title}</h2>
              <p>{section.text}</p>
            </article>
          ))}
        </section>
        <section className="shell checks-source" aria-labelledby="check-source-title">
          <p className="section-kicker">{ru ? "Основание проверки" : "Reference"}</p>
          <h2 id="check-source-title">{ru ? "Официальная документация" : "Official documentation"}</h2>
          <a href={check.sourceUrl} target="_blank" rel="noreferrer noopener">{copy.sourceLabel} ↗</a>
        </section>
        {related.length ? (
          <section className="shell checks-related" aria-labelledby="related-checks-title">
            <div className="section-heading">
              <p className="section-kicker">{ru ? "Связанные проверки" : "Related checks"}</p>
              <h2 id="related-checks-title">{ru ? "Продолжить разбор" : "Continue the methodology"}</h2>
            </div>
            <div className="glossary-grid">
              {related.map((item, index) => <article className="glossary-item" key={item.slug}><span>{String(index + 1).padStart(2, "0")}</span><h3><Link href={localizedPath(locale, `checks/${item.slug}`)}>{item[locale].title}</Link></h3><p>{item[locale].summary}</p></article>)}
            </div>
          </section>
        ) : null}
        <section className="glossary-cta shell">
          <h2>{ru ? "Проверить этот и остальные параметры" : "Check this and every other parameter"}</h2>
          <Link className="button" href={localizedPath(locale, "free-audit")}>{ru ? "Запустить бесплатный аудит" : "Start the free audit"} ↗</Link>
        </section>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</gu, "\\u003c") }}/>
      </div>
    </PublicShell>
  );
}
