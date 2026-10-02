"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";
import { PUBLIC_AUDIT_PAGE_LIMIT } from "../../config/public-audit";
import {
  auditStreamDirective,
  decodeAuditSnapshot,
  decodeAuditSnapshotJson,
  mergeAuditSnapshot,
  nextReconnectDelay,
  shouldCloseStream,
  shouldPoll,
  type AuditProgressSnapshot,
} from "../../lib/audit/progress-state";
import { withAuditRestore } from "../../lib/audit/restore-url";
import { ThemeToggle } from "../layout/ThemeToggle";
import { AuditLiveOverlay } from "../forms/AuditLiveProgress";
import { Logo } from "../brand/Logo";
import { AuditResultReport, type PublicAuditCheckStatus, type PublicAuditCtaOfferId, type PublicAuditResultView } from "./AuditResultReport";

type AuditState = Omit<AuditProgressSnapshot, "result"> & { result?: PublicResult | null };
type PublicResult = PublicAuditResultView;

export function AuditProgressPage({
  locale,
  token,
  restore,
  initialAudit,
}: {
  locale: Locale;
  token: string;
  restore?: string;
  initialAudit?: AuditProgressSnapshot;
}) {
  const ru = locale === "ru";
  const [audit, setAudit] = useState<AuditState | null>(() => (
    initialAudit ? decodeAuditSnapshot(initialAudit) as AuditState | null : null
  ));
  const [connection, setConnection] = useState<"live" | "polling">("live");
  const [pollAttempt, setPollAttempt] = useState(0);
  const [copied, setCopied] = useState(false);
  const [hasShownRunning, setHasShownRunning] = useState(false);
  const [completionRevealed, setCompletionRevealed] = useState(false);
  const [loadError, setLoadError] = useState<"not-found" | "unavailable" | null>(null);
  const resultEndpoint = useMemo(() => withAuditRestore(`/api/audits/${encodeURIComponent(token)}`, restore), [restore, token]);
  const eventsEndpoint = useMemo(() => withAuditRestore(`/api/audits/${encodeURIComponent(token)}/events`, restore), [restore, token]);
  const activeRequest = useRef<{ token: string; controller: AbortController; promise: Promise<boolean> } | null>(null);
  const load = useCallback(() => {
    if (activeRequest.current?.token === token) return activeRequest.current.promise;
    activeRequest.current?.controller.abort();
    const controller = new AbortController();
    const promise = (async () => {
      try {
        const response = await fetch(resultEndpoint, { cache: "no-store", signal: controller.signal });
        if (!response.ok) {
          setConnection("polling");
          if (response.status === 400 || response.status === 404) setAudit(null);
          setLoadError(response.status === 400 || response.status === 404 ? "not-found" : "unavailable");
          return false;
        }
        const next = decodeAuditSnapshot(await response.json()) as AuditState | null;
        if (!next) {
          setConnection("polling");
          setLoadError("unavailable");
          return false;
        }
        setLoadError(null);
        setAudit((current) => mergeAuditSnapshot(current, next));
        return true;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return false;
        setConnection("polling");
        setLoadError((current) => current ?? "unavailable");
        return false;
      } finally {
        if (activeRequest.current?.controller === controller) activeRequest.current = null;
      }
    })();
    activeRequest.current = { token, controller, promise };
    return promise;
  }, [resultEndpoint, token]);
  useEffect(() => {
    void load();
    const source = new EventSource(eventsEndpoint);
    source.onmessage = (event) => {
      const next = decodeAuditSnapshotJson(event.data) as AuditState | null;
      if (!next) return;
      setLoadError(null);
      setAudit((current) => mergeAuditSnapshot(current, next));
      if (shouldCloseStream(next)) {
        setConnection("polling");
        setPollAttempt(0);
        source.close();
        void load();
      }
    };
    source.addEventListener("done", () => {
      const directive = auditStreamDirective("done");
      setConnection("polling");
      setPollAttempt(0);
      if (directive.close) source.close();
      if (directive.refreshSnapshot) void load();
    });
    source.addEventListener("reconnect", () => {
      const directive = auditStreamDirective("reconnect");
      setConnection("polling");
      setPollAttempt(0);
      if (directive.close) source.close();
    });
    source.onerror = () => {
      const directive = auditStreamDirective("error");
      setConnection("polling");
      setPollAttempt(0);
      if (directive.close) source.close();
    };
    return () => {
      source.close();
      activeRequest.current?.controller.abort();
    };
  }, [eventsEndpoint, load]);
  useEffect(() => {
    if (!shouldPoll(connection, audit, loadError)) return;
    const timeout = window.setTimeout(() => {
      void load().then((loaded) => setPollAttempt((attempt) => loaded ? 0 : attempt + 1));
    }, nextReconnectDelay(pollAttempt));
    return () => window.clearTimeout(timeout);
  }, [audit, connection, load, loadError, pollAttempt]);
  const auditIsDone = audit?.status === "completed" || audit?.status === "partial";
  useEffect(() => {
    if (!auditIsDone && audit?.status !== "failed") return;
    try {
      const active = JSON.parse(sessionStorage.getItem("kileni:active-audit:v1") ?? "null") as { token?: string } | null;
      // A viewed result must not reopen when the visitor returns to the form.
      // Keep a different audit intact if it is still running in another tab.
      if (active?.token === token) sessionStorage.removeItem("kileni:active-audit:v1");
    } catch { /* The report also works when browser storage is unavailable. */ }
  }, [auditIsDone, audit?.status, token]);
  useEffect(() => {
    if (audit && !auditIsDone && audit.status !== "failed") setHasShownRunning(true);
  }, [audit, auditIsDone]);
  const holdCompletedScene = Boolean(auditIsDone && audit?.result && hasShownRunning && !completionRevealed);
  useEffect(() => {
    if (!holdCompletedScene) return;
    const timeout = window.setTimeout(() => setCompletionRevealed(true), 540);
    return () => window.clearTimeout(timeout);
  }, [holdCompletedScene]);
  if (loadError && !audit) return <main id="main-content" className="audit-result-shell"><AuditThemeControl locale={locale}/><section className="audit-failed"><span>!</span><h1>{loadError === "not-found" ? (ru ? "Проверка не найдена" : "Audit not found") : (ru ? "Не удалось загрузить проверку" : "Could not load the audit")}</h1><p>{loadError === "not-found" ? (ru ? "Ссылка неверна или срок хранения результата закончился." : "The link is invalid or the result has expired.") : (ru ? "Проверьте соединение и попробуйте ещё раз." : "Check your connection and try again.")}</p>{loadError === "not-found" ? <Link className="button button-light" href={localizedPath(locale, "free-audit")}>{ru ? "Запустить новую проверку" : "Start a new check"}</Link> : <button className="button button-light" type="button" onClick={() => void load()}>{ru ? "Попробовать ещё раз" : "Try again"}</button>}</section></main>;
  if (!audit) return <main id="main-content" className="audit-result-shell"><AuditLiveOverlay locale={locale} snapshot={{ status: "connecting", pagesChecked: 0, pagesDiscovered: 0, pageLimit: PUBLIC_AUDIT_PAGE_LIMIT }}/></main>;
  const done = audit.status === "completed" || audit.status === "partial"; const result = audit.result;
  if (holdCompletedScene) return <main id="main-content" className="audit-result-shell"><AuditLiveOverlay locale={locale} domain={audit.normalizedDomain} snapshot={audit}/></main>;
  if (!done && audit.status !== "failed") return <main id="main-content" className="audit-result-shell"><AuditLiveOverlay locale={locale} domain={audit.normalizedDomain} snapshot={audit}/></main>;
  const completedChecked = Math.min(PUBLIC_AUDIT_PAGE_LIMIT, result?.pagesChecked ?? audit.pagesChecked);
  const completedDiscovered = result?.pagesDiscovered ?? audit.pagesDiscovered;
  const completedSelected = result?.pagesSelected ?? audit.pagesSelected ?? (typeof result?.coverage === "object" ? result.coverage.plannedPages : undefined) ?? Math.min(completedDiscovered, PUBLIC_AUDIT_PAGE_LIMIT);
  const completedNotChecked = result?.pagesNotCheckedTotal ?? result?.discoveredNotCheckedCount ?? Math.max(0, completedDiscovered - completedChecked);
  const isContractV4 = result?.resultVersion === 4 && result.contractVersion === 3;
  const isContractV2 = result?.contractVersion === 2 && (result.resultVersion === undefined || result.resultVersion === 3);
  const isCurrentContract = isContractV2 || isContractV4;
  const isLegacyResult = Boolean(result && !isCurrentContract);
  const hasActionableFindings = isCurrentContract
    ? Boolean(result?.findings?.length || result?.checks?.some((check) => check.status === "fail" || check.status === "warning"))
    : Boolean((result?.issueGroups?.length ?? result?.issues?.length ?? 0) > 0);
  const mainFindings = auditMainFindings(result, locale, completedChecked, completedSelected, completedNotChecked);
  const reportHref = withAuditRestore(`/api/audits/${encodeURIComponent(token)}/report.pdf`, restore);
  return <main id="main-content" className="audit-result-shell"><header className="audit-result-header"><div className="audit-result-logo"><Logo locale={locale}/></div><div className="audit-result-header__actions"><ThemeToggle locale={locale}/><span className="mono">{done ? (ru ? "Снимок завершённой проверки" : "Completed audit snapshot") : (ru ? "Обновляется автоматически" : "Updates automatically")}</span></div></header>
    {audit.status === "failed" && <section className="audit-failed"><span>!</span><h1>{ru ? "Отчёт не удалось подготовить" : "The report could not be prepared"}</h1><p>{ru ? "Это технический сбой и не означает, что с сайтом что-то не так. Повторите проверку — обычно это помогает." : "This is a technical failure and does not mean that something is wrong with the website. Run the check again — this usually resolves it."}</p><div className="audit-failed__actions"><Link className="button button-light" href={freeAuditHref(locale, audit.normalizedDomain)}>{ru ? "Повторить проверку" : "Run the check again"}</Link><Link className="text-link light" href={localizedPath(locale, "contacts")}>{ru ? "Запросить ручную проверку" : "Request a manual review"}</Link></div></section>}
    {done && (
      <section className={`audit-complete${isContractV4 ? " audit-complete--client" : ""}`}>
        {!isContractV4 ? <div className="audit-summary-panel">
          <p className="eyebrow light">{ru ? "Результат бесплатной проверки" : "Free check result"}</p>
          <h1>{isLegacyResult
            ? (ru ? "Сохранённый результат прежней версии" : "Saved result from an earlier version")
            : result?.resultSummary?.headline ?? result?.summary?.headline ?? (ru ? "Результат готов" : "Result ready")}</h1>
          <a className="audit-result-domain" href={result?.target ?? result?.finalUrl ?? (audit.normalizedDomain ? `https://${audit.normalizedDomain}` : "#")} target="_blank" rel="noreferrer">{audit.normalizedDomain ?? result?.target ?? result?.finalUrl ?? "—"}<span aria-hidden="true">↗</span></a>
          <dl className="audit-completion-metrics">
            <div><dt>{ru ? "Найдено адресов" : "Addresses found"}</dt><dd>{completedDiscovered}</dd></div>
            <div><dt>{ru ? "Выбрано в проверку" : "Selected"}</dt><dd>{completedSelected}</dd></div>
            <div><dt>{ru ? "Подробно проверено" : "Checked in detail"}</dt><dd>{completedChecked}</dd></div>
            <div><dt>{ru ? "Не вошло в выборку" : "Outside the sample"}</dt><dd>{completedNotChecked}</dd></div>
          </dl>
          {isCurrentContract && result?.resultSummary ? <ul className="audit-inline-statuses" aria-label={ru ? "Статусы выполненных проверок" : "Completed check statuses"}>
            <li data-status="fail"><strong>{result.resultSummary.fail ?? 0}</strong><span>{ru ? "ошибок" : "failed"}</span></li>
            <li data-status="warning"><strong>{result.resultSummary.warning ?? 0}</strong><span>{ru ? "замечаний" : "warnings"}</span></li>
            <li data-status="pass"><strong>{result.resultSummary.pass ?? 0}</strong><span>{ru ? "пройдено" : "passed"}</span></li>
            <li data-status="not_applicable"><strong>{result.resultSummary.not_applicable ?? 0}</strong><span>{ru ? "не относится к объекту" : "not applicable to the object"}</span></li>
            <li data-status="not_run"><strong>{result.resultSummary.not_run ?? 0}</strong><span>{ru ? "не запускалось" : "not run"}</span></li>
            <li data-status="insufficient_data"><strong>{result.resultSummary.insufficient_data ?? 0}</strong><span>{ru ? "не хватило данных" : "not enough data"}</span></li>
          </ul> : null}
          <section className="audit-summary-findings" aria-labelledby="audit-summary-findings-heading">
            <h2 id="audit-summary-findings-heading">{ru ? "Главное по результату" : "Key findings"}</h2>
            <ol>{mainFindings.map((finding) => <li key={`${finding.status}-${finding.title}`} data-status={finding.status}><span aria-hidden="true"/><div><strong>{finding.title}</strong>{finding.detail ? <small>{finding.detail}</small> : null}</div></li>)}</ol>
          </section>
          <p className="result-meta">{formatAuditDate(audit.completedAt ?? audit.createdAt, locale)} · {audit.consentRecorded ? (ru ? "согласие зафиксировано" : "consent recorded") : ""}</p>
          {(result?.coverageStatus === "sample_partial" || audit.coverageStatus === "sample_partial") && <span className="partial-badge">{ru ? "Не все выбранные страницы удалось проверить" : "Not every selected page could be checked"}</span>}
          <small>{isCurrentContract
            ? (ru ? "Это факты по выбранным публичным страницам. Проверки, которые не запускались или не получили достаточно данных, отмечены отдельно и не считаются успешными." : "These are facts for selected public pages. Checks that did not run or lacked data are marked separately and are not counted as passed.")
            : (ru ? "Это сохранённый результат прежней версии. Мы не показываем старый общий балл, потому что без полного набора фактов его нельзя проверить повторно." : "This is a saved result from an earlier version. Its old aggregate score is hidden because it cannot be reproduced without the full evidence set.")}</small>
          {isCurrentContract ? <small className="audit-engine-line">{ru ? "Версия проверки" : "Check version"}: {result?.engineVersion ?? "—"}</small> : null}
          <small className="audit-snapshot-note">{ru ? "Результат фиксирует состояние сайта на дату проверки и не меняется после последующих обновлений сайта." : "This result records the website state at the audit date and does not change after later website updates."}</small>
          <div className="audit-summary-actions">
            {hasActionableFindings ? <>
              <Link className="button button-primary" href={briefOfferHref(locale, audit.normalizedDomain, "seo-audit-200", token)}>{ru ? "Заказать технический аудит" : "Request a technical audit"}</Link>
              <Link className="button button-secondary" href={briefOfferHref(locale, audit.normalizedDomain, "seo-audit-implementation", token)}>{ru ? "Обсудить исправления" : "Discuss fixes"}</Link>
            </> : <>
              {completedNotChecked > 0 ? <Link className="button button-primary" href={briefOfferHref(locale, audit.normalizedDomain, "seo-audit-200", token)}>{ru ? "Проверить остальные страницы" : "Check the remaining pages"}</Link> : null}
              <Link className="button button-secondary" href={briefOfferHref(locale, audit.normalizedDomain, "seo-audit-200", token)}>{ru ? "Заказать технический аудит" : "Request a technical audit"}</Link>
            </>}
            <Link className="button button-secondary audit-rerun-link" href={freeAuditHref(locale, audit.normalizedDomain)}>{ru ? "Проверить сайт ещё раз" : "Check the website again"}</Link>
          </div>
        </div> : null}
        <AuditResultReport
          locale={locale}
          result={result}
          domain={audit.normalizedDomain}
          pagesChecked={completedChecked}
          pagesDiscovered={completedDiscovered}
          reportHref={reportHref}
          copied={copied}
          onCopy={() => { void copyCurrentUrl().then(() => setCopied(true)); }}
          offerHref={(offer) => briefOfferHref(locale, audit.normalizedDomain, offer, token)}
        />
      </section>
    )}
  </main>;
}

