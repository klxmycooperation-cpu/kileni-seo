import "../../../app/cases-pricing-redesign.css";

import Image from "next/image";
import Link from "next/link";
import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";
import type { CaseFact } from "../../content/cases";
import { getCase, getCases } from "../../content/cases";
import { CaseErrorsVisual } from "../analytics/AnalyticsVisuals";
import { Breadcrumbs } from "../layout/Breadcrumbs";
import { PublicShell } from "../layout/PublicShell";

export function CasesPage({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const cases = getCases(locale);

  return (
    <PublicShell locale={locale}>
      <div className="cases-redesign">
        <header className="cp-cases-index-hero">
          <Breadcrumbs locale={locale} items={[{ label: ru ? "Кейсы" : "Cases" }]} />
          <div className="shell cp-cases-title">
            <p className="cp-kicker">{ru ? "Реальные работы" : "Real client work"}</p>
            <h1>{ru ? "Задача, изменения и результат повторной проверки" : "The task, the changes and the verified result"}</h1>
            <p>{ru ? "Без обещаний позиций. Показываем задачу клиента, конкретные изменения и цифры повторной проверки." : "No ranking promises. Each story shows the client task, the actual changes and the follow-up numbers."}</p>
          </div>
        </header>

        <section className="cp-case-index-section" aria-label={ru ? "Список кейсов" : "Case studies"}>
          <div className="shell cp-case-stories">
            {cases.map((item, index) => (
              <article className="cp-narrative-case" key={item.slug}>
                <header className="cp-narrative-header">
                  <CaseIdentity domain={item.domain} slug={item.slug} number={String(index + 1).padStart(2, "0")} />
                  <p>{item.period}</p>
                  <h2>{caseCardHeadline(item.slug, locale)}</h2>
                  <p>{caseCardLead(item.slug, locale)}</p>
                </header>

                <div className="cp-narrative-body">
                  <section className="cp-narrative-result" aria-label={ru ? `Результаты ${item.domain}` : `${item.domain} results`}>
                    <p className="cp-narrative-label">{ru ? "Повторная проверка" : "Follow-up check"}</p>
                    <CaseComparisons locale={locale} rows={caseIndexRows(item, locale)} />
                  </section>

                  <section className="cp-narrative-summary" aria-labelledby={`case-${item.slug}-work`}>
                    <div>
                      <p className="cp-narrative-label">{ru ? "Что изменили" : "What we changed"}</p>
                      <h3 id={`case-${item.slug}-work`}>{caseActionSummary(item.slug, locale)}</h3>
                      <ul>{caseFixes(item.slug, locale).slice(0, 2).map((fix) => <li key={fix}>{fix}</li>)}</ul>
                    </div>
                    <div><p className="cp-narrative-label">{ru ? "Ограничение" : "Limitation"}</p><p>{item.remaining[0]}</p></div>
                  </section>

                  <footer className="cp-narrative-footer">
                    <Link className="cp-case-link" href={localizedPath(locale, `cases/${item.slug}`)}>
                      {ru ? "Открыть полный кейс" : "Open the full case"}<span aria-hidden="true">↗</span>
                    </Link>
                    <Link className="cp-case-tariff-link" href={localizedPath(locale, "seo-audit")}>
                      {ru ? "Сравнить варианты аудита" : "Compare audit options"}<span aria-hidden="true">↗</span>
                    </Link>
                  </footer>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="cp-errors-chart-section" aria-label={ru ? "Снижение технических ошибок" : "Technical error reduction"}>
          <div className="shell"><CaseErrorsVisual locale={locale} /></div>
        </section>
      </div>
    </PublicShell>
  );
}

export function CasePage({ locale, slug }: { locale: Locale; slug: string }) {
  const item = getCase(locale, slug);
  if (!item) return null;

  const ru = locale === "ru";

  return (
    <PublicShell locale={locale}>
      <div className="cases-redesign">
        <header className="cp-case-detail-hero">
          <Breadcrumbs locale={locale} items={[{ label: ru ? "Кейсы" : "Cases", path: "cases" }, { label: item.domain }]} />
          <div className="shell cp-case-detail-title">
            <CaseIdentity domain={item.domain} slug={item.slug} period={item.period} />
            <h1>{caseHeadline(item.slug, locale)}</h1>
            <p>{item.lead}</p>
            <CaseFacts facts={item.previewFacts} comparison />
          </div>
        </header>

        <CaseStorySection number="01" label={ru ? "Задача" : "Task"}>
          <p className="cp-story-lead">{item.task}</p>
        </CaseStorySection>

        <div className="cp-story-pair">
          <CaseStorySection number="02" label={ru ? "Что нашли" : "What we found"}>
            <CaseStoryList items={caseFindings(item, locale)} />
          </CaseStorySection>

          <CaseStorySection number="03" label={ru ? "Что сделали" : "What we changed"}>
            <CaseStoryList items={item.fixes} />
          </CaseStorySection>
        </div>

        <section className="cp-result-section" aria-labelledby="case-results-title">
          <div className="shell">
            <div className="cp-result-heading">
              <div><span>04</span><p>{ru ? "Повторная проверка" : "Follow-up check"}</p></div>
              <h2 id="case-results-title">{ru ? "Доказательство" : "Evidence"}</h2>
            </div>
            <dl className="cp-evidence-list">
              {[...item.evidence.filter((row) => !/внутрен|internal checklist/iu.test(row.metric)), projectScoreRow(item, locale)].map((row) => (
                <div className="cp-evidence-item" key={row.metric}>
                  <dt>{row.metric}</dt>
                  <dd>
                    {hasMeasuredBefore(row.before) ? (
                      <>
                        <span><small>{ru ? "До" : "Before"}</small>{row.before}</span>
                        <i aria-hidden="true">→</i>
                        <strong><small>{ru ? "После" : "After"}</small>{row.after}</strong>
                      </>
                    ) : (
                      <strong><small>{ru ? "Финальная проверка" : "Final check"}</small>{row.after}</strong>
                    )}
                    {row.note && <p className="cp-evidence-note">{row.note}</p>}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="cp-evidence-caveat">{item.caveat}</p>
          </div>
        </section>

        <CaseStorySection number="05" label={ru ? "Ограничения" : "Limitations"}>
          <ul className="cp-remaining-list">
            {item.remaining.map((note) => <li key={note}>{note}</li>)}
          </ul>
          <div className="cp-case-next-step">
            <div>
              <p>{ru ? "Следующий шаг" : "Next step"}</p>
              <h3>{ru ? "Выберите глубину проверки под свой сайт" : "Choose the right audit depth for your website"}</h3>
              <span>{ru ? "До отправки заявки видно, сколько страниц входит в проверку, сколько она займёт и сколько будет стоить." : "Before you submit a request, you can see the page scope, timing and price."}</span>
            </div>
            <Link className="button button-primary" href={localizedPath(locale, "seo-audit")}>
              {ru ? "Сравнить варианты аудита" : "Compare audit options"}<span aria-hidden="true">↗</span>
            </Link>
          </div>
        </CaseStorySection>

      </div>
    </PublicShell>
  );
}

function CaseIdentity({ domain, slug, number, period }: { domain: string; slug: string; number?: string; period?: string }) {
  return (
    <div className="cp-case-identity">
      <Image src={`/case-sites/${slug}.ico`} alt={`${domain} logo`} width={40} height={40} unoptimized />
      <div>
        <p>{number ?? domain}</p>
        {number && <strong>{domain}</strong>}
        {period && <span>{period}</span>}
      </div>
    </div>
  );
}

function CaseFacts({ facts, comparison = false }: { facts: CaseFact[]; comparison?: boolean }) {
  return (
    <dl className="cp-fact-strip">
      {facts.map((fact) => (
        <div key={`${fact.value}-${fact.label}`}>
          <dt>{fact.label}</dt>
          <dd>
            {comparison ? <ComparisonValue value={fact.value} /> : fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ComparisonValue({ value }: { value: string }) {
  const parts = value.split(/\s*→\s*/u);
  if (parts.length !== 2) return <strong>{value}</strong>;
  return <><span>{parts[0]}</span><i aria-hidden="true">→</i><strong>{parts[1]}</strong></>;
}

function CaseComparisons({ locale, rows }: { locale: Locale; rows: Array<{ metric: string; before?: string; after: string }> }) {
  const ru = locale === "ru";
  return (
    <dl className="cp-before-after">
      {rows.map((row) => (
        <div key={row.metric}>
          <dt>{plainMetric(row.metric, locale)}</dt>
          <dd>
            {hasMeasuredBefore(row.before) ? (
              <>
                <span><small>{ru ? "До" : "Before"}</small>{row.before}</span>
                <i aria-hidden="true">→</i>
                <strong><small>{ru ? "После" : "After"}</small>{row.after}</strong>
              </>
            ) : <strong><small>{ru ? "Финальная проверка" : "Final check"}</small>{row.after}</strong>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function projectScoreRow(item: NonNullable<ReturnType<typeof getCase>>, locale: Locale) {
  return {
    metric: locale === "ru" ? "Внутренняя оценка KILENI" : "Internal KILENI assessment",
    before: `${item.before}/100`,
    after: `${item.after}/100`,
    note: locale === "ru" ? "Не показатель поисковика: оценка нужна только для сравнения этапов этой работы" : "Not a search-engine metric: this assessment only compares stages of this project",
  };
}

function caseIndexRows(item: NonNullable<ReturnType<typeof getCase>>, locale: Locale) {
  const ru = locale === "ru";
  if (item.slug === "eco-santeh") {
    return [
      { metric: ru ? "Страницы открылись без ошибки" : "Pages opened without an error", after: "509/509" },
      { metric: ru ? "Внутренняя оценка KILENI — не показатель поисковика" : "Internal KILENI assessment — not a search-engine metric", before: "35", after: "93" },
    ];
  }
  return [
    { metric: ru ? "Страницы открылись без ошибки" : "Pages opened without an error", after: "575/575" },
    { metric: ru ? "Внутренняя оценка KILENI — не показатель поисковика" : "Internal KILENI assessment — not a search-engine metric", before: "37", after: "80" },
  ];
}

function CaseStorySection({ number, label, children }: { number: string; label: string; children: React.ReactNode }) {
  return (
    <section className="cp-story-section">
      <div className="shell cp-story-grid">
        <div className="cp-story-heading"><span>{number}</span><h2>{label}</h2></div>
        <div>{children}</div>
      </div>
    </section>
  );
}

function CaseStoryList({ items }: { items: string[] }) {
  return (
    <ol className="cp-action-list">
      {items.map((item) => (
        <li key={item}><p>{item}</p></li>
      ))}
    </ol>
  );
}

function caseFindings(item: NonNullable<ReturnType<typeof getCase>>, locale: Locale) {
  if (item.slug === "eco-santeh") {
    return locale === "ru"
      ? [
          "В общих шаблонах были системные пропуски основных данных страниц",
          "Автоматический тест скорости главной страницы на телефоне показывал 36 баллов",
        ]
      : [
          "Shared page templates were missing core page data",
          "The mobile laboratory test of the home page scored 36",
        ];
  }

  if (item.slug === "zasorservice") {
    return locale === "ru"
      ? [
          "Главный экран заметно сдвигался при загрузке: 0,519",
          "В исходной проверке на всех 606 страницах не было дополнительных данных для поисковых систем",
          "20 314 изображений загружались без заданных размеров",
        ]
      : [
          "The home page shifted noticeably while loading: 0.519",
          "The initial 606-page crawl found no JSON-LD data",
          "20,314 images loaded without declared dimensions",
        ];
  }

  return item.checks;
}

function caseHeadline(slug: string, locale: Locale) {
  if (slug === "eco-santeh") {
    return locale === "ru"
      ? "Убрали повторяющиеся ошибки на 509 страницах"
      : "Removed repeated issues across 509 pages";
  }

  return locale === "ru"
    ? "Стабилизировали первый экран и проверили 575 страниц"
    : "Stabilised the first screen and checked 575 pages";
}

function caseCardHeadline(slug: string, locale: Locale) {
  if (slug === "eco-santeh") {
    return locale === "ru" ? "509 страниц открылись без ошибок" : "509 pages opened without errors";
  }
  return locale === "ru" ? "575 страниц прошли повторную проверку" : "575 pages passed the follow-up check";
}

function caseCardLead(slug: string, locale: Locale) {
  if (slug === "eco-santeh") {
    return locale === "ru"
      ? "Привели в порядок общие шаблоны и проверили итоговый список из 509 страниц. Исходный и финальный обходы содержали разные наборы URL."
      : "Fixed the shared templates and checked the final set of 509 pages. The initial and final crawls contained different URL sets.";
  }
  return locale === "ru"
    ? "Убрали сдвиг первого экрана и подтвердили итоговый список URL."
    : "Removed the first-screen shift and confirmed the final URL list.";
}

function caseActionSummary(slug: string, locale: Locale) {
  if (slug === "eco-santeh") {
    return locale === "ru"
      ? "Обновили общие шаблоны страниц и убрали повторяющиеся ошибки"
      : "Updated the shared page templates and removed repeated errors";
  }

  return locale === "ru"
    ? "Исправили общие шаблоны и убрали причину сдвига первого экрана"
    : "Fixed the shared templates and removed the cause of the home-page shift";
}

function caseFixes(slug: string, locale: Locale) {
  if (slug === "eco-santeh") {
    return locale === "ru"
      ? [
          "Заполнили названия, описания и главные заголовки страниц",
          "Указали основной адрес для каждой страницы",
          "Добавили данные для корректного отображения в поиске и соцсетях",
        ]
      : [
          "Completed page titles, descriptions and main headings",
          "Set the primary address for every page",
          "Added the data needed for correct search and social previews",
        ];
  }

  return locale === "ru"
    ? [
        "Заполнили основные данные однотипных страниц",
        "Добавили сведения, которые читают поисковые системы",
        "Исправили главный слайдер и закрепили размеры изображений",
      ]
    : [
        "Completed the core data on repeated page templates",
        "Added information that search engines can read",
        "Fixed the main slider and declared image dimensions",
      ];
}

function plainMetric(metric: string, locale: Locale) {
  const ru = locale === "ru";
  if (/Open Graph|JSON-LD|основные данные/i.test(metric)) {
    return ru ? "Страницы с заполненными основными данными" : "Pages with complete core data";
  }
  if (/mobile|мобильн/i.test(metric)) {
    return ru ? "Мобильный тест скорости" : "Mobile speed test";
  }
  if (/CLS|сдвиг/i.test(metric)) {
    return ru ? "Сдвиг первого экрана" : "Home-page layout shift";
  }
  return metric;
}

function hasMeasuredBefore(value?: string) {
  return Boolean(value && value.trim() !== "—");
}
