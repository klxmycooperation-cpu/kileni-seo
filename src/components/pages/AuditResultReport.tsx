import Link from "next/link";

import { localizedPath, type Locale } from "../../config/site";
import { PUBLIC_AUDIT_PAGE_LIMIT } from "../../config/public-audit";
import { buildAuditClientPresentation, type AuditClientIssue, type AuditClientPresentation } from "../../lib/audit/client-presentation";
import { auditCheckCopy, auditIssueCopy, auditObservationCopy, auditPageFindings, auditTermDefinitions } from "../../lib/audit/report-content";

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
  readonly statusCode?: number;
  readonly pageType?: string | null;
  readonly templateFamily?: string;
  readonly classificationConfidence?: number;
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
  readonly contractVersion?: number;
  readonly engineVersion?: string;
  readonly auditId?: string;
  readonly createdAt?: string;
  readonly target?: string;
  readonly score?: number | null;
  readonly grade?: string | null;
  readonly interpretation?: string;
  readonly finalUrl?: string;
  readonly pagesChecked?: number;
  readonly pagesDiscovered?: number;
  readonly pagesEligible?: number;
  readonly pagesExcluded?: number;
  readonly pagesSelected?: number;
  readonly pagesNotCompleted?: number;
  readonly pagesNotCheckedTotal?: number;
  readonly pagesNotCheckedReturned?: number;
  readonly pagesNotCheckedTruncated?: boolean;
  readonly pagesNotCheckedUrls?: readonly string[];
  readonly excludedPages?: readonly {
    readonly url: string;
    readonly reason: string;
    readonly primaryUrl?: string;
  }[];
  readonly coverageStatus?: "sample_complete" | "sample_partial";
  readonly inventorySummary?: {
    readonly objectsFound: number;
    readonly htmlFound: number;
    readonly eligibleHtml: number;
    readonly excludedHtml?: number;
    readonly selected: number;
    readonly checked: number;
    readonly notCompleted?: number;
    readonly outsideSample?: number;
    readonly representedPageTypes: number;
  };
  readonly selectedPages?: readonly {
    readonly url: string;
    readonly pageType: string;
    readonly selectionReason: string;
    readonly templateFamily: string;
    readonly locale: string | null;
    readonly classificationConfidence?: number;
    readonly classificationReasons?: readonly string[];
  }[];
  readonly checks?: readonly PublicAuditCheckInputView[];
  readonly findings?: readonly PublicAuditFindingView[];
  readonly technicalResources?: readonly PublicAuditTechnicalResourceView[];
  readonly categorySummary?: readonly PublicAuditCategorySummaryView[];
  readonly resultSummary?: PublicAuditStatusCountsView & {
    readonly headline: string;
    readonly totalChecks: number;
    readonly completedChecks: number;
  };
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
  readonly limitations?: readonly string[];
};

export type PublicAuditCheckStatus = "pass" | "warning" | "fail" | "not_applicable" | "not_run" | "insufficient_data";

export type PublicAuditStatusCountsView = Readonly<Partial<Record<PublicAuditCheckStatus, number>>>;

export type PublicAuditCheckInputView = {
  readonly checkId: string;
  readonly checkVersion?: number;
  readonly version?: number;
  readonly category: string;
  readonly title: string;
  readonly status: PublicAuditCheckStatus;
  readonly scope?: "site" | "resource" | "page";
  readonly targetUrl?: string;
  readonly value?: unknown;
  readonly expected?: string;
  readonly severity?: string | null;
  readonly urlEvidence?: readonly { readonly url?: string; readonly observation: string }[];
  readonly evidence?: readonly { readonly url?: string; readonly observation: string }[];
  readonly explanation?: string;
  readonly reason?: string;
  readonly publicExplanation?: string;
  readonly automationLimit: string;
};

export type PublicAuditCheckView = {
  readonly checkId: string;
  readonly checkVersion: number;
  readonly category: string;
  readonly title: string;
  readonly status: PublicAuditCheckStatus;
  readonly targetUrl?: string;
  readonly value: unknown;
  readonly expected: string;
  readonly severity: string;
  readonly urlEvidence: readonly { readonly url?: string; readonly observation: string }[];
  readonly explanation: string;
  readonly automationLimit: string;
};

export type PublicAuditFindingView = {
  readonly checkId: string;
  readonly title: string;
  readonly category: string;
  readonly severity: string;
  readonly whatFound: string;
  readonly whyImportant: string;
  readonly nextStep: string;
  readonly confidence: number;
  readonly affectedCount: number;
  readonly examples: readonly { readonly url?: string; readonly observation: string }[];
};

export type PublicAuditTechnicalResourceView = {
  readonly url: string;
  readonly finalUrl: string;
  readonly resourceType: string;
  readonly statusCode: number | null;
  readonly contentType: string | null;
  readonly classificationConfidence: number;
  readonly classificationReasons: readonly string[];
};

