import Link from "next/link";

import type { Locale } from "../../config/site";
import { PUBLIC_AUDIT_PAGE_LIMIT } from "../../config/public-audit";
import { auditIssueCopy, auditPageFindings, auditTermDefinitions } from "../../lib/audit/report-content";

export type PublicAuditCategoryView = {
  readonly name: string;
  readonly risk: string;
  readonly explanation: string;
};

export type PublicAuditIssueView = {
  readonly code?: string;
  readonly category?: string;
  readonly severity?: string;
  readonly title?: string;
  readonly description?: string;
  readonly why?: string;
  readonly whyItMatters?: string;
  readonly fix?: string;
  readonly recommendation?: string;
  readonly acceptance?: string;
  readonly affectedCount?: number;
  readonly affectedUrls?: readonly string[];
  readonly evidence?: readonly ({ readonly url?: string; readonly label?: string; readonly value?: string; readonly observation?: string } | string)[];
};

export type PublicAuditPageView = {
  readonly url?: string;
  readonly finalUrl?: string;
  readonly http?: {
    readonly status?: number;
    readonly ok?: boolean;
    readonly redirectCount?: number;
  };
  readonly status?: number;
  readonly title?: string | null | { readonly value?: string | null; readonly present?: boolean; readonly length?: number; readonly optimal?: boolean };
  readonly description?: string | null | { readonly value?: string | null; readonly present?: boolean; readonly length?: number; readonly optimal?: boolean };
  readonly h1?: string | null | { readonly count?: number; readonly values?: readonly string[] };
  readonly h1Count?: number;
  readonly noindex?: boolean;
  readonly robotsAllowed?: boolean | null;
  readonly canonical?: string | null | { readonly url?: string | null; readonly valid?: boolean; readonly selfReferential?: boolean | null };
  readonly canonicalValid?: boolean | null;
  readonly sitemap?: { readonly status?: string; readonly included?: boolean | null; readonly reason?: string };
  readonly inSitemap?: boolean | null;
  readonly internalLinks?: { readonly outgoing?: number; readonly incomingFromCheckedPages?: number };
  readonly hasInternalLink?: boolean | null;
  readonly indexability?: string;
  readonly indexabilityReason?: string;
};

export type PublicAuditIndexabilityView = {
  readonly status?: "checked" | "not_checked";
  readonly checkedPages?: number;
  readonly indexablePages?: number;
  readonly noindexPages?: number;
  readonly httpErrorPages?: number;
  readonly ratio?: number | null;
  readonly reason?: string;
  readonly checked?: number;
  readonly technicallyIndexable?: number;
  readonly blocked?: number;
  readonly stages?: readonly {
    readonly id?: string;
    readonly label?: string;
    readonly count?: number;
    readonly explanation?: string;
    readonly urls?: readonly string[];
  }[];
  readonly limitation?: string;
};

export type PublicAuditResultView = {
  readonly resultVersion?: number;
  readonly score?: number | null;
  readonly grade?: string | null;
  readonly interpretation?: string;
  readonly finalUrl?: string;
  readonly pagesChecked?: number;
  readonly pagesDiscovered?: number;
  readonly partial?: boolean;
  readonly coverage?: number | {
    readonly pageLimit?: number;
    readonly plannedPages?: number;
    readonly checkedPages?: number;
    readonly ratio?: number;
  };
  readonly issueCounts?: Partial<Record<"critical" | "high" | "medium" | "low" | "info", number>>;
  readonly summary?: {
    readonly headline?: string;
    readonly facts?: readonly string[];
    readonly risks?: readonly string[];
    readonly strengths?: readonly string[];
  };
  readonly categories?: readonly PublicAuditCategoryView[];
  readonly indexability?: PublicAuditIndexabilityView;
  readonly issues?: readonly PublicAuditIssueView[];
  readonly issueGroups?: readonly PublicAuditIssueView[];
  readonly checkedPages?: readonly PublicAuditPageView[];
  readonly uncheckedUrls?: readonly string[];
  readonly discoveredNotChecked?: readonly (string | { readonly url?: string; readonly source?: string })[];
  readonly discoveredNotCheckedCount?: number;
  readonly methodology?: {
    readonly version?: string;
    readonly limitations?: readonly string[];
  };
};

