import "../../../app/service-pricing-brief-10.css";

import Link from "next/link";
import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";
import { getDictionary } from "../../content/dictionary";
import { serviceGlossarySlugs } from "../../content/service-glossary";
import { getServiceResultExample } from "../../content/service-result-examples";
import { getService } from "../../content/services";
import { priceLabel } from "../../config/price-labels";
import { selectPricingTiers } from "../../config/pricing-tiers";
import { LeadForm } from "../forms/LeadForm";
import { SeoAuditScoreVisual, SeoPromotionMetricsVisual } from "../analytics/AnalyticsVisuals";
import { Breadcrumbs } from "../layout/Breadcrumbs";
import { PublicShell } from "../layout/PublicShell";
import { Faq } from "./Faq";
import { InlineGlossaryTerms } from "./InlineGlossaryTerms";
import { ServiceVisual } from "./ServiceVisual";
import { ServiceTierProvider, ServiceTierSelector } from "./ServiceTierSelection";

export function ServicePage({ locale, slug }: { locale: Locale; slug: string }) {
  const service = getService(locale, slug);
  if (!service) return null;
  const d = getDictionary(locale);
  const ru = locale === "ru";
  const packages = selectPricingTiers(service.packages);
  const resultExample = getServiceResultExample(locale, slug);
  const tierLabels = ru ? ["Базовый", "Расширенный", "Под ключ"] : ["Basic", "Advanced", "Turnkey"];
  const tierViews = packages.map((item, index) => {
    const price = priceLabel(item.priceKey, locale);
    return {
      id: item.name,
      tierLabel: tierLabels[index] ?? tierLabels[tierLabels.length - 1],
      name: item.name,
      description: item.description,
      limit: item.limit,
      duration: item.duration ?? (ru ? "Срок после подтверждения" : "Timing confirmed upfront"),
      current: price.current,
      note: price.note,
      features: item.features,
      featured: Boolean(item.featured),
    };
  });

  return (
    <PublicShell locale={locale}>
      <ServiceTierProvider>
      <article className={`service-10 service-10-${service.visual.kind}`}>
        <header className="svc-detail-hero">
          <Breadcrumbs locale={locale} items={[{ label: ru ? "Услуги" : "Services", path: "services" }, { label: service.eyebrow }]} />
          <div className="shell svc-detail-hero-grid">
            <div className="svc-detail-copy">
              <p className="svc-kicker">{service.eyebrow}</p>
              <h1>{service.title}</h1>
              <p>{service.lead}</p>
              <div className="svc-hero-actions">
                <Link className="button button-primary" href="#request">{d.common.order}<span aria-hidden="true">↘</span></Link>
                <Link href="#variants">{ru ? "Посмотреть варианты" : "See the options"}<span aria-hidden="true">↓</span></Link>
              </div>
            </div>
            <ServiceVisual visual={service.visual} />
          </div>
        </header>

        <section className="svc-decision-section svc-problem" aria-labelledby="svc-problem-title">
          <div className="shell svc-two-columns">
            <div><p className="svc-kicker">{ru ? "01 · Проблема" : "01 · Problem"}</p><h2 id="svc-problem-title">{ru ? "Когда услуга нужна" : "When this service helps"}</h2></div>
            <div><p className="svc-lead">{service.problem}</p><ul className="svc-symptom-list">{service.fit.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </div>
        </section>

        <section className="svc-decision-section svc-diagnosis" aria-labelledby="svc-diagnosis-title">
          <div className="shell"><div className="svc-section-heading"><p className="svc-kicker">{ru ? "02 · Диагностика" : "02 · Diagnosis"}</p><h2 id="svc-diagnosis-title">{ru ? "Как находим причину" : "How we find the cause"}</h2></div>
            <ol className="svc-step-grid">{service.diagnosis.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span><p>{item}</p></li>)}</ol></div>
        </section>

        <InlineGlossaryTerms locale={locale} slugs={serviceGlossarySlugs[slug] ?? []} />

        {slug === "seo-audit" && <SeoAuditScoreVisual locale={locale} />}
        {slug === "seo-promotion" && <SeoPromotionMetricsVisual locale={locale} />}

        <section className="svc-decision-section svc-results" aria-labelledby="svc-result-title">
          <div className="shell svc-two-columns"><div><p className="svc-kicker">{ru ? "03 · Результат" : "03 · Result"}</p><h2 id="svc-result-title">{ru ? "Что изменится и что останется у вас" : "What changes and what you keep"}</h2></div>
            <div className="svc-result-columns"><ul>{service.outcomes.map((item) => <li key={item}>{item}</li>)}</ul><ul>{service.deliverables.map((item) => <li key={item}>{item}</li>)}</ul></div></div>
        </section>

        <section className="svc-decision-section svc-process" aria-labelledby="svc-process-title">
          <div className="shell"><div className="svc-section-heading"><p className="svc-kicker">{ru ? "04 · Процесс" : "04 · Process"}</p><h2 id="svc-process-title">{ru ? "Что именно делаем" : "What we actually do"}</h2></div>
            <ol className="svc-work-list">{service.work.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span><p>{item}</p></li>)}</ol></div>
        </section>

        <section className="svc-decision-section svc-variants" id="variants" aria-labelledby="svc-variants-title">
          <div className="shell"><div className="svc-section-heading"><p className="svc-kicker">{ru ? "05 · Варианты" : "05 · Options"}</p><h2 id="svc-variants-title">{ru ? "Состав, предел и цена рядом" : "Scope, limit and price together"}</h2></div>
            <ServiceTierSelector locale={locale} tiers={tierViews} /></div>
        </section>

        <section className="svc-decision-section svc-boundaries" aria-labelledby="svc-boundaries-title">
          <div className="shell svc-two-columns"><div><p className="svc-kicker">{ru ? "06 · Сроки и ограничения" : "06 · Timing and limits"}</p><h2 id="svc-boundaries-title">{ru ? "Что учитываем до старта" : "What we clarify upfront"}</h2><p className="svc-timing">{service.duration}</p></div>
            <ul>{service.exclusions.map((item) => <li key={item}>{item}</li>)}</ul></div>
        </section>

        <section className="svc-decision-section svc-proof" aria-labelledby="svc-proof-title">
          <div className="shell svc-two-columns"><div><p className="svc-kicker">{ru ? "07 · Проверка результата" : "07 · Proof"}</p><h2 id="svc-proof-title">{ru ? "Работу можно принять по фактам" : "Delivery can be accepted against evidence"}</h2></div>
            <div><ol><li><span>01</span><p>{ru ? "До начала фиксируем исходное состояние и состав работ." : "We record the baseline and scope before work begins."}</p></li><li><span>02</span><p>{ru ? "Передаём сделанные изменения и материалы, которые входят в вариант." : "We hand over the completed changes and included materials."}</p></li><li><span>03</span><p>{ru ? "Повторяем применимые проверки и отдельно отмечаем ограничения." : "We repeat applicable checks and state the remaining limits."}</p></li></ol>
              {service.caseLink && <Link className="svc-case-link" href={localizedPath(locale, service.caseLink)}>{ru ? "Открыть кейс с доказательствами" : "Open an evidence-based case"}<span aria-hidden="true">↗</span></Link>}<p className="svc-guarantee-note">{d.common.noGuarantee}</p></div></div>
        </section>

        {resultExample && (
          <section className="svc-decision-section svc-result-example" aria-labelledby="svc-result-example-title">
            <div className="shell">
              <header className="svc-result-example__heading">
                <div>
                  <p className="svc-kicker">{resultExample.eyebrow}</p>
                  <h2 id="svc-result-example-title">{resultExample.title}</h2>
                </div>
                <p>{resultExample.lead}</p>
              </header>

              <article className="svc-result-fragment" aria-labelledby="svc-result-fragment-title">
                <header>
                  <h3 id="svc-result-fragment-title">{resultExample.fragment.title}</h3>
                  <p>{resultExample.fragment.caption}</p>
                </header>
                <dl>
                  {resultExample.fragment.rows.map((row) => (
                    <div key={row.key}>
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </article>

              <section className="svc-before-after" aria-labelledby="svc-before-after-title">
                <h3 id="svc-before-after-title">{resultExample.beforeAfter.title}</h3>
                <div>
                  {[resultExample.beforeAfter.before, resultExample.beforeAfter.after].map((state, index) => (
                    <article key={state.label} data-after={index === 1 ? "" : undefined}>
                      <span>{state.label}</span>
                      <h4>{state.title}</h4>
                      <ul>{state.items.map((item) => <li key={item}>{item}</li>)}</ul>
                    </article>
                  ))}
                </div>
              </section>

              <div className="svc-result-reasons">
                {[
                  { title: resultExample.whyThisOptionTitle, items: resultExample.whyThisOption },
                  { title: resultExample.whyKileniTitle, items: resultExample.whyKileni },
                ].map((group) => (
                  <section key={group.title}>
                    <h3>{group.title}</h3>
                    <ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul>
                  </section>
                ))}
              </div>
              <p className="svc-result-disclaimer">{resultExample.disclaimer}</p>
            </div>
          </section>
        )}

        <section className="svc-decision-section svc-buyer-questions" aria-labelledby="svc-buyer-questions-title">
          <div className="shell svc-two-columns">
            <div>
              <p className="svc-kicker">{ru ? "08 · До заказа" : "08 · Before ordering"}</p>
              <h2 id="svc-buyer-questions-title">{ru ? "11 ответов для принятия решения" : "11 answers for a buying decision"}</h2>
              <p className="svc-timing">{ru ? "Состав, доступы, сроки, приёмка и границы услуги — без скрытых допущений." : "Scope, access, timing, acceptance and service boundaries — without hidden assumptions."}</p>
            </div>
            <div className="svc-buyer-question-list">
              {service.buyerQuestions.map((item, index) => (
                <details key={item.question}>
                  <summary><span>{String(index + 1).padStart(2, "0")}</span>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="svc-context-links" aria-label={ru ? "Связанные разделы" : "Related pages"}>
          <div className="shell">
            <Link href={localizedPath(locale, "pricing")}>{ru ? "Сравнить три уровня и пределы" : "Compare three tiers and limits"}<span aria-hidden="true">↗</span></Link>
            <Link href={localizedPath(locale, "glossary")}>{ru ? "Открыть словарь терминов" : "Open the terminology glossary"}<span aria-hidden="true">↗</span></Link>
            <Link href={`${localizedPath(locale, "brief")}?service=${encodeURIComponent(slug)}`}>{ru ? "Передать задачу в коротком брифе" : "Share the task in a short brief"}<span aria-hidden="true">↗</span></Link>
          </div>
        </section>

        <Faq title={ru ? "Вопросы об услуге" : "Questions about the service"} items={service.faq} />
        <section id="request" className="svc-request-section"><div className="shell svc-request-grid"><div><p className="svc-kicker">{ru ? "Следующий шаг" : "Next step"}</p><h2>{ru ? "Опишите задачу — предложим подходящий объём" : "Describe the task — get a sensible scope"}</h2><p>{ru ? "До начала назовём состав, срок, цену и то, что не входит в работу." : "Before work starts, we state scope, timing, price and exclusions."}</p></div><LeadForm locale={locale} service={slug} /></div></section>
      </article>
      </ServiceTierProvider>
    </PublicShell>
  );
}