export type PublicAuditCategorySummaryView = PublicAuditStatusCountsView & {
  readonly category: string;
  readonly total: number;
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
  const isContractV2 = result?.contractVersion === 2 && (result.resultVersion === undefined || result.resultVersion === 3);
  const isContractV4 = result?.resultVersion === 4 && result.contractVersion === 3;
  if (isContractV4) {
    return <ClientAuditReport
      locale={locale}
      domain={domain}
      result={result}
      reportHref={reportHref}
      copied={copied}
      onCopy={onCopy}
      offerHref={offerHref}
    />;
  }
  const isCurrentContract = isContractV2 || isContractV4;
  const contractChecks = isCurrentContract ? (result?.checks ?? []).map(normalizeAuditCheck) : [];
  const contractFindings = contractChecks.filter((check) => check.status === "fail" || check.status === "warning");
  const v4Findings = isContractV4 ? result?.findings ?? [] : [];
  const issues = isCurrentContract ? [] : result?.issueGroups ?? result?.issues ?? [];
  const checkedPages = result?.checkedPages ?? [];
  const notChecked = result?.pagesNotCheckedUrls ?? result?.uncheckedUrls ?? result?.discoveredNotChecked ?? [];
  const notCheckedCount = result?.pagesNotCheckedTotal ?? result?.discoveredNotCheckedCount ?? Math.max(0, pagesDiscovered - pagesChecked);
  const isLegacyReport = Boolean(result && !isCurrentContract);
  const risks = isContractV4
    ? v4Findings.slice(0, 4).map((finding) => finding.title)
    : isContractV2
      ? contractFindings.slice(0, 4).map((check) => auditCheckCopy(locale, check).title)
    : result?.summary?.risks ?? issues
    .filter((issue) => issue.severity !== "low")
    .slice(0, 4)
    .map((issue) => auditIssueCopy(locale, issue).title)
    .filter(Boolean);
  const strengths = isCurrentContract
    ? contractChecks.filter((check) => check.status === "pass").slice(0, 4).map((check) => auditCheckCopy(locale, check).title)
    : result?.summary?.strengths ?? positiveFindings(result, locale);
  const summaryFacts = plainSummaryFacts(result, locale, pagesChecked, pagesDiscovered);
  const hasActionableFindings = v4Findings.length > 0 || contractFindings.length > 0 || issues.length > 0;

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
          <strong>{ru ? "Это сохранённый отчёт прежней версии." : "This is a saved report from an earlier version."}</strong>
          <p>{ru ? "Мы показываем только факты, которые были сохранены при той проверке, и не используем старый общий балл. Запустите проверку ещё раз, чтобы получить текущий набор проверок и пояснений." : "Only facts saved by that check are shown, and the old aggregate score is not used. Run the check again to receive the current checks and explanations."}</p>
        </aside>
      ) : null}

      {isCurrentContract && result?.resultSummary ? (
        <ContractOverview
          locale={locale}
          headline={result.resultSummary.headline}
          counts={result.resultSummary}
          engineVersion={result.engineVersion}
          coverageStatus={result.coverageStatus}
        />
      ) : null}

      <section className="audit-evidence-summary" aria-labelledby="audit-coverage-heading">
        <div>
          <p className="eyebrow" id="audit-coverage-heading">{ru ? "Что вошло в проверку" : "What was checked"}</p>
          {isContractV4 && result?.inventorySummary ? <InventoryCards locale={locale} summary={result.inventorySummary} /> : <div className="audit-coverage-cards">
              <article><strong>{pagesDiscovered}</strong><span>{ru ? "адресов страниц найдено" : "page addresses found"}</span></article>
              <article><strong>{pagesChecked}</strong><span>{ru ? "страниц подробно проверено" : "pages checked in detail"}</span></article>
              <article><strong>{notCheckedCount}</strong><span>{ru ? "адресов не вошло в проверку" : "addresses outside the sample"}</span></article>
            </div>}
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

      {(result?.indexability || checkedPages.length > 0) && <IndexabilitySection locale={locale} indexability={result?.indexability} pages={checkedPages} />}

      {isContractV4 && v4Findings.length > 0 ? <ContractFindingsSection locale={locale} findings={v4Findings} /> : null}

      {isCurrentContract && contractChecks.length > 0 ? (
        <ContractChecksSection
          locale={locale}
          checks={contractChecks}
          title={ru ? "Сначала — то, что требует действий" : "Start with the items that need action"}
          description={ru ? "Ошибки и замечания открыты сразу. Успешные проверки и пункты без результата собраны ниже в раскрывающихся списках — содержание отчёта сохранено, но его проще просмотреть." : "Errors and findings are open by default. Passed and unavailable checks are grouped in expandable lists below, preserving the full report while making it easier to scan."}
        />
      ) : null}

      {!isCurrentContract && issues.length > 0 ? (
        <section className="audit-report-section" id="audit-issues" aria-labelledby="audit-issues-heading">
          <header><p className="eyebrow">{ru ? "Замечания" : "Findings"}</p><h2 id="audit-issues-heading">{ru ? "Что именно исправлять" : "What exactly to fix"}</h2><p>{ru ? "Для каждого замечания показано, где оно найдено, почему влияет на сайт, что изменить и как проверить результат." : "Each finding shows where it was found, why it matters, what to change, and how to verify the result."}</p></header>
          <div className="audit-issue-list">{issues.map((issue, index) => <IssueCard key={`${issue.code ?? "issue"}-${index}`} locale={locale} issue={issue} checked={pagesChecked} />)}</div>
        </section>
      ) : !isCurrentContract && isLegacyReport ? (
        <LegacyCategories locale={locale} categories={result?.categories ?? []} />
      ) : !isCurrentContract || (v4Findings.length === 0 && contractFindings.length === 0) ? (
        <section className="audit-report-section audit-no-issues" aria-labelledby="audit-no-issues-heading">
          <header>
            <p className="eyebrow">{ru ? "Замечания" : "Findings"}</p>
            <h2 id="audit-no-issues-heading">{ru ? "В проверенной выборке замечаний не найдено" : "No findings in the checked sample"}</h2>
            <p>{ru ? `Этот вывод относится только к ${pagesChecked} подробно проверенным страницам. Ниже показаны сохранённые факты по каждой из них.` : `This conclusion applies only to the ${pagesChecked} pages checked in detail. The saved facts for each page are shown below.`}</p>
          </header>
        </section>
      ) : null}

      {checkedPages.length > 0 && <CheckedPagesSection locale={locale} pages={checkedPages} />}

      {isCurrentContract && result?.selectedPages?.length ? <SelectedPagesSection locale={locale} pages={result.selectedPages} /> : null}

      {isContractV4 && result?.technicalResources?.length ? <TechnicalResourcesSection locale={locale} resources={result.technicalResources} /> : null}

      <DiscoveredPagesSection locale={locale} entries={notChecked} total={notCheckedCount} />

      <section className="audit-report-section audit-method" aria-labelledby="audit-method-heading">
        <header><p className="eyebrow">{ru ? "Границы проверки" : "Check boundaries"}</p><h2 id="audit-method-heading">{ru ? "Что можно подтвердить без доступа к кабинетам поисковых систем" : "What can be confirmed without search-engine accounts"}</h2></header>
        <div className="audit-method-grid">
          <article><h3>{ru ? "Страница доступна для проверки" : "Page available for checking"}</h3><p>{ru ? "Сервер открыл страницу без ошибки, и на ней не найден явный запрет для поискового робота." : "The server opened the page without an error and no explicit crawler block was found."}</p></article>
          <article><h3>{ru ? "Страница уже есть в поиске" : "Page already appears in search"}</h3><p>{ru ? "Это можно подтвердить только в Яндекс Вебмастере или Google Search Console. Бесплатная проверка не подключается к этим кабинетам." : "Only Yandex Webmaster or Google Search Console can confirm this. The free check is not connected to those accounts."}</p></article>
          <article><h3>{ru ? "Что осталось за границами" : "What remains outside the check"}</h3><p>{ru ? "Мы не подтверждаем позиции, посещаемость и наличие страницы в поиске без доступа к кабинетам поисковых систем. Непроверенные пункты отдельно помечены в отчёте." : "We do not confirm rankings, traffic, or actual search inclusion without search-engine account access. Unchecked items are marked separately in the report."}</p></article>
        </div>
        {(result?.limitations?.length || result?.methodology?.limitations?.length) ? <ul className="audit-limitations">{(result.limitations ?? result.methodology?.limitations ?? []).map((item) => <li key={item}>{item}</li>)}</ul> : null}
        <TermDefinitions locale={locale} />
      </section>

      <div className="result-cta">
        <p className="eyebrow">{ru ? "Следующий шаг" : "Next step"}</p>
        <h2>{hasActionableFindings ? (ru ? "Что делать с найденными проблемами" : "What to do with the findings") : (ru ? "Проверить остальные страницы" : "Check the remaining pages")}</h2>
        <p>{hasActionableFindings
          ? (ru ? "В техническом аудите проверим до 200 страниц и повторяющиеся шаблоны, затем передадим задачи с адресами и приоритетом исправлений." : "The technical audit checks up to 200 pages and repeated templates, then gives you prioritised tasks with page URLs.")
          : (ru ? "На выбранных страницах ошибок не найдено. Технический аудит проверит до 200 страниц и повторяющиеся шаблоны за пределами бесплатной выборки." : "No errors were found on the selected pages. The technical audit checks up to 200 pages and repeated templates beyond the free sample.")}</p>
        <div>
          {!hasActionableFindings && notCheckedCount > 0 ? <Link className="button button-primary" href={offerHref("seo-audit-200")}>{ru ? "Проверить остальные страницы" : "Check the remaining pages"}<span aria-hidden="true">↗</span></Link> : null}
          <Link className={hasActionableFindings ? "button button-primary" : "button button-secondary"} href={offerHref("seo-audit-200")}>{ru ? "Заказать технический аудит" : "Request a technical audit"}{hasActionableFindings ? <span aria-hidden="true">↗</span> : null}</Link>
          {hasActionableFindings ? <Link className="button button-secondary" href={offerHref("seo-audit-implementation")}>{ru ? "Обсудить исправления" : "Discuss fixes"}</Link> : null}
        </div>
      </div>
    </div>
  );
}

