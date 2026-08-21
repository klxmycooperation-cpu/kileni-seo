"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";
import { PUBLIC_AUDIT_PAGE_LIMIT } from "../../config/public-audit";
import { auditNeedsResult, mergeAuditSnapshot } from "../../lib/audit/progress-state";
import { withAuditRestore } from "../../lib/audit/restore-url";
import { ThemeToggle } from "../layout/ThemeToggle";
import { AuditLiveProgress } from "../forms/AuditLiveProgress";

type AuditState = { status: string; pagesChecked: number; pagesDiscovered: number; pageLimit: number; overallScore?: number | null; grade?: string | null; partial?: boolean; errorSummary?: string | null; result?: PublicResult | null; normalizedDomain?: string; createdAt?: number; completedAt?: number | null; consentRecorded?: boolean };
type PublicResult = { score?: number | null; grade?: string | null; interpretation?: string; pagesChecked?: number; pagesDiscovered?: number; partial?: boolean; categories?: ReadonlyArray<{ name: string; risk: string; explanation: string; score?: number; max?: number }> };
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
  return <main id="main-content" className="audit-result-shell"><header className="audit-result-header"><Link className="audit-result-logo" href={localizedPath(locale)} aria-label="KILENI"><Image className="audit-result-logo--light" src="/brand/kileni-logo-light.svg" alt="KILENI SEO" width={201} height={48}/><Image className="audit-result-logo--dark" src="/brand/kileni-logo-dark.svg" alt="" width={201} height={48}/></Link><div className="audit-result-header__actions"><ThemeToggle locale={locale}/><span className="mono">{ru ? "Обновляется автоматически" : "Updates automatically"}</span></div></header>
    {!done && audit.status !== "failed" && <section className="audit-running audit-running--live audit-live-page"><AuditLiveProgress locale={locale} domain={audit.normalizedDomain} snapshot={audit}/></section>}
    {audit.status === "failed" && <section className="audit-failed"><span>!</span><h1>{ru ? "Проверку не удалось завершить" : "The audit could not be completed"}</h1><p>{ru ? "Сайт не ответил или ограничил автоматическую проверку. Можно запросить ручной разбор." : "The website did not respond or restricted the automated check. You can request a manual review."}</p><Link className="button button-light" href={localizedPath(locale, "contacts")}>{ru ? "Запросить ручную проверку" : "Request a manual review"}</Link></section>}
    {done && (
      <section className="audit-complete">
        <div className="score-panel">
          <p className="eyebrow light">{ru ? "Результат бесплатной проверки" : "Free check result"}</p>
          <div className="final-score"><strong>{finalScore ?? "—"}</strong>{finalScore !== null && <span>/100</span>}</div>
          <h1>{result?.interpretation ?? (ru ? "Результат готов" : "Result ready")}</h1>
          <p className="mono">{ru ? "Уровень" : "Grade"}: {result?.grade ?? audit.grade ?? "—"}</p>
          <p>{ru ? `Проверено ${completedChecked} из максимум ${PUBLIC_AUDIT_PAGE_LIMIT} страниц. Найдено доступных страниц: ${completedDiscovered}.` : `Checked ${completedChecked} of up to ${PUBLIC_AUDIT_PAGE_LIMIT} pages. Accessible pages found: ${completedDiscovered}.`}</p>
          <p className="result-meta">{formatAuditDate(audit.completedAt ?? audit.createdAt, locale)} · {audit.consentRecorded ? (ru ? "согласие зафиксировано" : "consent recorded") : ""}</p>
          {(result?.partial ?? audit.partial) && <span className="partial-badge">{ru ? "Частичная проверка" : "Partial audit"}</span>}
          <small>{ru ? "Это предварительная внутренняя оценка KILENI публичной части сайта, а не официальный показатель Яндекса, Google или PageSpeed." : "This is KILENI’s preliminary internal assessment of public pages, not an official Yandex, Google or PageSpeed metric."}</small>
        </div>
        <div className="result-body">
          <div className="result-heading">
            <div><p className="eyebrow">{ru ? "Основные группы" : "Main areas"}</p><h2>{ru ? "Что требует внимания" : "What needs attention"}</h2></div>
            <div className="result-actions">
              <a className="button button-secondary" href={reportHref} download>{ru ? "Скачать PDF-отчёт" : "Download PDF report"}</a>
              <button className="button button-secondary" onClick={async () => { await copyCurrentUrl(); setCopied(true); }}>{copied ? (ru ? "Ссылка скопирована" : "Link copied") : (ru ? "Скопировать ссылку" : "Copy link")}</button>
            </div>
          </div>
          <div className="risk-directions">{result?.categories?.map((category, index) => <article key={category.name}><span className={`risk risk-${riskClass(category.risk)}`}>{category.risk}</span><small className="mono">0{index + 1}</small><h3>{category.name}</h3><p>{category.explanation}</p></article>) ?? <p>{ru ? "Результаты подготавливаются." : "Results are being prepared."}</p>}</div>
          <div className="result-cta">
            <p className="eyebrow">{ru ? "Для новых клиентов" : "For new clients"}</p>
            <h2>{ru ? "Скидка 25% на первый платный SEO-аудит" : "25% off your first paid SEO audit"}</h2>
            <p>{ru ? "Без таймера и скрытых условий. Выберите расширенный аудит, аудит с исправлением или комплексное продвижение — домен уже подставлен в ссылку." : "No countdown or artificial urgency. Choose an extended audit, audit with implementation, or ongoing promotion; the domain is already included."}</p>
            <div>
              <Link className="button button-primary" href={briefOfferHref(locale, audit.normalizedDomain, "audit", token)}>{ru ? "Получить расширенный аудит со скидкой 25%" : "Get the extended audit with 25% off"}<span>↗</span></Link>
              <Link className="button button-secondary" href={briefOfferHref(locale, audit.normalizedDomain, "audit-fix", token)}>{ru ? "Обсудить исправление сайта" : "Discuss website fixes"}</Link>
              <Link className="button button-secondary" href={briefOfferHref(locale, audit.normalizedDomain, "promotion", token)}>{ru ? "Обсудить комплексное продвижение" : "Discuss ongoing promotion"}</Link>
            </div>
          </div>
        </div>
      </section>
    )}
  </main>;
}

function AuditThemeControl({ locale }: { locale: Locale }) {
  return <div className="audit-floating-theme"><ThemeToggle locale={locale}/></div>;
}
function riskClass(value: string) { const lower = value.toLowerCase(); if (lower.includes("unknown") || lower.includes("неиз")) return "unknown"; if (lower.includes("high") || lower.includes("выс")) return "high"; if (lower.includes("low") || lower.includes("низ")) return "low"; return "medium"; }
function formatAuditDate(value: number | null | undefined, locale: Locale): string { return value ? new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Moscow" }).format(value) : ""; }
async function copyCurrentUrl(): Promise<void> { try { await navigator.clipboard.writeText(window.location.href); } catch { const field = document.createElement("textarea"); field.value = window.location.href; field.style.position = "fixed"; field.style.opacity = "0"; document.body.append(field); field.select(); document.execCommand("copy"); field.remove(); } }
export function briefOfferHref(locale: Locale, domain: string | undefined, offer: "audit" | "audit-fix" | "promotion", auditToken: string): string {
  const query = new URLSearchParams({ offer, discount: "25" });
  if (domain) query.set("domain", domain);
  query.set("audit", auditToken);
  return `${localizedPath(locale, "brief")}?${query.toString()}`;
}