function AuditThemeControl({ locale }: { locale: Locale }) {
  return <div className="audit-floating-theme"><ThemeToggle locale={locale}/></div>;
}
function formatAuditDate(value: number | null | undefined, locale: Locale): string { return value ? new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Moscow" }).format(value) : ""; }
async function copyCurrentUrl(): Promise<void> { try { await navigator.clipboard.writeText(window.location.href); } catch { const field = document.createElement("textarea"); field.value = window.location.href; field.style.position = "fixed"; field.style.opacity = "0"; document.body.append(field); field.select(); document.execCommand("copy"); field.remove(); } }
export function briefOfferHref(locale: Locale, domain: string | undefined, offer: PublicAuditCtaOfferId, auditToken: string): string {
  const query = new URLSearchParams({ offer });
  if (domain) query.set("domain", domain);
  query.set("audit", auditToken);
  return `${localizedPath(locale, "brief")}?${query.toString()}`;
}

function freeAuditHref(locale: Locale, domain?: string) {
  const path = localizedPath(locale, "free-audit");
  const query = new URLSearchParams({ fresh: "1" });
  if (domain) query.set("url", domain);
  return `${path}?${query.toString()}`;
}

type AuditMainFinding = {
  readonly status: PublicAuditCheckStatus | "info";
  readonly title: string;
  readonly detail?: string;
};

export function auditMainFindings(
  result: PublicResult | null | undefined,
  locale: Locale,
  pagesChecked: number,
  pagesSelected: number,
  pagesNotChecked: number,
): readonly AuditMainFinding[] {
  const ru = locale === "ru";
  const points: AuditMainFinding[] = [];
  const add = (point: AuditMainFinding) => {
    if (!points.some((current) => current.title === point.title)) points.push(point);
  };

  if (result?.resultVersion === 4 && result.contractVersion === 3) {
    for (const finding of result.findings ?? []) {
      add({
        status: finding.severity === "critical" || finding.severity === "high" ? "fail" : "warning",
        title: finding.title,
        detail: finding.whatFound,
      });
      if (points.length === 3) break;
    }

    if (points.length < 3) {
      for (const check of result.checks ?? []) {
        if (check.status !== "pass") continue;
        add({ status: "pass", title: check.title, detail: check.reason ?? check.explanation });
        if (points.length === 3) break;
      }
    }
  } else if (result?.contractVersion === 2 && (result.resultVersion === undefined || result.resultVersion === 3)) {
    for (const check of result.checks ?? []) {
      if (check.status !== "fail" && check.status !== "warning") continue;
      add({ status: check.status, title: check.title, detail: check.explanation ?? check.reason });
      if (points.length === 3) break;
    }

    if (points.length < 3) {
      for (const check of result.checks ?? []) {
        if (check.status !== "pass") continue;
        add({ status: "pass", title: check.title, detail: check.explanation ?? check.reason });
        if (points.length === 3) break;
      }
    }

    if (points.length < 3) {
      for (const check of result.checks ?? []) {
        if (check.status !== "not_run" && check.status !== "insufficient_data") continue;
        add({ status: check.status, title: check.title, detail: check.explanation ?? check.reason });
        if (points.length === 3) break;
      }
    }
  } else {
    for (const text of [...(result?.summary?.risks ?? []), ...(result?.summary?.strengths ?? [])]) {
      add({ status: "info", title: text });
      if (points.length === 3) break;
    }
  }

  add({
    status: result?.coverageStatus === "sample_partial" ? "warning" : "info",
    title: result?.coverageStatus === "sample_partial"
      ? (ru ? `Удалось проверить ${pagesChecked} из ${pagesSelected} выбранных страниц` : `${pagesChecked} of ${pagesSelected} selected pages were checked`)
      : (ru ? `Проверено ${pagesChecked} выбранных страниц` : `${pagesChecked} selected pages were checked`),
    detail: ru ? "Все выводы ниже относятся только к этим страницам." : "All findings below apply only to these pages.",
  });

  if (pagesNotChecked > 0) add({
    status: "info",
    title: ru ? `${pagesNotChecked} найденных адресов не вошли в бесплатную выборку` : `${pagesNotChecked} discovered addresses were outside the free sample`,
    detail: ru ? "По ним проверка не делает выводов и показывает их отдельно." : "The checker makes no claims about them and lists them separately.",
  });

  add({
    status: "info",
    title: ru ? "Наличие страниц в поиске требует отдельного подтверждения" : "Actual search inclusion needs separate confirmation",
    detail: ru ? "Без доступа к Яндекс Вебмастеру или Google Search Console можно проверить только данные открытых страниц сайта." : "Without Yandex Webmaster or Google Search Console, only data from public website pages can be checked.",
  });

  return points.slice(0, 5);
}