function ClientAuditReport({
  locale,
  domain,
  result,
  reportHref,
  copied,
  onCopy,
  offerHref,
}: {
  locale: Locale;
  domain?: string;
  result: PublicAuditResultView;
  reportHref: string;
  copied: boolean;
  onCopy: () => void;
  offerHref: (offer: PublicAuditCtaOfferId) => string;
}) {
  const ru = locale === "ru";
  const presentation = buildAuditClientPresentation(result, locale);
  const localUnsaved = presentation.performance.status === "not_persisted";
  const firstStrengths = presentation.strengths.slice(0, 3);
  const attentionIssues = presentation.issues.filter((issue) => issue.kind !== "optional");
  const optionalIssues = presentation.issues.filter((issue) => issue.kind === "optional");
  const confirmedDuplicates = (result.excludedPages ?? []).filter((page) => page.reason === "confirmed_duplicate" && page.primaryUrl);

  return <div className="result-body result-body--client">
    <section className="audit-client-overview" aria-labelledby="audit-client-heading">
      <div className="audit-client-overview__topline">
        <div>
          <p className="eyebrow">{ru ? "Проверка завершена" : "Check complete"}</p>
          <h1 id="audit-client-heading">{ru ? "Краткий итог для " : "Summary for "}<span className="audit-client-heading-domain">{domain ?? (ru ? "сайта" : "the website")}</span></h1>
        </div>
        <div className="result-actions">
          {!localUnsaved ? <><a className="button button-secondary" href={reportHref} download>{ru ? "Скачать PDF" : "Download PDF"}</a>
          <button className="button button-secondary" type="button" onClick={onCopy}>{copied ? (ru ? "Ссылка скопирована" : "Link copied") : (ru ? "Скопировать ссылку" : "Copy link")}</button></> : null}
        </div>
      </div>

      {localUnsaved ? <p className="audit-plain-note" role="status"><strong>{ru ? "Локальный несохранённый запуск" : "Unsaved local run"}</strong> — {presentation.performance.reason}</p> : null}

      <ClientSummaryStats locale={locale} presentation={presentation} />
      <p className="audit-client-findings-summary">{presentation.summary.findingsLabel}</p>
      <p className="audit-client-overview__scope-note">{presentation.conclusion}</p>

      <div className="audit-client-overview__conclusions">
        <article>
          <h2>{ru ? "Что стоит проверить" : "What needs a closer look"}</h2>
          {attentionIssues.length ? <ul>{attentionIssues.map((issue) => <li key={`${issue.checkId}-${issue.url}`} data-kind={issue.kind}>
            <span>{clientIssueKindLabel(issue.kind, locale)}</span>
            <a href={`#${clientIssueAnchor(issue)}`}>{issue.title}</a>
          </li>)}</ul> : <p>{ru ? "Проблем, требующих действий, в проверенной выборке не найдено." : "No action items were found in the checked sample."}</p>}
        </article>
        <article>
          <h2>{ru ? "Что уже в порядке" : "What already works"}</h2>
          <ul>{firstStrengths.map((strength) => <li key={strength}><RichAuditText locale={locale} text={strength} /></li>)}</ul>
        </article>
      </div>

      <ClientNextStep locale={locale} domain={domain} presentation={presentation} offerHref={offerHref} compact />
    </section>

    <div className="audit-client-mobile-actions" aria-label={ru ? "Действия с отчётом" : "Report actions"}>
      {!localUnsaved ? <><a className="button button-secondary" href={reportHref} download>{ru ? "Скачать PDF" : "Download PDF"}</a>
      <button className="button button-secondary" type="button" onClick={onCopy}>{copied ? (ru ? "Ссылка скопирована" : "Link copied") : (ru ? "Скопировать ссылку" : "Copy link")}</button></> : null}
    </div>

    <section className="audit-report-section audit-client-issues" aria-labelledby="audit-client-issues-heading">
      <header>
        <p className="eyebrow">{ru ? `Выводы по проверенным URL: ${attentionIssues.length}` : `Conclusions for checked URLs: ${attentionIssues.length}`}</p>
        <h2 id="audit-client-issues-heading">{ru ? "Что стоит проверить" : "What needs a closer look"}</h2>
        <p>{ru ? "Каждый пункт отделяет найденный факт от его значения и от способа проверки." : "Each item separates the observed fact, its impact and the way it was checked."}</p>
      </header>
      <div className="audit-issue-list">
        {attentionIssues.map((issue) => <ClientIssueCard locale={locale} issue={issue} key={`${issue.checkId}-${issue.url}`} />)}
      </div>
    </section>

    {optionalIssues.length ? <section className="audit-report-section audit-client-improvements" aria-labelledby="audit-client-improvements-heading">
      <header>
        <p className="eyebrow">{ru ? "Необязательные улучшения" : "Optional improvements"}</p>
        <h2 id="audit-client-improvements-heading">{ru ? "Можно улучшить" : "Possible improvement"}</h2>
        <p>{ru ? "Это не поломка и не срочная проблема. Решение можно принять отдельно." : "This is not a fault or an urgent issue. It can be considered separately."}</p>
      </header>
      <div className="audit-issue-list">
        {optionalIssues.map((issue) => <ClientIssueCard locale={locale} issue={issue} key={`${issue.checkId}-${issue.url}`} />)}
      </div>
    </section> : null}

    <section className="audit-report-section audit-client-strengths" aria-labelledby="audit-client-strengths-heading">
      <header><p className="eyebrow">{ru ? "Проверенные факты" : "Checked facts"}</p><h2 id="audit-client-strengths-heading">{ru ? "Что уже в порядке" : "What already works"}</h2></header>
      <ul data-count={Math.min(4, presentation.strengths.length)}>{presentation.strengths.map((strength) => <li key={strength}><RichAuditText locale={locale} text={strength} /></li>)}</ul>
    </section>

    <ClientPagesSection locale={locale} pages={presentation.pages} />

    <section className="audit-report-section audit-client-scope" aria-labelledby="audit-client-scope-heading">
      <header>
        <p className="eyebrow">{ru ? "Выборка и ограничения" : "Sample and limits"}</p>
        <h2 id="audit-client-scope-heading">{ru ? `${presentation.summary.outsideSample} страниц не вошли в бесплатную выборку` : `${presentation.summary.outsideSample} pages were outside the free sample`}</h2>
        <p>{ru ? "По этим страницам отчёт не делает выводов: отсутствие проверки не означает проблему." : "The report makes no claims about these pages; not checking a page does not mean it has a problem."}</p>
      </header>
      {presentation.summary.excluded > 0 ? <div className="audit-exclusion-summary"><strong>{ru ? `Исключено до выборки: ${presentation.summary.excluded}` : `Excluded before sampling: ${presentation.summary.excluded}`}</strong><ul>{presentation.exclusions.map((item) => <li key={item.reason}>{item.label}: {item.count}</li>)}</ul></div> : null}
      {confirmedDuplicates.length > 0 ? <details className="audit-section-disclosure"><summary>{ru ? "Показать подтверждённые дубликаты" : "Show confirmed duplicates"}</summary><ul className="audit-duplicate-list">{confirmedDuplicates.map((page) => <li key={`${page.url}-${page.primaryUrl}`}><a href={safePublicUrl(page.url)} target="_blank" rel="noreferrer">{page.url}</a><span aria-hidden="true">→</span><a href={safePublicUrl(page.primaryUrl!)} target="_blank" rel="noreferrer">{page.primaryUrl}</a></li>)}</ul></details> : null}
      {presentation.summary.notCompleted > 0 ? <p className="audit-resource-summary">{ru ? `Не удалось завершить проверку выбранных страниц: ${presentation.summary.notCompleted}.` : `Selected pages not completed: ${presentation.summary.notCompleted}.`}</p> : null}
      {(result.pagesNotCheckedUrls?.length ?? 0) > 0 ? <UncheckedUrlGroups
        locale={locale}
        total={presentation.summary.outsideSample}
        truncated={result.pagesNotCheckedTruncated === true}
        urls={result.pagesNotCheckedUrls ?? []}
      /> : null}
      <ClientCoverageGroups locale={locale} groups={presentation.coverageGroups} />
      <ClientUrlDecisions locale={locale} decisions={presentation.urlDecisions} />
    </section>

    <section className="audit-report-section audit-client-resources" aria-labelledby="audit-client-resources-heading">
      <header><p className="eyebrow">{ru ? "Отдельная проверка" : "Separate check"}</p><h2 id="audit-client-resources-heading">{ru ? "Технические файлы, проверенные отдельно" : "Technical files checked separately"}</h2></header>
      <ul className="audit-selected-list">{presentation.technicalFiles.map((resource, index) => <li key={`${resource.type}-${resource.url}`}>
        <span className="mono">{String(index + 1).padStart(2, "0")}</span>
        <div><RichAuditText locale={locale} text={resource.label} /><p>{resource.url ? <a href={safePublicUrl(resource.url)} target="_blank" rel="noreferrer">{resource.url}</a> : (ru ? "Адрес не сохранён" : "URL not saved")} — {resource.status === "available" ? (ru ? "данные доступны" : "data available") : (ru ? "данные недоступны" : "data unavailable")}{resource.statusCode !== null ? `; ${ru ? "код ответа" : "response code"}: ${resource.statusCode}` : ""}</p>{resource.loadedAt ? <p>{ru ? "Получено" : "Captured"}: <time dateTime={resource.loadedAt}>{resource.loadedAt}</time></p> : null}{resource.reason ? <p>{resource.reason}</p> : null}{resource.facts.length ? <ul>{resource.facts.map((detail) => <li key={detail}>{detail}</li>)}</ul> : null}</div>
      </li>)}</ul>
      {presentation.additionalFiles > 0 ? <details className="audit-section-disclosure audit-resource-summary"><summary>{ru
        ? `Дополнительные изображения, скрипты и документы: ${presentation.additionalFiles}`
        : `Additional images, scripts and documents: ${presentation.additionalFiles}`}</summary><p>{ru
        ? `Они не входят в бесплатную проверку и не загружались${presentation.additionalDocuments > 0 ? `; среди них документов: ${presentation.additionalDocuments}` : ""}.`
        : `They are outside the free check and were not loaded${presentation.additionalDocuments > 0 ? `; documents among them: ${presentation.additionalDocuments}` : ""}.`}</p></details> : null}
    </section>

    <ClientPerformanceAndExternalData locale={locale} presentation={presentation} />

    <section className="audit-report-section audit-method" aria-labelledby="audit-client-limits-heading">
      <header><p className="eyebrow">{ru ? "Границы вывода" : "Limits of the conclusion"}</p><h2 id="audit-client-limits-heading">{ru ? "Чего бесплатная проверка не определяет" : "What the free check cannot determine"}</h2></header>
      <ul className="audit-limitations">{presentation.limitations.map((limitation) => <li key={limitation}><RichAuditText locale={locale} text={limitation} /></li>)}</ul>
      <p className="audit-client-disclaimer">{presentation.disclaimer}</p>
    </section>

    <ClientNextStep locale={locale} domain={domain} presentation={presentation} offerHref={offerHref} />
  </div>;
}