/**
 * Stable catalogue IDs used by the paid next-step actions in a free audit.
 * Keeping them explicit prevents old presentation aliases from leaking into
 * the public brief URL.
 */
export type PublicAuditCtaOfferId =
  | "seo-audit-200"
  | "seo-audit-implementation"
  | "seo-promotion-start";

type AuditResultReportProps = {
  readonly locale: Locale;
  readonly result: PublicAuditResultView | null | undefined;
  readonly domain?: string;
  readonly pagesChecked: number;
  readonly pagesDiscovered: number;
  readonly reportHref: string;
  readonly copied: boolean;
  readonly onCopy: () => void;
  readonly offerHref: (offer: PublicAuditCtaOfferId) => string;
};

export function AuditResultReport({
  locale,
  result,
  domain,
  pagesChecked,
  pagesDiscovered,
  reportHref,
  copied,
  onCopy,
  offerHref,
}: AuditResultReportProps) {
  const ru = locale === "ru";
  const issues = result?.issueGroups ?? result?.issues ?? [];
  const checkedPages = result?.checkedPages ?? [];
  const notChecked = result?.uncheckedUrls ?? result?.discoveredNotChecked ?? [];
  const notCheckedCount = result?.discoveredNotCheckedCount ?? Math.max(0, pagesDiscovered - pagesChecked);
  const isLegacyReport = result ? (result.resultVersion === undefined || result.resultVersion < 2) : false;
  const risks = result?.summary?.risks ?? issues
    .filter((issue) => issue.severity !== "low")
    .slice(0, 4)
    .map((issue) => auditIssueCopy(locale, issue).title)
    .filter(Boolean);
  const strengths = result?.summary?.strengths ?? positiveFindings(result, locale);
  const summaryFacts = plainSummaryFacts(result, locale, pagesChecked, pagesDiscovered);

  return (
    <div className="result-body">
      <div className="result-heading">
        <div>
          <p className="eyebrow">{ru ? "Результат по проверенным страницам" : "Results for checked pages"}</p>
          <h2>{ru ? `Что найдено на ${domain ?? "сайте"}` : `What was found on ${domain ?? "the website"}`}</h2>
        </div>
        <div className="result-actions">
          <a className="button button-secondary" href={reportHref} download>{ru ? "Скачать PDF-отчёт" : "Download PDF report"}</a>
          <button className="button button-secondary" type="button" onClick={onCopy}>{copied ? (ru ? "Ссылка скопирована" : "Link copied") : (ru ? "Скопировать ссылку" : "Copy link")}</button>
        </div>
      </div>

      {isLegacyReport ? (
        <aside className="audit-legacy-notice" role="status">
          <strong>{ru ? "Этот отчёт создан прежней версией проверки." : "This report was created by a previous version of the checker."}</strong>
          <p>{ru ? "В нём нет сохранённых фактов по отдельным URL, поэтому мы не дополняем его догадками. Запустите проверку ещё раз — новый отчёт покажет проверенные страницы, наблюдения и конкретные действия." : "It does not contain saved evidence for individual URLs, so we do not fill it with guesses. Run the check again to see checked pages, observations, and specific actions."}</p>
        </aside>
      ) : null}

      <section className="audit-evidence-summary" aria-labelledby="audit-coverage-heading">
        <div>
          <p className="eyebrow" id="audit-coverage-heading">{ru ? "Что вошло в проверку" : "What was checked"}</p>
          <div className="audit-coverage-cards">
            <article><strong>{pagesDiscovered}</strong><span>{ru ? "адресов страниц найдено" : "page addresses found"}</span></article>
            <article><strong>{pagesChecked}</strong><span>{ru ? "страниц подробно проверено" : "pages checked in detail"}</span></article>
            <article><strong>{notCheckedCount}</strong><span>{ru ? "адресов не вошло в проверку" : "addresses outside the sample"}</span></article>
          </div>
          <p className="audit-plain-note">
            {ru
              ? `Бесплатная проверка загружает и разбирает до ${PUBLIC_AUDIT_PAGE_LIMIT} страниц. Остальные найденные адреса показаны отдельно: по ним мы не делаем выводов, пока они не проверены.`
              : `The free check loads and analyses up to ${PUBLIC_AUDIT_PAGE_LIMIT} pages. Other discovered addresses are listed separately; no conclusions are made about pages that were not checked.`}
          </p>
          {summaryFacts.length ? (
            <ul className="audit-summary-facts">
              {summaryFacts.map((fact) => <li key={fact}>{fact}</li>)}
            </ul>
          ) : null}
        </div>
        <div className="audit-findings-columns">
          <FindingList title={ru ? "Сначала исправить" : "Fix first"} items={risks} empty={ru ? "Блокирующих проблем в выборке не найдено." : "No blocking issues were found in the sample."} tone="risk" />
          <FindingList title={ru ? "Уже работает" : "Already working"} items={strengths} empty={ru ? "В сохранённых данных нет фактов, по которым можно отдельно подтвердить сильные стороны." : "The saved result has no facts that confirm a separate strength."} tone="good" />
        </div>
      </section>

      <IndexabilitySection locale={locale} indexability={result?.indexability} pages={checkedPages} />

      {issues.length > 0 ? (
        <section className="audit-report-section" id="audit-issues" aria-labelledby="audit-issues-heading">
          <header><p className="eyebrow">{ru ? "Замечания" : "Findings"}</p><h2 id="audit-issues-heading">{ru ? "Что именно исправлять" : "What exactly to fix"}</h2><p>{ru ? "Для каждого замечания показано, где оно найдено, почему влияет на сайт, что изменить и как проверить результат." : "Each finding shows where it was found, why it matters, what to change, and how to verify the result."}</p></header>
          <div className="audit-issue-list">{issues.map((issue, index) => <IssueCard key={`${issue.code ?? "issue"}-${index}`} locale={locale} issue={issue} checked={pagesChecked} />)}</div>
        </section>
      ) : isLegacyReport ? (
        <LegacyCategories locale={locale} categories={result?.categories ?? []} />
      ) : (
        <section className="audit-report-section audit-no-issues" aria-labelledby="audit-no-issues-heading">
          <header>
            <p className="eyebrow">{ru ? "Замечания" : "Findings"}</p>
            <h2 id="audit-no-issues-heading">{ru ? "В проверенной выборке замечаний не найдено" : "No findings in the checked sample"}</h2>
            <p>{ru ? `Этот вывод относится только к ${pagesChecked} подробно проверенным страницам. Ниже показаны сохранённые факты по каждой из них.` : `This conclusion applies only to the ${pagesChecked} pages checked in detail. The saved facts for each page are shown below.`}</p>
          </header>
        </section>
      )}

      {checkedPages.length > 0 && <CheckedPagesSection locale={locale} pages={checkedPages} />}

      <DiscoveredPagesSection locale={locale} entries={notChecked} total={notCheckedCount} />

      <section className="audit-report-section audit-method" aria-labelledby="audit-method-heading">
        <header><p className="eyebrow">{ru ? "Границы проверки" : "Check boundaries"}</p><h2 id="audit-method-heading">{ru ? "Что можно подтвердить без доступа к кабинетам поисковых систем" : "What can be confirmed without search-engine accounts"}</h2></header>
        <div className="audit-method-grid">
          <article><h3>{ru ? "Страница доступна для проверки" : "Page available for checking"}</h3><p>{ru ? "Сервер открыл страницу без ошибки, и на ней не найден явный запрет для поискового робота." : "The server opened the page without an error and no explicit crawler block was found."}</p></article>
          <article><h3>{ru ? "Страница уже есть в поиске" : "Page already appears in search"}</h3><p>{ru ? "Это можно подтвердить только в Яндекс Вебмастере или Google Search Console. Бесплатная проверка не подключается к этим кабинетам." : "Only Yandex Webmaster or Google Search Console can confirm this. The free check is not connected to those accounts."}</p></article>
          <article><h3>{ru ? "Балл" : "Score"}</h3><p>{ru ? "Балл сравнивает найденные технические признаки только на проверенных страницах. Он не обещает позиции, посещаемость или продажи." : "The score compares detected technical signals only on the checked pages. It does not promise rankings, traffic, or sales."}</p></article>
        </div>
        {result?.methodology?.limitations?.length ? <ul className="audit-limitations">{result.methodology.limitations.map((item) => <li key={item}>{item}</li>)}</ul> : null}
        <TermDefinitions locale={locale} />
      </section>

      <div className="result-cta">
        <p className="eyebrow">{ru ? "Следующий шаг" : "Next step"}</p>
        <h2>{ru ? "Исправить найденное и проверить повторно" : "Fix the findings and verify again"}</h2>
        <p>{ru ? "В полном аудите заранее согласуем число страниц, проверим их, составим список исправлений по важности и повторим проверку после изменений." : "In a full audit, we agree the page count, check those pages, order the fixes by importance, and repeat the check after changes."}</p>
        <div>
          <Link className="button button-primary" href={offerHref("seo-audit-200")}>{ru ? "Получить полный аудит" : "Get a full audit"}<span aria-hidden="true">↗</span></Link>
          <Link className="button button-secondary" href={offerHref("seo-audit-implementation")}>{ru ? "Обсудить исправления" : "Discuss fixes"}</Link>
          <Link className="button button-secondary" href={offerHref("seo-promotion-start")}>{ru ? "Обсудить продвижение" : "Discuss promotion"}</Link>
        </div>
      </div>
    </div>
  );
}

