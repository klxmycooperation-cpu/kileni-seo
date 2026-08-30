"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";
import { PUBLIC_AUDIT_PAGE_LIMIT } from "../../config/public-audit";
import { auditNeedsResult, mergeAuditSnapshot } from "../../lib/audit/progress-state";
import { withAuditRestore } from "../../lib/audit/restore-url";
import { ThemeToggle } from "../layout/ThemeToggle";
import { AuditLiveProgress } from "../forms/AuditLiveProgress";
import { Logo } from "../brand/Logo";
import { AuditResultReport, type PublicAuditCtaOfferId, type PublicAuditResultView } from "./AuditResultReport";

type AuditState = { status: string; pagesChecked: number; pagesDiscovered: number; pageLimit: number; overallScore?: number | null; grade?: string | null; partial?: boolean; errorSummary?: string | null; result?: PublicResult | null; normalizedDomain?: string; createdAt?: number; completedAt?: number | null; consentRecorded?: boolean };
type PublicResult = PublicAuditResultView;
const terminal = new Set(["completed", "partial", "failed"]);

export function AuditProgressPage({ locale, token, restore }: { locale: Locale; token: string; restore?: string }) {
  const ru = locale === "ru";
  const [audit, setAudit] = useState<AuditState | null>(null); const [connection, setConnection] = useState<"live" | "polling">("live"); const [copied, setCopied] = useState(false);
  const [loadError, setLoadError] = useState<"not-found" | "unavailable" | null>(null);
  const resultEndpoint = useMemo(() => withAuditRestore(`/api/audits/${encodeURIComponent(token)}`, restore), [restore, token]);
  const eventsEndpoint = useMemo(() => withAuditRestore(`/api/audits/${encodeURIComponent(token)}/events`, restore), [restore, token]);
  const activeRequest = useRef<{ token: string; controller: AbortController; promise: Promise<void> } | null>(null);
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
          return;
        }
        const next = await response.json() as AuditState;
        setLoadError(null);
        setAudit((current) => mergeAuditSnapshot(current, next));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setConnection("polling");
        setLoadError((current) => current ?? "unavailable");
      } finally {
        if (activeRequest.current?.controller === controller) activeRequest.current = null;
      }
    })();
    activeRequest.current = { token, controller, promise };
    return promise;
  }, [resultEndpoint, token]);
  useEffect(() => {
    void load(); const source = new EventSource(eventsEndpoint); source.onmessage = (event) => { try { const data = JSON.parse(event.data) as Partial<AuditState>; setLoadError(null); setAudit((current) => mergeAuditSnapshot(current, { ...(current ?? { status: "queued", pagesChecked: 0, pagesDiscovered: 0, pageLimit: PUBLIC_AUDIT_PAGE_LIMIT }), ...data } as AuditState)); if (data.status && terminal.has(data.status)) { setConnection("polling"); source.close(); void load(); } } catch {} }; source.onerror = () => { setConnection("polling"); source.close(); }; return () => { source.close(); activeRequest.current?.controller.abort(); };
  }, [eventsEndpoint, load]);
  useEffect(() => { if (connection !== "polling" || loadError === "not-found" || (audit?.status && terminal.has(audit.status) && !auditNeedsResult(audit))) return; const interval = window.setInterval(() => void load(), 3000); return () => window.clearInterval(interval); }, [audit, connection, load, loadError]);
  if (loadError && !audit) return <main id="main-content" className="audit-result-shell"><AuditThemeControl locale={locale}/><section className="audit-failed"><span>!</span><h1>{loadError === "not-found" ? (ru ? "Проверка не найдена" : "Audit not found") : (ru ? "Не удалось загрузить проверку" : "Could not load the audit")}</h1><p>{loadError === "not-found" ? (ru ? "Ссылка неверна или срок хранения результата закончился." : "The link is invalid or the result has expired.") : (ru ? "Проверьте соединение и попробуйте ещё раз." : "Check your connection and try again.")}</p>{loadError === "not-found" ? <Link className="button button-light" href={localizedPath(locale, "free-audit")}>{ru ? "Запустить новую проверку" : "Start a new check"}</Link> : <button className="button button-light" type="button" onClick={() => void load()}>{ru ? "Попробовать ещё раз" : "Try again"}</button>}</section></main>;
  if (!audit) return <main id="main-content" className="audit-result-shell"><AuditThemeControl locale={locale}/><div className="audit-loading"><span className="scan-spinner"/><h1>{ru ? "Восстанавливаем состояние проверки…" : "Restoring audit state…"}</h1></div></main>;
  const done = audit.status === "completed" || audit.status === "partial"; const result = audit.result;
  const finalScore = result?.score ?? audit.overallScore ?? null;
  const completedChecked = Math.min(PUBLIC_AUDIT_PAGE_LIMIT, result?.pagesChecked ?? audit.pagesChecked);
  const completedDiscovered = result?.pagesDiscovered ?? audit.pagesDiscovered;
  const reportHref = withAuditRestore(`/api/audits/${encodeURIComponent(token)}/report.pdf`, restore);
  return <main id="main-content" className="audit-result-shell"><header className="audit-result-header"><div className="audit-result-logo"><Logo locale={locale}/></div><div className="audit-result-header__actions"><ThemeToggle locale={locale}/><span className="mono">{done ? (ru ? "Снимок завершённой проверки" : "Completed audit snapshot") : (ru ? "Обновляется автоматически" : "Updates automatically")}</span></div></header>
    {!done && audit.status !== "failed" && <section className="audit-running audit-running--live audit-live-page"><AuditLiveProgress locale={locale} domain={audit.normalizedDomain} snapshot={audit}/></section>}
    {audit.status === "failed" && <section className="audit-failed"><span>!</span><h1>{ru ? "Проверку не удалось завершить" : "The audit could not be completed"}</h1><p>{ru ? "Сайт не ответил или ограничил автоматическую проверку. Можно запросить ручной разбор." : "The website did not respond or restricted the automated check. You can request a manual review."}</p><Link className="button button-light" href={localizedPath(locale, "contacts")}>{ru ? "Запросить ручную проверку" : "Request a manual review"}</Link></section>}
    {done && (
      <section className="audit-complete">
        <div className="score-panel">
          <p className="eyebrow light">{ru ? "Техническая оценка проверенной выборки" : "Technical score for the checked sample"}</p>
          <div className="final-score"><strong>{finalScore ?? "—"}</strong>{finalScore !== null && <span>/100</span>}</div>
          <h1>{result?.summary?.headline ?? result?.interpretation ?? (ru ? "Результат готов" : "Result ready")}</h1>
          <a className="audit-result-domain" href={result?.finalUrl ?? (audit.normalizedDomain ? `https://${audit.normalizedDomain}` : "#")} target="_blank" rel="noreferrer">{audit.normalizedDomain ?? result?.finalUrl ?? "—"}<span aria-hidden="true">↗</span></a>
          <p className="mono">{ru ? "Уровень" : "Grade"}: {result?.grade ?? audit.grade ?? "—"}</p>
          <p>{ru ? `Обнаружено ${completedDiscovered} URL. Подробно проверено ${completedChecked} из максимум ${PUBLIC_AUDIT_PAGE_LIMIT} страниц.` : `${completedDiscovered} URLs discovered. ${completedChecked} of up to ${PUBLIC_AUDIT_PAGE_LIMIT} pages were checked in detail.`}</p>
          <p className="result-meta">{formatAuditDate(audit.completedAt ?? audit.createdAt, locale)} · {audit.consentRecorded ? (ru ? "согласие зафиксировано" : "consent recorded") : ""}</p>
          {(result?.partial ?? audit.partial) && <span className="partial-badge">{ru ? "Проверка завершена раньше запланированного лимита" : "The check ended before the planned limit"}</span>}
          <small>{ru ? "Это предварительная внутренняя оценка KILENI публичной части сайта, а не официальный показатель Яндекса, Google или PageSpeed." : "This is KILENI’s preliminary internal assessment of public pages, not an official Yandex, Google or PageSpeed metric."}</small>
          <small className="audit-snapshot-note">{ru ? "Результат фиксирует состояние сайта на дату проверки и не меняется после последующих обновлений сайта." : "This result records the website state at the audit date and does not change after later website updates."}</small>
          <Link className="button button-secondary audit-rerun-link" href={freeAuditHref(locale, audit.normalizedDomain)}>{ru ? "Проверить текущую версию сайта" : "Check the current website version"}</Link>
        </div>
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

function freeAuditHref(locale: Locale, domain?: string): string {
  const path = localizedPath(locale, "free-audit");
  return domain ? `${path}?url=${encodeURIComponent(domain)}` : path;
}