function ClientSummaryStats({ locale, presentation }: { locale: Locale; presentation: AuditClientPresentation }) {
  const ru = locale === "ru";
  const stats = [
    [presentation.summary.scopeValue, presentation.summary.scopeLabel],
    [presentation.summary.eligible, ru ? "Подходят для выборки" : "Eligible for sampling"],
    [presentation.summary.checked, presentation.summary.checkedLabel],
    [presentation.summary.outsideSample, ru ? "Не вошло в выборку" : "Outside the sample"],
    [presentation.summary.excluded, ru ? "Исключено до выборки" : "Excluded before sampling"],
    [presentation.summary.critical, ru ? "Критических проблем" : "Critical problems"],
    [presentation.summary.review, ru ? "Стоит проверить" : "Needs review"],
    [presentation.summary.optional, ru ? "Необязательных улучшений" : "Optional improvements"],
    [presentation.summary.unverifiedGroups, ru ? "Групп с непроверенными URL" : "Groups with unchecked URLs"],
    [presentation.summary.unavailableExternalMetrics, ru ? "Недоступных внешних показателей" : "Unavailable external metrics"],
  ] as const;
  return <dl className="audit-client-stats">{stats.map(([value, label]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

type UncheckedUrlGroupKey = "services" | "articles" | "cases" | "methodology" | "glossary" | "other";

type UncheckedUrlGroup = {
  key: UncheckedUrlGroupKey;
  label: string;
  urls: readonly string[];
};

export function groupUncheckedAuditUrls(urls: readonly string[], locale: Locale): readonly UncheckedUrlGroup[] {
  const ru = locale === "ru";
  const labels: Readonly<Record<UncheckedUrlGroupKey, string>> = {
    services: ru ? "Услуги" : "Services",
    articles: ru ? "Статьи" : "Articles",
    cases: ru ? "Кейсы" : "Cases",
    methodology: ru ? "Методика" : "Methodology",
    glossary: ru ? "Словарь" : "Glossary",
    other: ru ? "Остальные" : "Other",
  };
  const groups = new Map<UncheckedUrlGroupKey, string[]>([
    ["services", []],
    ["articles", []],
    ["cases", []],
    ["methodology", []],
    ["glossary", []],
    ["other", []],
  ]);

  for (const rawUrl of [...new Set(urls.map(safePublicUrl))].sort((left, right) => left.localeCompare(right, "en"))) {
    let pathname = "/";
    try { pathname = new URL(rawUrl).pathname.toLowerCase(); } catch { /* keep the address in Other */ }
    const basePath = pathname.replace(/^\/(?:[a-z]{2}(?:-[a-z]{2})?)(?=\/|$)/u, "") || "/";
    const segments = basePath.split("/").filter(Boolean);
    const first = segments[0] ?? "";
    const tokens = new Set(segments.flatMap((segment) => segment.split(/[-_]+/u)).filter(Boolean));
    const key: UncheckedUrlGroupKey = /^(?:glossary|dictionary)$/u.test(first)
      ? "glossary"
      : /^(?:checks?|methodology|methods?)$/u.test(first)
        ? "methodology"
        : /^(?:blog|articles?|news|guides?)$/u.test(first) && segments.length > 1
          ? "articles"
          : /^(?:cases?|portfolio)$/u.test(first)
            ? "cases"
            : /^(?:services?|solutions?|marketplaces?|catalog)$/u.test(first)
              || ["seo", "audit", "promotion", "development", "advertising", "ads", "marketing", "marketplace"].some((token) => tokens.has(token))
              ? "services"
              : "other";
    groups.get(key)!.push(rawUrl);
  }

  return (["services", "articles", "cases", "methodology", "glossary", "other"] as const)
    .flatMap((key) => {
      const groupUrls = groups.get(key) ?? [];
      return groupUrls.length ? [{ key, label: labels[key], urls: groupUrls }] : [];
    });
}

function UncheckedUrlGroups({ locale, total, truncated, urls }: {
  locale: Locale;
  total: number;
  truncated: boolean;
  urls: readonly string[];
}) {
  const ru = locale === "ru";
  const previewLimit = 8;
  const groups = groupUncheckedAuditUrls(urls, locale);
  return <details className="audit-section-disclosure audit-unchecked-groups">
    <summary>{ru ? `Показать страницы, не вошедшие в выборку · ${total}` : `Show pages outside the sample · ${total}`}</summary>
    <div className="audit-unchecked-groups__body">
      {truncated ? <p className="audit-unchecked-groups__note">{ru
        ? `В этом сохранённом отчёте доступны ${urls.length} из ${total} адресов.`
        : `This saved report contains ${urls.length} of ${total} addresses.`}</p> : null}
      {groups.map((group) => {
        const preview = group.urls.slice(0, previewLimit);
        const rest = group.urls.slice(previewLimit);
        return <section data-group={group.key} key={group.key}>
          <h3><span className="audit-unchecked-group__label">{group.label}</span><span className="audit-unchecked-group__count">{group.urls.length}</span></h3>
          <UrlList urls={preview} />
          {rest.length ? <details className="audit-url-group-more"><summary>{ru ? `Показать ещё ${rest.length}` : `Show ${rest.length} more`}</summary><UrlList urls={rest} /></details> : null}
        </section>;
      })}
    </div>
  </details>;
}

function ClientIssueCard({ locale, issue }: { locale: Locale; issue: AuditClientIssue }) {
  const ru = locale === "ru";
  return <article className="audit-issue-card audit-client-issue" id={clientIssueAnchor(issue)} data-kind={issue.kind}>
    <header><span className={`audit-client-kind audit-client-kind--${issue.kind}`}>{clientIssueKindLabel(issue.kind, locale)}</span><a href={safePublicUrl(issue.url)} target="_blank" rel="noreferrer">{issue.url}</a>{issue.affectedUrls.length > 1 ? <small>{ru ? `Затронуто страниц: ${issue.affectedUrls.length}` : `Affected pages: ${issue.affectedUrls.length}`}</small> : null}</header>
    <h3>{issue.title}</h3>
    <Fact label={ru ? "Что нашли" : "What was found"} value={issue.whatFound} locale={locale} />
    <Fact label={ru ? "Почему это важно" : "Why it matters"} value={issue.whyImportant} locale={locale} />
    <Fact label={ru ? "Как проверили" : "How it was checked"} value={issue.howChecked} locale={locale} />
    <Fact label={ru ? "Насколько надёжен вывод" : "How reliable the conclusion is"} value={issue.reliability} locale={locale} />
    <Fact label={ru ? "Что делать дальше" : "What to do next"} value={issue.nextStep} locale={locale} />
    {issue.affectedUrls.length > 1 ? <details className="audit-client-measurements"><summary>{ru ? "Показать затронутые страницы" : "Show affected pages"}</summary><UrlList urls={issue.affectedUrls} /></details> : null}
    {issue.details?.length ? <details className="audit-client-measurements"><summary>{ru ? "Показать данные лабораторного теста" : "Show laboratory test data"}</summary><dl>{issue.details.map((detail) => <div key={detail.label}><dt><RichAuditText locale={locale} text={detail.label} /></dt><dd>{detail.value}</dd></div>)}</dl></details> : null}
  </article>;
}

function ClientPagesSection({ locale, pages }: {
  locale: Locale;
  pages: AuditClientPresentation["pages"];
}) {
  const ru = locale === "ru";
  return <section className="audit-report-section audit-client-pages" aria-labelledby="audit-client-pages-heading">
    <header>
      <p className="eyebrow">{ru ? "Проверенные страницы" : "Checked pages"}</p>
      <h2 id="audit-client-pages-heading">{ru ? `Результат по ${pages.length} страницам` : `Results for ${pages.length} pages`}</h2>
      <p>{ru ? "Фактическое наличие в поиске без Яндекс Вебмастера или Search Console не проверялось." : "Actual search inclusion was not checked without Yandex Webmaster or Search Console."}</p>
    </header>
    <div className="audit-page-cards">{pages.map((page, index) => {
      return <details className="audit-page-card" key={page.url}>
        <summary><span className="mono">{String(index + 1).padStart(2, "0")}</span><span className="audit-page-summary-copy"><strong>{page.url}</strong><small>{page.typeLabel}. {page.issues.length ? (ru ? `Пунктов, требующих внимания: ${page.issues.length}` : `Items requiring attention: ${page.issues.length}`) : (ru ? "Замечаний нет" : "No findings")}</small></span><span className="audit-page-summary-action">{ru ? "Подробнее" : "Details"}</span></summary>
        <div className="audit-page-card__content">
          <div className="audit-page-selection"><strong>{ru ? "Почему выбрана" : "Why this page was selected"}</strong><p>{page.selectionReason}</p></div>
          <p className="audit-page-indexability">{page.indexability}</p>
          <dl className="audit-page-signals">
            <ClientEvidenceRow label={ru ? "Время проверки (UTC)" : "Checked at (UTC)"} value={page.evidence.checkedAt.value} unavailable={page.evidence.checkedAt.reason} />
            <ClientEvidenceRow label={ru ? "Код ответа страницы" : "Page response code"} value={page.evidence.httpStatus.value} unavailable={page.evidence.httpStatus.reason} />
            <ClientEvidenceRow label={ru ? "Перенаправления" : "Redirects"} value={page.evidence.redirects.value ? (ru ? `Количество: ${page.evidence.redirects.value.count}${page.evidence.redirects.value.chain.length ? `. Цепочка: ${page.evidence.redirects.value.chain.join(" → ")}` : ""}` : `Count: ${page.evidence.redirects.value.count}${page.evidence.redirects.value.chain.length ? `. Chain: ${page.evidence.redirects.value.chain.join(" → ")}` : ""}`) : null} unavailable={page.evidence.redirects.reason} />
            <ClientEvidenceRow label="Title" value={page.evidence.title.value ? `${page.evidence.title.value.present ? (ru ? "Найден" : "Present") : (ru ? "Не найден" : "Missing")}${page.evidence.title.value.text ? `: ${page.evidence.title.value.text}` : ""}` : null} unavailable={page.evidence.title.reason} />
            <ClientEvidenceRow label="H1" value={page.evidence.h1.value ? `${page.evidence.h1.value.count}${page.evidence.h1.value.values.length ? `: ${page.evidence.h1.value.values.join("; ")}` : ""}` : null} unavailable={page.evidence.h1.reason} />
            <ClientEvidenceRow label="Canonical" value={page.evidence.canonical.value ? `${page.evidence.canonical.value.url ?? (ru ? "не задан" : "not set")}; ${page.evidence.canonical.value.valid ? (ru ? "корректен" : "valid") : (ru ? "требует проверки" : "needs review")}` : null} unavailable={page.evidence.canonical.reason} />
            <ClientEvidenceRow label="Robots" value={page.evidence.robots.value ? `${ru ? "Доступ по robots.txt" : "Allowed by robots.txt"}: ${triState(page.evidence.robots.value.allowed, locale)}; noindex: ${page.evidence.robots.value.noindex ? (ru ? "да" : "yes") : (ru ? "нет" : "no")}; meta: ${page.evidence.robots.value.meta ?? "—"}; X-Robots-Tag: ${page.evidence.robots.value.header ?? "—"}` : null} unavailable={page.evidence.robots.reason} />
            <ClientEvidenceRow label="Hreflang" value={page.evidence.hreflang.value ? (page.evidence.hreflang.value.length ? page.evidence.hreflang.value.map((entry) => `${entry.language}: ${entry.url}`).join("; ") : (ru ? "Связи не найдены" : "No links found")) : null} unavailable={page.evidence.hreflang.reason} />
            <ClientEvidenceRow label={ru ? "Структурированные данные" : "Structured data"} value={page.evidence.schema.value ? `${ru ? "Всего" : "Total"}: ${page.evidence.schema.value.total}; ${ru ? "валидных" : "valid"}: ${page.evidence.schema.value.valid}; ${ru ? "с ошибкой" : "invalid"}: ${page.evidence.schema.value.invalid}; ${ru ? "типы" : "types"}: ${page.evidence.schema.value.types.join(", ") || "—"}` : null} unavailable={page.evidence.schema.reason} />
            <ClientEvidenceRow label={ru ? "Внутренние ссылки со страницы" : "Internal links from the page"} value={page.evidence.internalLinks.value} unavailable={page.evidence.internalLinks.reason} />
            <ClientEvidenceRow label={ru ? "Фактическое индексирование" : "Actual search indexing"} value={page.evidence.actualIndexing.value} unavailable={page.evidence.actualIndexing.reason} />
          </dl>
          <div className={`audit-page-findings${page.issues.length ? "" : " audit-page-findings--clear"}`}><strong>{ru ? "Вывод по странице" : "Page conclusion"}</strong>{page.issues.length ? <ul>{page.issues.map((issue) => <li key={issue.checkId}><a href={`#${clientIssueAnchor(issue)}`}>{issue.title}</a></li>)}</ul> : <p>{ru ? "В проверенных данных замечаний по этой странице нет." : "No findings were recorded for this page."}</p>}</div>
        </div>
      </details>;
    })}</div>
  </section>;
}

function ClientEvidenceRow({ label, value, unavailable }: { label: string; value: string | number | null; unavailable?: string }) {
  return <div><dt>{label}</dt><dd>{value === null ? (unavailable ?? "Unavailable") : value}</dd></div>;
}

function triState(value: boolean | null, locale: Locale): string {
  if (value === null) return locale === "ru" ? "не удалось определить" : "unavailable";
  return value ? (locale === "ru" ? "разрешён" : "allowed") : (locale === "ru" ? "запрещён" : "blocked");
}

function ClientCoverageGroups({ locale, groups }: {
  locale: Locale;
  groups: AuditClientPresentation["coverageGroups"];
}) {
  const ru = locale === "ru";
  if (!groups.some((group) => group.coverageStatus === "available")) {
    return <div className="audit-client-coverage-groups">
      <h3>{ru ? "Распределение страниц по группам" : "Page coverage by group"}</h3>
      <p className="audit-plain-note">{ru ? "Данные о покрытии не сохранены. Повторите проверку, чтобы получить распределение страниц по группам." : "Coverage data was not saved. Run the audit again to get the page-group distribution."}</p>
    </div>;
  }
  return <div className="audit-client-coverage-groups">
    <h3>{ru ? "Все группы покрытия" : "All coverage groups"}</h3>
    <p>{ru ? "Ноль означает, что при сохранённом распределении адресов в этой группе не найдено." : "A zero means that the saved distribution contains no URLs in that group."}</p>
    <div className="audit-table-scroll"><table>
      <thead><tr><th>{ru ? "Группа" : "Group"}</th><th>{ru ? "Найдено" : "Found"}</th><th>{ru ? "Подходят" : "Eligible"}</th><th>{ru ? "Выбрано" : "Selected"}</th><th>{ru ? "Проверено" : "Checked"}</th><th>{ru ? "Не проверено" : "Unchecked"}</th></tr></thead>
      <tbody>{groups.map((group) => <tr key={group.group} data-coverage={group.coverageStatus}>
        <th scope="row">{group.label}{group.coverageStatus === "unavailable" ? <small>{ru ? "Нет данных в сохранённом отчёте" : "No data in the saved report"}</small> : null}</th>
        <td data-zero={group.found === 0}>{group.found}</td>
        <td data-zero={group.eligible === 0}>{group.eligible}</td>
        <td data-zero={group.selected === 0}>{group.selected}</td>
        <td data-zero={group.checked === 0}>{group.checked}</td>
        <td data-zero={group.unchecked === 0}>{group.unchecked}</td>
      </tr>)}</tbody>
    </table></div>
  </div>;
}

function ClientUrlDecisions({ locale, decisions }: {
  locale: Locale;
  decisions: AuditClientPresentation["urlDecisions"];
}) {
  const ru = locale === "ru";
  if (!decisions.length) return <p className="audit-plain-note">{ru
    ? "В сохранённом отчёте прежней версии нет причин выбора и исключения отдельных URL."
    : "The saved legacy report does not contain reasons for selecting or excluding individual URLs."}</p>;
  return <details className="audit-section-disclosure audit-client-url-decisions">
    <summary>{ru ? `Показать решения по URL: ${decisions.length}` : `Show URL decisions: ${decisions.length}`}</summary>
    <ul className="audit-selected-list">{decisions.map((decision, index) => <li key={`${decision.outcome}-${decision.url}-${index}`} data-outcome={decision.outcome}>
      <span className="mono">{String(index + 1).padStart(2, "0")}</span>
      <div>
        <strong>{decision.outcomeLabel}: {decision.url}</strong>
        {decision.finalUrl !== decision.url ? <p>{ru ? "Конечный адрес" : "Final URL"}: {decision.finalUrl}</p> : null}
        <p>{decision.reason}</p>
        <p>{ru ? "Источник" : "Source"}: {decision.sourceLabel}. {ru ? "Группа" : "Group"}: {decision.groupLabel}.</p>
        {decision.selectionReason ? <p>{ru ? "Причина выбора" : "Selection reason"}: {decision.selectionReason}</p> : null}
        {decision.primaryUrl ? <p>{ru ? "Основной URL" : "Primary URL"}: {decision.primaryUrl}</p> : null}
      </div>
    </li>)}</ul>
  </details>;
}

function ClientPerformanceAndExternalData({ locale, presentation }: {
  locale: Locale;
  presentation: AuditClientPresentation;
}) {
  const ru = locale === "ru";
  const performance = presentation.performance;
  const measurements = [
    [ru ? "Оценка" : "Score", performance.score === null ? null : `${performance.score} / 100`],
    ["FCP", performance.fcpMs === null ? null : `${performance.fcpMs} ms`],
    ["LCP", performance.lcpMs === null ? null : `${performance.lcpMs} ms`],
    ["CLS", performance.cls],
    ["TBT", performance.tbtMs === null ? null : `${performance.tbtMs} ms`],
    ["Speed Index", performance.speedIndexMs === null ? null : `${performance.speedIndexMs} ms`],
  ].filter((entry): entry is [string, string | number] => entry[1] !== null);
  return <section className="audit-report-section audit-client-external" aria-labelledby="audit-client-external-heading">
    <header>
      <p className="eyebrow">{ru ? "Измерения и внешние данные" : "Measurements and external data"}</p>
      <h2 id="audit-client-external-heading">{ru ? "Что измерено, а что осталось недоступно" : "What was measured and what remains unavailable"}</h2>
    </header>
    <article className="audit-client-performance" data-status={performance.status}>
      <h3>{performance.label}</h3>
      <p>{performance.reason}</p>
      {["completed", "legacy_summary_only", "not_persisted"].includes(performance.status) ? <dl className="audit-page-signals">
        <div><dt>{ru ? "Проверенный URL" : "Measured URL"}</dt><dd>{performance.targetUrl ?? "—"}</dd></div>
        <div><dt>{ru ? "Время (UTC)" : "Time (UTC)"}</dt><dd>{performance.capturedAt ?? (ru ? "Не сохранено" : "Not saved")}</dd></div>
        <div><dt>{ru ? "Профиль" : "Profile"}</dt><dd>{performance.profile ?? "—"}</dd></div>
        <div><dt>{ru ? "Запусков" : "Runs"}</dt><dd>{performance.runCount}</dd></div>
        {performance.durationMs !== null ? <div><dt>{ru ? "Длительность" : "Duration"}</dt><dd>{Math.round(performance.durationMs / 100) / 10} {ru ? "с" : "s"}</dd></div> : null}
        {measurements.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl> : null}
    </article>
    <h3>{ru ? "Внешние показатели недоступны без подключённых систем" : "External metrics unavailable without connected systems"}</h3>
    <ul className="audit-limitations">{presentation.externalMetrics.map((metric) => <li key={metric.id}><strong>{metric.label}:</strong> {metric.reason}</li>)}</ul>
  </section>;
}

function ClientNextStep({ locale, domain, presentation, offerHref, compact = false }: { locale: Locale; domain?: string; presentation: AuditClientPresentation; offerHref: (offer: PublicAuditCtaOfferId) => string; compact?: boolean }) {
  const ru = locale === "ru";
  const repeatHref = repeatAuditHref(locale, domain);
  return <div className={compact ? "audit-client-next audit-client-next--compact" : "result-cta audit-client-next"}>
    {!compact ? <p className="eyebrow">{ru ? "Следующий шаг" : "Next step"}</p> : null}
    <h2>{presentation.summary.critical > 0 ? (ru ? "Сначала разберите критические проблемы" : "Review critical problems first") : (ru ? "На проверенных страницах критических проблем нет" : "No critical problems were found on the checked pages")}</h2>
    {!compact ? <p>{ru ? "Бесплатный отчёт охватывает только выбранные страницы. Полный аудит проверяет согласованный объём и даёт очередь работ по важности." : "The free report covers only selected pages. A full audit checks the agreed scope and prioritises the work."}</p> : null}
    <div><a className="button button-primary" href={offerHref("seo-audit-200")}>{presentation.nextStep.primary}</a><Link className="button button-secondary" href={repeatHref}>{presentation.nextStep.secondary}</Link></div>
    <small>{presentation.nextStep.note}</small>
  </div>;
}

function repeatAuditHref(locale: Locale, domain?: string): string {
  const path = localizedPath(locale, "free-audit");
  const query = new URLSearchParams({ fresh: "1" });
  if (domain) query.set("url", domain);
  return `${path}?${query.toString()}`;
}

function clientIssueAnchor(issue: AuditClientIssue): string {
  const path = safePublicUrl(issue.url).replace(/^https?:\/\//u, "").replace(/[^a-z0-9]+/giu, "-").replace(/^-|-$/gu, "");
  return `audit-client-issue-${issue.checkId}-${path || "site"}`;
}

function clientIssueKindLabel(kind: AuditClientIssue["kind"], locale: Locale): string {
  if (locale === "en") return kind === "critical" ? "Critical" : kind === "review" ? "Review" : "Optional";
  return kind === "critical" ? "Критично" : kind === "review" ? "Стоит проверить" : "Необязательное улучшение";
}

function RichAuditText({ locale, text }: { locale: Locale; text: string }) {
  const terms = [
    { value: "Google Lighthouse", slug: "lighthouse", hint: locale === "ru" ? "Тест скорости" : "Speed test" },
    { value: "BreadcrumbList", slug: "structured-data", hint: locale === "ru" ? "Цепочка разделов" : "Section trail" },
    { value: "robots.txt", slug: "robots-txt", hint: locale === "ru" ? "Правила обхода" : "Crawler rules" },
    { value: "sitemap.xml", slug: "sitemap", hint: locale === "ru" ? "Список страниц" : "Page list" },
    { value: "Search Console", slug: "indexing", hint: locale === "ru" ? "Кабинет Google" : "Google dashboard" },
    { value: "Яндекс Вебмастера", slug: "indexing", hint: locale === "ru" ? "Кабинет Яндекса" : "Yandex dashboard" },
    { value: "Title", slug: "title", hint: locale === "ru" ? "Название страницы" : "Page title" },
    { value: "H1", slug: "heading-h1", hint: locale === "ru" ? "Главный заголовок" : "Main heading" },
    { value: "LCP", slug: "lcp", hint: locale === "ru" ? "Появление главного блока" : "Main content display" },
    { value: "CLS", slug: "cls", hint: locale === "ru" ? "Сдвиги элементов" : "Layout shifts" },
    { value: "TBT", slug: "tbt", hint: locale === "ru" ? "Блокировка страницы" : "Page blocking time" },
    { value: "CTR", slug: "ctr", hint: locale === "ru" ? "Доля переходов" : "Click-through rate" },
  ];
  const pattern = new RegExp(`(${terms.map((term) => term.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gu");
  return <>{text.split(pattern).map((part, index) => {
    const term = terms.find((item) => item.value === part);
    if (!term) return part;
    const href = `/glossary/${term.slug}`;
    return <a className="audit-term-link" href={href} target="_blank" rel="noreferrer" title={term.hint} key={`${part}-${index}`}>{part}</a>;
  })}</>;
}

function ContractOverview({ locale, headline, counts, engineVersion, coverageStatus }: { locale: Locale; headline: string; counts: PublicAuditStatusCountsView; engineVersion?: string; coverageStatus?: PublicAuditResultView["coverageStatus"] }) {
  const ru = locale === "ru";
  const items: readonly [PublicAuditCheckStatus, string, string][] = [
    ["pass", ru ? "Пройдено" : "Passed", statusCountText(counts.pass ?? 0, "pass", locale)],
    ["warning", ru ? "Есть замечания" : "Warnings", statusCountText(counts.warning ?? 0, "warning", locale)],
    ["fail", ru ? "Найдены ошибки" : "Failed", statusCountText(counts.fail ?? 0, "fail", locale)],
    ["not_applicable", ru ? "Не относится к объекту" : "Not applicable to the object", statusCountText(counts.not_applicable ?? 0, "not_applicable", locale)],
    ["not_run", ru ? "Замер не запускался" : "Not run", statusCountText(counts.not_run ?? 0, "not_run", locale)],
    ["insufficient_data", ru ? "Результат не получен" : "No result", statusCountText(counts.insufficient_data ?? 0, "insufficient_data", locale)],
  ];
  return <section className="audit-contract-overview" aria-labelledby="audit-contract-heading">
    <div>
      <p className="eyebrow">{ru ? "Итог выполненных проверок" : "Completed-check summary"}</p>
      <h2 id="audit-contract-heading">{headline}</h2>
      <p>{coverageStatus === "sample_partial"
        ? (ru ? "Часть выбранных страниц не удалось загрузить. Выводы относятся только к фактически проверенным страницам." : "Some selected pages could not be loaded. Findings apply only to pages that were actually checked.")
        : (ru ? "Выводы относятся к выбранным страницам. Найденные, но не выбранные адреса показаны отдельно." : "Findings apply to the selected pages. Discovered but unselected addresses are listed separately.")}</p>
    </div>
    <div className="audit-status-grid">{items.map(([status, label, text]) => <article key={status} data-status={status}><strong>{counts[status] ?? 0}</strong><span>{label}</span><small>{text}</small></article>)}</div>
    <p className="audit-engine-version"><span>{ru ? "Версия проверки" : "Check version"}</span><code>{engineVersion ?? "—"}</code></p>
  </section>;
}

function InventoryCards({ locale, summary }: { locale: Locale; summary: NonNullable<PublicAuditResultView["inventorySummary"]> }) {
  const ru = locale === "ru";
  return <div className="audit-coverage-cards">
    <article><strong>{summary.objectsFound}</strong><span>{ru ? "Найдено объектов" : "Objects found"}</span></article>
    <article><strong>{summary.htmlFound}</strong><span>{ru ? "HTML-страниц найдено" : "HTML pages found"}</span></article>
    <article><strong>{summary.eligibleHtml}</strong><span>{ru ? "Подходят для выборки" : "Eligible for the sample"}</span></article>
    <article><strong>{summary.selected}</strong><span>{ru ? "Выбрано страниц" : "Pages selected"}</span></article>
    <article><strong>{summary.checked}</strong><span>{ru ? "Подробно проверено страниц" : "Pages checked in detail"}</span></article>
    <article><strong>{summary.representedPageTypes}</strong><span>{ru ? "Типов страниц представлено" : "Page types represented"}</span></article>
  </div>;
}

function ContractFindingsSection({ locale, findings }: { locale: Locale; findings: readonly PublicAuditFindingView[] }) {
  const ru = locale === "ru";
  return <section className="audit-report-section" id="audit-findings" aria-labelledby="audit-findings-heading">
    <header><p className="eyebrow">{ru ? "Подтверждённые находки" : "Confirmed findings"}</p><h2 id="audit-findings-heading">{ru ? "Что исправить в первую очередь" : "What to fix first"}</h2><p>{ru ? "Одинаковая причина на нескольких страницах показана один раз, с числом затронутых адресов и примерами." : "The same cause across several pages is shown once, with the affected count and examples."}</p></header>
    <div className="audit-issue-list">{findings.map((finding) => <article className="audit-issue-card" key={`${finding.checkId}-${finding.whatFound}`}>
      <header><span className={`audit-severity audit-severity--${severityClass(finding.severity)}`}>{severityLabel(finding.severity, locale)}</span><span>{ru ? "Затронуто" : "Affected"}: {finding.affectedCount}</span></header>
      <h3>{finding.title}</h3>
      <Fact label={ru ? "Что нашли" : "What was found"} value={finding.whatFound} />
      <Fact label={ru ? "Почему это важно" : "Why it matters"} value={finding.whyImportant} />
      <Fact label={ru ? "Что сделать" : "What to do"} value={finding.nextStep} />
      <p><abbr title={ru ? "Уверенность классификации показывает, насколько однозначно система определила тип страницы по сохранённым признакам." : "Classification confidence shows how clearly the saved signals identify the page type."}>{ru ? "Уверенность классификации" : "Classification confidence"}</abbr>: {formatConfidence(finding.confidence, locale)}</p>
      {finding.examples.length ? <div className="audit-evidence-lines"><strong>{ru ? "Примеры" : "Examples"}</strong><ul>{finding.examples.map((example, index) => <li key={`${finding.checkId}-${index}`}>{example.observation}{example.url ? <> — <a href={safePublicUrl(example.url)} target="_blank" rel="noreferrer">{example.url}</a></> : null}</li>)}</ul></div> : null}
    </article>)}</div>
  </section>;
}

function TechnicalResourcesSection({ locale, resources }: { locale: Locale; resources: readonly PublicAuditTechnicalResourceView[] }) {
  const ru = locale === "ru";
  return <section className="audit-report-section audit-selected-pages" aria-labelledby="audit-technical-resources-heading">
    <header><p className="eyebrow">{ru ? "Технические файлы" : "Technical resources"}</p><h2 id="audit-technical-resources-heading">{ru ? "Проверены отдельно от HTML-страниц" : "Checked separately from HTML pages"}</h2><p>{ru ? "robots.txt, sitemap и другие технические ответы не занимают места в выборке страниц." : "robots.txt, sitemap, and other technical responses do not use page-sample slots."}</p></header>
    <ul className="audit-selected-list">{resources.map((resource, index) => <li key={`${resource.resourceType}-${resource.finalUrl}`}><span className="mono">{String(index + 1).padStart(2, "0")}</span><div><a href={safePublicUrl(resource.finalUrl)} target="_blank" rel="noreferrer">{resource.finalUrl}</a><p><strong>{technicalResourceLabel(resource.resourceType, locale)}</strong> · {ru ? "код ответа" : "response code"} {resource.statusCode ?? "—"}{resource.contentType ? ` · ${resource.contentType}` : ""}</p></div></li>)}</ul>
  </section>;
}

function ContractChecksSection({ locale, checks, title, description }: { locale: Locale; checks: readonly PublicAuditCheckView[]; title: string; description: string }) {
  const ru = locale === "ru";
  const actionable = checks.filter((check) => check.status === "fail" || check.status === "warning");
  const passed = checks.filter((check) => check.status === "pass");
  const notApplicable = checks.filter((check) => check.status === "not_applicable");
  const unavailable = checks.filter((check) => check.status === "not_run" || check.status === "insufficient_data");
  return <section className="audit-report-section audit-contract-checks">
    <header><p className="eyebrow">{ru ? `Все проверки: ${checks.length}` : `All checks: ${checks.length}`}</p><h2>{title}</h2><p>{description}</p></header>
    {actionable.length ? <div className="audit-check-list audit-check-list--actionable">{actionable.map((check, index) => <AuditCheckCard key={auditCheckKey(check, index)} check={check} locale={locale} />)}</div> : <p className="audit-no-actionable">{ru ? "В выполненных проверках ошибок и замечаний не найдено." : "No errors or findings were recorded in completed checks."}</p>}
    <AuditCheckDisclosureGroup locale={locale} title={ru ? "Успешные проверки" : "Passed checks"} hint={ru ? "Что уже работает — откройте при необходимости" : "What already works — open when needed"} checks={passed} />
    <AuditCheckDisclosureGroup locale={locale} title={ru ? "Не относится к выбранным объектам" : "Not applicable to selected objects"} hint={ru ? "Почему эти проверки не должны запускаться для данного типа страницы или ресурса" : "Why these checks should not run for this page or resource type"} checks={notApplicable} />
    <AuditCheckDisclosureGroup locale={locale} title={ru ? "Замеры без результата" : "Measurements without a result"} hint={ru ? "Что не запускалось, где сайт не ответил и как это проверить отдельно" : "What was not run, where the site did not respond, and how to verify it separately"} checks={unavailable} />
  </section>;
}

function AuditCheckCard({ locale, check }: { locale: Locale; check: PublicAuditCheckView }) {
  const ru = locale === "ru";
  const copy = auditCheckCopy(locale, check);
  return <article className="audit-check-card" data-status={check.status}>
    <header><span className={`audit-check-status audit-check-status--${check.status}`}>{checkStatusLabel(check.status, locale)}</span></header>
    <h3>{copy.title}</h3>
    {check.targetUrl ? <p className="audit-check-target"><strong>{ru ? "Где проверено" : "Checked at"}:</strong> <a href={safePublicUrl(check.targetUrl)} target="_blank" rel="noreferrer">{check.targetUrl}</a></p> : null}
    <Fact label={ru ? "Результат проверки" : "Check result"} value={copy.explanation} />
    <Fact label={ru ? "Что считается нормой" : "Expected state"} value={copy.expected} />
    {check.urlEvidence.length ? <div className="audit-evidence-lines"><strong>{ru ? "Где и что найдено" : "Where and what was found"}</strong><ul>{check.urlEvidence.slice(0, 8).map((evidence) => <li key={`${check.checkId}-${evidence.url}-${evidence.observation}`}>{auditObservationCopy(locale, evidence.observation)}{evidence.url ? <> — <a href={safePublicUrl(evidence.url)} target="_blank" rel="noreferrer">{evidence.url}</a></> : null}</li>)}</ul></div> : null}
    <Fact label={ru ? "Что именно проверено" : "Scope of this check"} value={copy.automationLimit} />
  </article>;
}

function AuditCheckDisclosureGroup({ locale, title, hint, checks }: { locale: Locale; title: string; hint: string; checks: readonly PublicAuditCheckView[] }) {
  if (!checks.length) return null;
  return <details className="audit-check-group">
    <summary><span><strong>{title}</strong><small>{hint}</small></span><b>{checks.length}</b></summary>
    <div className="audit-check-disclosures">{checks.map((check, index) => {
      const copy = auditCheckCopy(locale, check);
      return <details className="audit-check-disclosure" key={auditCheckKey(check, index)}>
        <summary><span className={`audit-check-status audit-check-status--${check.status}`}>{checkStatusLabel(check.status, locale)}</span><strong>{copy.title}</strong></summary>
        <AuditCheckCard locale={locale} check={check} />
      </details>;
    })}</div>
  </details>;
}

function SelectedPagesSection({ locale, pages }: { locale: Locale; pages: NonNullable<PublicAuditResultView["selectedPages"]> }) {
  const ru = locale === "ru";
  return <section className="audit-report-section audit-selected-pages" aria-labelledby="audit-selected-pages-heading">
    <header><p className="eyebrow">{ru ? "Выборка" : "Sample"}</p><h2 id="audit-selected-pages-heading">{ru ? `Почему выбраны эти ${pages.length} страниц` : `Why these ${pages.length} pages were selected`}</h2><p>{ru ? "Проверка сначала берёт разные типы страниц, чтобы не тратить бесплатный лимит на одинаковые шаблоны." : "The checker prioritises different page types so the free limit is not spent on duplicate templates."}</p></header>
    <details className="audit-section-disclosure"><summary>{ru ? `Показать выбранные страницы (${pages.length})` : `Show selected pages (${pages.length})`}</summary><ol className="audit-selected-list">{pages.map((page, index) => <li key={page.url}><span className="mono">{String(index + 1).padStart(2, "0")}</span><div><a href={safePublicUrl(page.url)} target="_blank" rel="noreferrer">{page.url}</a><p><strong>{pageTypeLabel(page.pageType, locale)}</strong> · {selectionReasonLabel(page.selectionReason, locale)}</p>{page.classificationConfidence !== undefined ? <p><abbr title={ru ? "Уверенность классификации показывает, насколько однозначно система определила тип страницы по сохранённым признакам." : "Classification confidence shows how clearly the saved signals identify the page type."}>{ru ? "Уверенность классификации" : "Classification confidence"}</abbr>: {formatConfidence(page.classificationConfidence, locale)}</p> : null}{page.classificationReasons?.length ? <p><strong>{ru ? "Почему выбрана" : "Why selected"}:</strong> {page.classificationReasons.join("; ")}</p> : null}</div></li>)}</ol></details>
  </section>;
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
    ? "Мы проверяем данные открытых страниц сайта. Фактическое присутствие страницы в поиске подтверждается только в Яндекс Вебмастере или Google Search Console."
    : "We check data from public website pages. Actual search-engine inclusion can only be confirmed in Yandex Webmaster or Google Search Console.");

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

function Fact({ label, value, locale }: { label: string; value: string; locale?: Locale }) { return <div className="audit-fact"><strong>{label}</strong><p>{locale ? <RichAuditText locale={locale} text={value} /> : value}</p></div>; }

function CheckedPagesSection({ locale, pages }: { locale: Locale; pages: readonly PublicAuditPageView[] }) {
  const ru = locale === "ru";
  return (
    <section className="audit-report-section" id="audit-pages" aria-labelledby="audit-pages-heading">
      <header><p className="eyebrow">{ru ? "Факты по страницам" : "Page-level facts"}</p><h2 id="audit-pages-heading">{ru ? "Факты по каждой проверенной странице" : "Facts for every checked page"}</h2><p>{ru ? `Подробно проверено: ${pages.length}. Для каждого адреса показаны только признаки, полученные во время этой проверки.` : `Checked in detail: ${pages.length}. Each page lists only the signals captured during this check.`}</p></header>
      <div className="audit-page-cards">
        {pages.map((page, index) => {
          const findings = auditPageFindings(locale, page);
          return (
            <details className="audit-page-card" key={page.url ?? index}>
              <summary>
                <span className="mono">{String(index + 1).padStart(2, "0")}</span>
                <span className="audit-page-summary-copy"><strong>{page.url ?? "—"}</strong><small>{findings.length ? (ru ? `Замечаний: ${findings.length}` : `Findings: ${findings.length}`) : (ru ? "Замечаний нет" : "No findings")}</small></span>
                <span className="audit-page-summary-action">{ru ? "Подробнее" : "Details"}</span>
              </summary>
              <div className="audit-page-card__content">
                <a className="audit-page-source-link" href={safePublicUrl(page.url)} target="_blank" rel="noreferrer">{ru ? "Открыть проверенную страницу ↗" : "Open the checked page ↗"}</a>
                {page.finalUrl && page.finalUrl !== page.url ? <p className="audit-page-final"><strong>{ru ? "После перенаправления:" : "After redirects:"}</strong> {page.finalUrl}</p> : null}
                <dl className="audit-page-signals">
                  <div><dt>{ru ? "Код ответа страницы" : "Page response code"}</dt><dd>{pageHttpStatus(page) ?? "—"}</dd></div>
                  <div><dt>{ru ? "Доступность для поиска" : "Search accessibility"}</dt><dd>{indexabilityLabel(page, locale)}</dd></div>
                  <div><dt>{ru ? "Заголовок для выдачи (title)" : "Search-result title"}</dt><dd>{signalText(page.title)}</dd></div>
                  <div><dt>{ru ? "Описание для выдачи (meta description)" : "Search-result description"}</dt><dd>{signalText(page.description)}</dd></div>
                  <div><dt>{ru ? "Главный заголовок (H1)" : "Main heading (H1)"}</dt><dd>{h1Text(page)}</dd></div>
                  <div><dt>{ru ? "Основной адрес (canonical)" : "Preferred address (canonical)"}</dt><dd>{canonicalText(page, locale)}</dd></div>
                  <div><dt>{ru ? "В файле страниц (sitemap.xml)" : "In the page-list file (sitemap.xml)"}</dt><dd>{sitemapText(page, locale)}</dd></div>
                  <div><dt>{ru ? "Ссылки между проверенными страницами" : "Links between checked pages"}</dt><dd>{internalLinksText(page, locale)}</dd></div>
                </dl>
                <div className={`audit-page-findings${findings.length ? "" : " audit-page-findings--clear"}`}>
                  <strong>{findings.length ? (ru ? "Замечания по этой странице" : "Findings for this page") : (ru ? "Что проверено" : "What was checked")}</strong>
                  {findings.length ? <ul>{findings.map((finding) => <li key={finding}>{finding}</li>)}</ul> : <p>{ru ? "Страница открылась без ошибки; основные заголовки и адрес страницы заданы. В проверенных признаках замечаний нет." : "The page opened without an error; key headings and the preferred address are present. No findings were detected in the checked signals."}</p>}
                </div>
              </div>
            </details>
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
  if ((result?.contractVersion === 2 || result?.contractVersion === 3) && result.resultSummary) {
    output.push(result.resultSummary.headline);
    output.push(ru
      ? `Выполнено проверок: ${result.resultSummary.completedChecks} из ${result.resultSummary.totalChecks}. Ошибок: ${result.resultSummary.fail ?? 0}; замечаний: ${result.resultSummary.warning ?? 0}; не относятся к объекту: ${result.resultSummary.not_applicable ?? 0}; не запускались: ${result.resultSummary.not_run ?? 0}; данных не хватило: ${result.resultSummary.insufficient_data ?? 0}.`
      : `Checks completed: ${result.resultSummary.completedChecks} of ${result.resultSummary.totalChecks}. Failed: ${result.resultSummary.fail ?? 0}; warnings: ${result.resultSummary.warning ?? 0}; not applicable: ${result.resultSummary.not_applicable ?? 0}; not run: ${result.resultSummary.not_run ?? 0}; no result: ${result.resultSummary.insufficient_data ?? 0}.`);
    return output;
  }
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
  const status = page.http?.status ?? page.status ?? page.statusCode;
  return typeof status === "number" && Number.isFinite(status) ? status : null;
}

function signalText(value: PublicAuditPageView["title"]): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "—";
  return value.value?.trim() || "—";
}

function internalLinksText(page: PublicAuditPageView, locale: Locale): string {
  const outgoing = page.internalLinks?.outgoing;
  const incoming = page.internalLinks?.incomingFromCheckedPages;
  if (outgoing === undefined && incoming === undefined) return "—";
  return locale === "ru"
    ? `на страницу: ${incoming ?? "—"}; со страницы: ${outgoing ?? "—"}`
    : `to this page: ${incoming ?? "—"}; from this page: ${outgoing ?? "—"}`;
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
function checkStatusLabel(status: PublicAuditCheckStatus, locale: Locale): string { const labels = locale === "ru" ? { pass: "Пройдено", warning: "Есть замечание", fail: "Ошибка", not_applicable: "Не относится к объекту", not_run: "Замер не запускался", insufficient_data: "Результат не получен" } : { pass: "Passed", warning: "Warning", fail: "Failed", not_applicable: "Not applicable to the object", not_run: "Not run", insufficient_data: "No result" }; return labels[status]; }
function statusCountText(count: number, status: PublicAuditCheckStatus, locale: Locale): string {
  if (locale === "en") return `${count} ${status === "pass" ? "passed" : status === "warning" ? "warnings" : status === "fail" ? "failed" : status === "not_applicable" ? "not applicable" : status === "not_run" ? "not run" : "without enough data"}`;
  if (status === "fail") return `${count} ${russianPlural(count, "ошибка", "ошибки", "ошибок")}`;
  if (status === "warning") return `${count} ${russianPlural(count, "замечание", "замечания", "замечаний")}`;
  if (status === "pass") return `${count} ${russianPlural(count, "проверка пройдена", "проверки пройдены", "проверок пройдено")}`;
  if (status === "not_applicable") return `${count} ${russianPlural(count, "проверка не относится к объекту", "проверки не относятся к объекту", "проверок не относятся к объекту")}`;
  if (status === "not_run") return `${count} ${russianPlural(count, "замер не запускался", "замера не запускались", "замеров не запускалось")}`;
  return `${count} ${russianPlural(count, "результат не получен", "результата не получено", "результатов не получено")}`;
}
function russianPlural(value: number, one: string, few: string, many: string): string { const mod100 = Math.abs(value) % 100; const mod10 = mod100 % 10; if (mod100 >= 11 && mod100 <= 19) return many; if (mod10 === 1) return one; if (mod10 >= 2 && mod10 <= 4) return few; return many; }
function indexabilityLabel(page: PublicAuditPageView, locale: Locale) { const status = pageHttpStatus(page); if (page.indexability === "indexable") return locale === "ru" ? "поисковый робот может открыть страницу" : "a search crawler can open the page"; if (page.indexability === "blocked") return locale === "ru" ? "найден технический запрет для поискового робота" : "a technical crawler block was found"; if (page.noindex) return locale === "ru" ? "есть команда noindex — запрет показывать страницу в поиске" : "a noindex instruction blocks the page from search results"; if (status !== null && (status < 200 || status >= 300)) return `${locale === "ru" ? "страница открылась с ошибкой; код ответа" : "the page returned an error; response code"} ${status}`; if (status !== null && nestedCanonicalValid(page) !== false) return locale === "ru" ? "поисковый робот может открыть страницу" : "a search crawler can open the page"; return locale === "ru" ? "результат не получен" : "no result"; }
function safePublicUrl(value?: string) { try { const url = new URL(value ?? ""); return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "#"; } catch { return "#"; } }

function normalizeAuditCheck(check: PublicAuditCheckInputView): PublicAuditCheckView {
  return {
    checkId: check.checkId,
    checkVersion: check.checkVersion ?? check.version ?? 1,
    category: check.category,
    title: check.title,
    status: check.status,
    targetUrl: check.targetUrl,
    value: check.value ?? null,
    expected: check.expected ?? check.publicExplanation ?? "",
    severity: check.severity ?? "info",
    urlEvidence: check.urlEvidence ?? check.evidence ?? [],
    explanation: check.explanation ?? check.reason ?? "",
    automationLimit: check.automationLimit,
  };
}

function auditCheckKey(check: PublicAuditCheckView, index: number): string {
  return `${check.checkId}:${check.targetUrl ?? "site"}:${check.status}:${index}`;
}

function formatConfidence(value: number, locale: Locale): string {
  const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-GB", { style: "percent", maximumFractionDigits: 0 }).format(percent / 100);
}

function selectionReasonLabel(value: string, locale: Locale): string {
  const labels: Readonly<Record<string, readonly [string, string]>> = {
    homepage: ["главная страница", "home page"],
    primary_commercial: ["основная коммерческая страница", "primary commercial page"],
    commercial_different_template: ["другой коммерческий шаблон", "different commercial template"],
    conversion_support: ["страница, ведущая к обращению", "conversion-supporting page"],
    category_hub: ["страница раздела", "section hub"],
    detail_page: ["детальная страница", "detail page"],
    case_page: ["кейс", "case page"],
    article_page: ["статья", "article page"],
    unique_template: ["отдельный шаблон", "distinct template"],
    additional_important: ["дополнительная значимая страница", "additional important page"],
    alternate_locale_control: ["контроль другой языковой версии", "alternate-language control"],
    primary_locale_type_missing: ["основная локаль этого типа страницы не обнаружена", "no primary-language page of this type was found"],
    user_target: ["адрес указан пользователем", "user-provided URL"],
    priority_url: ["приоритетный адрес", "priority URL"],
  };
  return labels[value]?.[locale === "ru" ? 0 : 1] ?? value;
}

function pageTypeLabel(value: string, locale: Locale): string {
  const labels: Readonly<Record<string, readonly [string, string]>> = {
    homepage: ["Главная", "Home page"], service: ["Услуга", "Service"], category: ["Раздел", "Category"], product: ["Карточка товара", "Product"], article: ["Статья", "Article"], case: ["Кейс", "Case"], pricing: ["Цены", "Pricing"], contact: ["Контакты", "Contact"], legal: ["Правовая информация", "Legal"], auth: ["Вход", "Sign-in"], account: ["Личный кабинет", "Account"], cart: ["Корзина", "Cart"], internal_search: ["Поиск по сайту", "Site search"], filter: ["Фильтр", "Filter"], utility: ["Служебная страница", "Utility page"], commercial: ["Коммерческая страница", "Commercial page"], conversion_support: ["Страница обращения", "Conversion page"], hub: ["Страница раздела", "Hub"], detail: ["Детальная страница", "Detail page"], unique: ["Отдельный шаблон", "Distinct template"], alternate_locale: ["Другая языковая версия", "Alternate-language page"], unknown: ["Тип не определён", "Unknown type"],
  };
  return labels[value]?.[locale === "ru" ? 0 : 1] ?? value;
}

function technicalResourceLabel(value: string, locale: Locale): string {
  const labels: Readonly<Record<string, readonly [string, string]>> = {
    robots: ["Правила обхода robots.txt", "robots.txt crawler rules"], sitemap: ["Карта сайта sitemap.xml", "sitemap.xml"], xml_feed: ["XML-фид", "XML feed"], document: ["Документ", "Document"], image: ["Изображение", "Image"], script: ["Скрипт", "Script"], stylesheet: ["Таблица стилей", "Stylesheet"], api: ["Ответ API", "API response"], unknown: ["Неизвестный ресурс", "Unknown resource"],
  };
  return labels[value]?.[locale === "ru" ? 0 : 1] ?? value;
}