function FindingList({ title, items, empty, tone }: { title: string; items: readonly string[]; empty: string; tone: "risk" | "good" }) {
  return <article className={`audit-finding-list audit-finding-list--${tone}`}><h3>{title}</h3>{items.length ? <ul>{items.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul> : <p>{empty}</p>}</article>;
}

function IndexabilitySection({ locale, indexability, pages }: { locale: Locale; indexability?: PublicAuditIndexabilityView; pages: readonly PublicAuditPageView[] }) {
  const ru = locale === "ru";
  const stages = indexability?.stages ?? fallbackIndexabilityStages(locale, pages);
  if (!stages.length && indexability?.status !== "not_checked") return null;
  const checked = indexability?.checkedPages ?? indexability?.checked ?? pages.length;
  const indexable = indexability?.indexablePages ?? indexability?.technicallyIndexable ?? pages.filter(isTechnicallyIndexable).length;
  const limitation = indexability?.reason ?? indexability?.limitation ?? (ru
    ? "Мы проверяем публичные технические сигналы. Фактическое присутствие страницы в поиске подтверждается только в Яндекс Вебмастере или Google Search Console."
    : "We check public technical signals. Actual search-engine inclusion can only be confirmed in Yandex Webmaster or Google Search Console.");

  return (
    <section className="audit-report-section audit-indexability" id="audit-indexability" aria-labelledby="audit-indexability-heading">
      <header>
        <p className="eyebrow">{ru ? "Доступность для поиска" : "Search accessibility"}</p>
        <h2 id="audit-indexability-heading">
          {indexability?.status === "not_checked"
            ? (ru ? "Техническую доступность определить не удалось" : "Technical accessibility could not be determined")
            : ru ? `${indexable} из ${checked} проверенных страниц технически доступны` : `${indexable} of ${checked} checked pages are technically accessible`}
        </h2>
        <p>{limitation}</p>
      </header>
      {stages.length ? (
        <ol className="audit-index-steps">
          {stages.map((stage, index) => (
            <li key={stage.id ?? `${stage.label}-${index}`}>
              <span className="mono">{String(index + 1).padStart(2, "0")}</span>
              <div><h3>{stage.label}</h3>{stage.explanation && <p>{stage.explanation}</p>}</div>
              <strong>{stage.count ?? 0}<small> / {checked}</small></strong>
              {stage.urls?.length ? <details><summary>{ru ? "Показать URL" : "Show URLs"}</summary><UrlList urls={stage.urls} /></details> : null}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function IssueCard({ locale, issue, checked }: { locale: Locale; issue: PublicAuditIssueView; checked: number }) {
  const ru = locale === "ru";
  const affectedUrls = issue.affectedUrls ?? [];
  const affectedCount = issue.affectedCount ?? affectedUrls.length;
  const copy = auditIssueCopy(locale, issue);
  return (
    <article className="audit-issue-card">
      <header>
        <span className={`audit-severity audit-severity--${severityClass(issue.severity)}`}>{severityLabel(issue.severity, locale)}</span>
        <span>{affectedCount > 0 ? `${ru ? "Затронуто" : "Affected"}: ${affectedCount} / ${checked}` : (ru ? "Проверка сайта целиком" : "Site-wide check")}</span>
      </header>
      <h3>{copy.title}</h3>
      <Fact label={ru ? "Что нашли" : "What was found"} value={copy.observation} />
      <Fact label={ru ? "Почему это важно" : "Why it matters"} value={copy.why} />
      <Fact label={ru ? "Что сделать" : "What to do"} value={copy.action} />
      <Fact label={ru ? "Как проверить исправление" : "How to verify the fix"} value={copy.acceptance} />
      {issue.evidence?.length ? (
        <div className="audit-evidence-lines">
          <strong>{ru ? "Наблюдаемые факты" : "Observed evidence"}</strong>
          <ul>{issue.evidence.slice(0, 8).map((item, index) => <li key={typeof item === "string" ? item : `${item.url}-${index}`}>{evidenceText(item)}</li>)}</ul>
        </div>
      ) : null}
      {affectedUrls.length ? <details><summary>{ru ? `Показать затронутые URL (${affectedUrls.length})` : `Show affected URLs (${affectedUrls.length})`}</summary><UrlList urls={affectedUrls} /></details> : null}
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) { return <div className="audit-fact"><strong>{label}</strong><p>{value}</p></div>; }

function CheckedPagesSection({ locale, pages }: { locale: Locale; pages: readonly PublicAuditPageView[] }) {
  const ru = locale === "ru";
  return (
    <section className="audit-report-section" id="audit-pages" aria-labelledby="audit-pages-heading">
      <header><p className="eyebrow">{ru ? "Факты по страницам" : "Page-level facts"}</p><h2 id="audit-pages-heading">{ru ? `Подробно проверено: ${pages.length}` : `Checked in detail: ${pages.length}`}</h2><p>{ru ? "Для каждой страницы перечислены только признаки, которые удалось получить во время этой проверки." : "Each page lists only the signals captured during this check."}</p></header>
      <div className="audit-page-cards">
        {pages.map((page, index) => {
          const findings = auditPageFindings(locale, page);
          return (
            <article className="audit-page-card" key={page.url ?? index}>
              <header>
                <span className="mono">{String(index + 1).padStart(2, "0")}</span>
                <a href={safePublicUrl(page.url)} target="_blank" rel="noreferrer">{page.url ?? "—"}</a>
              </header>
              {page.finalUrl && page.finalUrl !== page.url ? <p className="audit-page-final"><strong>{ru ? "После перенаправления:" : "After redirects:"}</strong> {page.finalUrl}</p> : null}
              <dl className="audit-page-signals">
                <div><dt>{ru ? "Код ответа страницы" : "Page response code"}</dt><dd>{pageHttpStatus(page) ?? "—"}</dd></div>
                <div><dt>{ru ? "Доступность для поиска" : "Search accessibility"}</dt><dd>{indexabilityLabel(page, locale)}</dd></div>
                <div><dt>{ru ? "Заголовок для выдачи (title)" : "Search-result title"}</dt><dd>{signalText(page.title)}</dd></div>
                <div><dt>{ru ? "Главный заголовок (H1)" : "Main heading (H1)"}</dt><dd>{h1Text(page)}</dd></div>
                <div><dt>{ru ? "Основной адрес (canonical)" : "Preferred address (canonical)"}</dt><dd>{canonicalText(page, locale)}</dd></div>
                <div><dt>{ru ? "В файле страниц (sitemap.xml)" : "In the page-list file (sitemap.xml)"}</dt><dd>{sitemapText(page, locale)}</dd></div>
              </dl>
              <div className={`audit-page-findings${findings.length ? "" : " audit-page-findings--clear"}`}>
                <strong>{findings.length ? (ru ? "Замечания по этой странице" : "Findings for this page") : (ru ? "Что проверено" : "What was checked")}</strong>
                {findings.length ? <ul>{findings.map((finding) => <li key={finding}>{finding}</li>)}</ul> : <p>{ru ? "Страница открылась без ошибки; основные заголовки и адрес страницы заданы. В проверенных признаках замечаний нет." : "The page opened without an error; key headings and the preferred address are present. No findings were detected in the checked signals."}</p>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function DiscoveredPagesSection({ locale, entries, total }: { locale: Locale; entries: readonly (string | { readonly url?: string; readonly source?: string })[]; total: number }) {
  const ru = locale === "ru";
  if (total <= 0) return null;
  const urls = entries.flatMap((entry) => typeof entry === "string" ? [entry] : entry.url ? [entry.url] : []);
  return <section className="audit-report-section audit-discovered" id="audit-discovered" aria-labelledby="audit-discovered-heading"><header><p className="eyebrow">{ru ? "Обнаружены, но не проверены" : "Discovered, not checked"}</p><h2 id="audit-discovered-heading">{ru ? `${total} адресов осталось за пределами бесплатной проверки` : `${total} addresses were outside the free check`}</h2><p>{ru ? "Мы показываем эти адреса для прозрачности. Отсутствие проверки не означает ошибку и не говорит о том, есть ли страница в поиске." : "These addresses are shown for transparency. Not being checked does not mean an error and does not show whether a page appears in search."}</p></header>{urls.length ? <details><summary>{ru ? `Открыть список (${Math.min(urls.length, total)} показано)` : `Open list (${Math.min(urls.length, total)} shown)`}</summary><UrlList urls={urls} /></details> : <p className="audit-plain-note">{ru ? "В сохранённом результате есть только число обнаруженных адресов. Запустите новую проверку, чтобы получить сам список." : "This saved result contains only the discovered count. Run a new check to get the list itself."}</p>}</section>;
}

function LegacyCategories({ locale, categories }: { locale: Locale; categories: readonly PublicAuditCategoryView[] }) {
  const ru = locale === "ru";
  if (!categories.length) return null;
  return <section className="audit-report-section"><header><p className="eyebrow">{ru ? "Сводка старой версии" : "Legacy summary"}</p><h2>{ru ? "Основные направления" : "Main areas"}</h2><p>{ru ? "Этот результат создан предыдущей версией проверки и не содержит URL-доказательств. Для подробного отчёта запустите проверку снова." : "This result was created by an earlier audit version and does not contain URL evidence. Run it again for a detailed report."}</p></header><div className="risk-directions">{categories.map((category, index) => <article key={category.name}><span className={`risk risk-${severityClass(category.risk)}`}>{severityLabel(category.risk, locale)}</span><small className="mono">{String(index + 1).padStart(2, "0")}</small><h3>{category.name}</h3><p>{category.explanation}</p></article>)}</div></section>;
}

function UrlList({ urls }: { urls: readonly string[] }) { return <ul className="audit-url-list">{urls.map((url, index) => <li key={`${url}-${index}`}><a href={safePublicUrl(url)} target="_blank" rel="noreferrer">{url}</a></li>)}</ul>; }

function fallbackIndexabilityStages(locale: Locale, pages: readonly PublicAuditPageView[]) {
  const ru = locale === "ru";
  const http = pages.filter((page) => {
    const status = pageHttpStatus(page);
    return status !== null && status >= 200 && status < 300;
  });
  const robots = http.filter((page) => page.robotsAllowed !== false);
  const noindex = robots.filter((page) => page.noindex !== true);
  const canonical = noindex.filter((page) => nestedCanonicalValid(page) !== false);
  return [
    { id: "http", label: ru ? "Страница открылась без ошибки" : "Page opened without an error", count: http.length, explanation: ru ? "Сервер вернул обычный успешный ответ." : "The server returned a normal successful response.", urls: http.flatMap((page) => page.url ? [page.url] : []) },
    { id: "robots", label: ru ? "Файл robots.txt не запрещает загрузку" : "robots.txt does not block loading", count: robots.length, explanation: ru ? "robots.txt — файл с правилами для поисковых роботов." : "robots.txt is the crawler-rules file.", urls: robots.flatMap((page) => page.url ? [page.url] : []) },
    { id: "noindex", label: ru ? "Нет явного запрета показывать страницу в поиске" : "No explicit block from search results", count: noindex.length, explanation: ru ? "Noindex — явный запрет добавлять страницу в поисковую выдачу." : "Noindex explicitly blocks a page from search results.", urls: noindex.flatMap((page) => page.url ? [page.url] : []) },
    { id: "canonical", label: ru ? "Основной адрес страницы указан без противоречий" : "The preferred page address is consistent", count: canonical.length, explanation: ru ? "Canonical подсказывает поисковику, какой адрес страницы считать основным." : "Canonical tells search engines which page address is preferred.", urls: canonical.flatMap((page) => page.url ? [page.url] : []) },
  ];
}

function positiveFindings(result: PublicAuditResultView | null | undefined, locale: Locale): string[] {
  const pages = result?.checkedPages ?? [];
  const output: string[] = [];
  const httpOk = pages.filter((page) => {
    const status = pageHttpStatus(page);
    return status !== null && status >= 200 && status < 300;
  }).length;
  const technicallyAvailable = pages.filter(isTechnicallyIndexable).length;
  const titled = pages.filter((page) => signalPresent(page.title)).length;
  if (httpOk) output.push(locale === "ru" ? `${httpOk} из ${pages.length} проверенных страниц открылись без ошибки сервера.` : `${httpOk} of ${pages.length} checked pages opened without a server error.`);
  if (technicallyAvailable) output.push(locale === "ru" ? `${technicallyAvailable} страниц не имеют найденных технических запретов на обработку роботом.` : `${technicallyAvailable} pages have no detected technical block to crawler processing.`);
  if (titled) output.push(locale === "ru" ? `Заголовок для поисковой выдачи (title) задан на ${titled} проверенных страницах.` : `A search-result title is present on ${titled} checked pages.`);
  return output;
}

function plainSummaryFacts(
  result: PublicAuditResultView | null | undefined,
  locale: Locale,
  pagesChecked: number,
  pagesDiscovered: number,
): string[] {
  const ru = locale === "ru";
  const output = [ru
    ? `Загружено и разобрано страниц: ${pagesChecked}. Всего найдено адресов: ${pagesDiscovered}.`
    : `Pages loaded and analysed: ${pagesChecked}. Total addresses found: ${pagesDiscovered}.`];
  const indexability = result?.indexability;
  if (indexability?.status === "checked") {
    output.push(ru
      ? `Без найденного технического запрета для поиска: ${indexability.indexablePages ?? 0} из ${indexability.checkedPages ?? pagesChecked}. Закрыто правилом noindex: ${indexability.noindexPages ?? 0}; страниц с ошибкой сервера: ${indexability.httpErrorPages ?? 0}.`
      : `No detected technical search block: ${indexability.indexablePages ?? 0} of ${indexability.checkedPages ?? pagesChecked}. Blocked by noindex: ${indexability.noindexPages ?? 0}; pages with a server error: ${indexability.httpErrorPages ?? 0}.`);
  } else if (indexability?.reason) {
    output.push(indexability.reason);
  }
  const counts = result?.issueCounts;
  if (counts) {
    const priority = (counts.critical ?? 0) + (counts.high ?? 0);
    const remaining = (counts.medium ?? 0) + (counts.low ?? 0) + (counts.info ?? 0);
    output.push(ru
      ? `Требуют исправления в первую очередь: ${priority}. Остальные замечания: ${remaining}.`
      : `Need attention first: ${priority}. Other findings: ${remaining}.`);
  }
  return output;
}

function TermDefinitions({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  return (
    <details className="audit-terms">
      <summary>{ru ? "Пояснения к словам в отчёте" : "Terms used in this report"}</summary>
      <dl>{auditTermDefinitions(locale).map((item) => <div key={item.term}><dt>{item.term}</dt><dd>{item.meaning}</dd></div>)}</dl>
    </details>
  );
}

function isTechnicallyIndexable(page: PublicAuditPageView): boolean {
  const status = pageHttpStatus(page);
  if (page.indexability === "indexable") return true;
  return Boolean(status && status >= 200 && status < 300 && page.robotsAllowed !== false && page.noindex !== true && page.canonicalValid !== false);
}

function evidenceText(value: NonNullable<PublicAuditIssueView["evidence"]>[number]): string {
  if (typeof value === "string") return value;
  const details = [value.label, value.observation ?? value.value].filter((item): item is string => Boolean(item));
  const text = details.join(": ");
  return value.url && text ? `${text} — ${value.url}` : text || value.url || "—";
}

function pageHttpStatus(page: PublicAuditPageView): number | null {
  const status = page.http?.status ?? page.status;
  return typeof status === "number" && Number.isFinite(status) ? status : null;
}

function signalText(value: PublicAuditPageView["title"]): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "—";
  return value.value?.trim() || "—";
}

function h1Text(page: PublicAuditPageView): string {
  if (typeof page.h1 === "string") return page.h1 || "—";
  if (page.h1 && typeof page.h1 === "object") return page.h1.values?.filter(Boolean).join(" · ") || `${page.h1.count} H1`;
  return page.h1Count === undefined ? "—" : `${page.h1Count} H1`;
}

function canonicalText(page: PublicAuditPageView, locale: Locale): string {
  const canonical = page.canonical;
  if (typeof canonical === "string") return canonical || "—";
  if (!canonical || typeof canonical !== "object") return "—";
  if (!canonical.url) return locale === "ru" ? "Не задан" : "Not set";
  return canonical.valid === false ? `${canonical.url} (${locale === "ru" ? "проверьте" : "check"})` : canonical.url;
}

function sitemapText(page: PublicAuditPageView, locale: Locale): string {
  const sitemap = page.sitemap;
  if (sitemap?.status === "checked") return sitemap.included ? (locale === "ru" ? "Есть в sitemap.xml" : "In sitemap.xml") : (locale === "ru" ? "Нет в sitemap.xml" : "Not in sitemap.xml");
  if (sitemap?.reason) return sitemap.reason;
  if (page.inSitemap === true) return locale === "ru" ? "Есть в sitemap.xml" : "In sitemap.xml";
  if (page.inSitemap === false) return locale === "ru" ? "Нет в sitemap.xml" : "Not in sitemap.xml";
  return locale === "ru" ? "Не проверено" : "Not checked";
}

function signalPresent(value: PublicAuditPageView["title"]): boolean {
  if (typeof value === "string") return Boolean(value.trim());
  return Boolean(value && typeof value === "object" && (value.present ?? value.value?.trim()));
}

function nestedCanonicalValid(page: PublicAuditPageView): boolean | null | undefined {
  if (page.canonical && typeof page.canonical === "object") return page.canonical.valid;
  return page.canonicalValid;
}

function severityClass(value?: string) { const lower = value?.toLowerCase() ?? "medium"; if (lower.includes("critical") || lower.includes("крит")) return "critical"; if (lower.includes("high") || lower.includes("выс")) return "high"; if (lower.includes("low") || lower.includes("низ")) return "low"; if (lower.includes("info")) return "info"; if (lower.includes("unknown") || lower.includes("not_checked")) return "unknown"; return "medium"; }
function severityLabel(value: string | undefined, locale: Locale) { const severity = severityClass(value); const labels = locale === "ru" ? { critical: "Критично", high: "Высокий приоритет", medium: "Средний приоритет", low: "Низкий приоритет", info: "Наблюдение", unknown: "Не проверено" } : { critical: "Critical", high: "High priority", medium: "Medium priority", low: "Low priority", info: "Observation", unknown: "Not checked" }; return labels[severity as keyof typeof labels]; }
function indexabilityLabel(page: PublicAuditPageView, locale: Locale) { const status = pageHttpStatus(page); if (page.indexability === "indexable") return locale === "ru" ? "технически доступна" : "technically accessible"; if (page.indexability === "blocked") return locale === "ru" ? "технически закрыта" : "technically blocked"; if (page.noindex) return locale === "ru" ? "закрыта правилом noindex" : "blocked by noindex"; if (status !== null && (status < 200 || status >= 300)) return `${locale === "ru" ? "ошибка, код ответа" : "error, response code"} ${status}`; if (status !== null && nestedCanonicalValid(page) !== false) return locale === "ru" ? "технически доступна" : "technically accessible"; return locale === "ru" ? "не проверено" : "not checked"; }
function safePublicUrl(value?: string) { try { const url = new URL(value ?? ""); return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "#"; } catch { return "#"; } }
