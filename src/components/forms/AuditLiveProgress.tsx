"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Locale } from "../../config/site";
import { PUBLIC_AUDIT_PAGE_LIMIT } from "../../config/public-audit";

export type AuditLiveSnapshot = {
  token?: string;
  status?: string;
  pagesChecked?: number;
  pagesDiscovered?: number;
  pageLimit?: number;
  createdAt?: number;
  completedAt?: number | null;
};

type StageState = "waiting" | "active" | "completed" | "error";

type Stage = {
  key: string;
  ru: string;
  en: string;
  icon: "link" | "file" | "search" | "check" | "nodes" | "speed" | "report";
};

const stages: readonly Stage[] = [
  { key: "connecting", ru: "Подключение", en: "Connection", icon: "link" },
  { key: "robots", ru: "Robots.txt и sitemap", en: "Robots.txt & sitemap", icon: "file" },
  { key: "discovery", ru: "Поиск страниц", en: "Discovering pages", icon: "search" },
  { key: "crawl", ru: "Проверка страниц", en: "Checking pages", icon: "check" },
  { key: "structure", ru: "Структура и SEO", en: "Structure & SEO", icon: "nodes" },
  { key: "performance", ru: "Скорость", en: "Speed", icon: "speed" },
  { key: "result", ru: "Формирование результата", en: "Preparing result", icon: "report" },
];

function stageIndex(status: string | undefined): number {
  if (!status || ["queued", "validating_target", "connecting"].includes(status)) return 0;
  if (["checking_robots", "checking_sitemaps"].includes(status)) return 1;
  if (status === "discovering_pages") return 2;
  if (status === "crawling_pages") return 3;
  if (status === "analyzing_structure") return 4;
  if (status === "running_performance") return 5;
  return 6;
}

function pageDenominator(snapshot: AuditLiveSnapshot): number | null {
  const limit = Math.max(1, snapshot.pageLimit ?? PUBLIC_AUDIT_PAGE_LIMIT);
  const discovered = Math.max(0, snapshot.pagesDiscovered ?? 0);
  return discovered > 0 ? Math.min(discovered, limit) : null;
}

function progressFor(snapshot: AuditLiveSnapshot): number {
  const status = snapshot.status ?? "queued";
  const checked = Math.max(0, snapshot.pagesChecked ?? 0);
  const denominator = pageDenominator(snapshot);
  const crawlProgress = denominator ? Math.min(1, checked / denominator) : 0;

  if (status === "completed") return 100;
  if (status === "partial") return Math.min(99, Math.round(crawlProgress * 100));
  if (status === "failed") return Math.round(crawlProgress * 70);
  if (status === "calculating_score") return 95;
  if (status === "running_performance") return 87;
  if (status === "analyzing_structure") return 76;
  if (status === "crawling_pages") return Math.round(25 + crawlProgress * 45);
  if (status === "discovering_pages") return 19;
  if (status === "checking_sitemaps") return 14;
  if (status === "checking_robots") return 9;
  if (status === "connecting") return 5;
  if (status === "validating_target") return 2;
  return 0;
}

function activityLabel(status: string | undefined, locale: Locale): string {
  const labels: Record<string, [string, string]> = {
    queued: ["Готовим проверку", "Preparing the check"],
    validating_target: ["Проверяем адрес сайта", "Validating the website address"],
    connecting: ["Подключаемся к сайту", "Connecting to the website"],
    checking_robots: ["Проверяем robots.txt и sitemap", "Checking robots.txt and sitemap"],
    checking_sitemaps: ["Проверяем robots.txt и sitemap", "Checking robots.txt and sitemap"],
    discovering_pages: ["Ищем доступные страницы", "Finding available pages"],
    crawling_pages: ["Проверяем найденные страницы", "Checking discovered pages"],
    analyzing_structure: ["Анализируем структуру и SEO-сигналы", "Analyzing structure and SEO signals"],
    running_performance: ["Проверяем доступные сигналы скорости", "Checking available speed signals"],
    calculating_score: ["Собираем результат", "Preparing the result"],
    completed: ["Проверка завершена", "Check complete"],
    partial: ["Собираем доступную часть результата", "Preparing the available result"],
    failed: ["Проверка остановлена", "The check stopped"],
  };
  const label = labels[status ?? "queued"] ?? labels.queued;
  return label[locale === "ru" ? 0 : 1];
}

function formatDuration(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function useElapsed(startedAt: number | undefined, completedAt: number | null | undefined): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt || completedAt) return;
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [completedAt, startedAt]);
  return formatDuration(Math.max(0, (completedAt ?? now) - (startedAt ?? now)));
}

function StageIcon({ icon, state }: { icon: Stage["icon"]; state: StageState }) {
  if (state === "completed") return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m5 12.5 4.1 4.1L19.5 6.8"/></svg>;
  const paths: Record<Stage["icon"], ReactNode> = {
    link: <><path d="M9.2 14.8 7.4 16.6a3.2 3.2 0 0 1-4.5-4.5l3.6-3.6A3.2 3.2 0 0 1 11 8.5"/><path d="m14.8 9.2 1.8-1.8a3.2 3.2 0 0 1 4.5 4.5l-3.6 3.6a3.2 3.2 0 0 1-4.5 0"/><path d="m8.5 15.5 7-7"/></>,
    file: <><path d="M7 3.5h7l3 3v14H7z"/><path d="M14 3.5v4h3"/><path d="M9.5 12h5M9.5 15.5h5"/></>,
    search: <><circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 4.2 4.2"/></>,
    check: <><rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12.3 2.6 2.6 5.4-5.5"/></>,
    nodes: <><circle cx="6" cy="7" r="2"/><circle cx="18" cy="7" r="2"/><circle cx="12" cy="17" r="2"/><path d="m7.8 8.2 2.8 6.5m5.6-6.5-2.8 6.5M8 7h8"/></>,
    speed: <><path d="M4 15a8 8 0 1 1 16 0"/><path d="m12 12 4-3"/><path d="M12 4v1m6.4 2.6-.7.7M5.6 7.6l.7.7"/></>,
    report: <><path d="M7 3.5h7l3 3v14H7z"/><path d="M14 3.5v4h3"/><path d="M9.5 12h5M9.5 15.5h3.2"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24">{paths[icon]}</svg>;
}

export function AuditLiveProgress({ locale, domain, snapshot }: { locale: Locale; domain?: string; snapshot: AuditLiveSnapshot }) {
  const ru = locale === "ru";
  const status = snapshot.status ?? "queued";
  const currentStage = stageIndex(status);
  const percentage = progressFor(snapshot);
  const elapsed = useElapsed(snapshot.createdAt, snapshot.completedAt);
  const denominator = pageDenominator(snapshot);
  const checked = Math.max(0, snapshot.pagesChecked ?? 0);
  const found = Math.max(0, snapshot.pagesDiscovered ?? 0);
  const currentActivity = activityLabel(status, locale);
  const isFailed = status === "failed";
  const isTerminal = ["completed", "partial", "failed"].includes(status);

  const checkedValue = denominator ? `${Math.min(checked, denominator)} / ${denominator}` : "—";
  const stageItems = useMemo(() => stages.map((stage, index) => {
    let state: StageState = "waiting";
    if (isFailed && index === currentStage) state = "error";
    else if (index < currentStage || (status === "completed" && index <= currentStage) || (status === "partial" && index < currentStage)) state = "completed";
    else if (index === currentStage && !isTerminal) state = "active";
    return { stage, state };
  }), [currentStage, isFailed, isTerminal, status]);

  return (
    <article className="audit-live" data-status={status}>
      <div className="audit-live__lead">
        <span className="audit-live__eyebrow">{ru ? "Бесплатная SEO-проверка" : "Free SEO check"}</span>
        <div className="audit-live__headline">
          <div>
            <h1>{ru ? "Проводим SEO-проверку сайта" : "Running an SEO check"}</h1>
            <p>{domain || (ru ? "Адрес сайта уточняется" : "Website address is being confirmed")}</p>
          </div>
          <div className="audit-live__percent" aria-label={ru ? `Выполнено ${percentage}%` : `${percentage}% complete`}>
            <strong>{percentage}</strong><span>%</span>
          </div>
        </div>
      </div>

      <div className="audit-live__progress-wrap">
        <div className="audit-live__activity"><span className={isFailed ? "is-error" : undefined}/><p aria-live="polite" aria-atomic="true">{currentActivity}</p></div>
        <div className="audit-live__progress" role="progressbar" aria-label={ru ? "Ход проверки сайта" : "Website audit progress"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
          <span style={{ width: `${percentage}%` }} />
        </div>
      </div>

      <ol className="audit-live__stages" aria-label={ru ? "Этапы проверки" : "Check stages"} tabIndex={0}>
        {stageItems.map(({ stage, state }, index) => (
          <li className={`audit-live__stage is-${state}`} aria-current={state === "active" ? "step" : undefined} key={stage.key}>
            <span className="audit-live__connector" aria-hidden="true"/>
            <span className="audit-live__stage-icon"><StageIcon icon={stage.icon} state={state}/></span>
            <span className="audit-live__stage-index">{String(index + 1).padStart(2, "0")}</span>
            <span className="audit-live__stage-label">{ru ? stage.ru : stage.en}</span>
          </li>
        ))}
      </ol>

      <dl className="audit-live__metrics">
        <div><dt>{ru ? "Найдено страниц" : "Pages found"}</dt><dd>{found || "—"}</dd></div>
        <div><dt>{ru ? "Проверено страниц" : "Pages checked"}</dt><dd>{checkedValue}</dd></div>
        <div><dt>{ru ? "Проверяется сейчас" : "Checking now"}</dt><dd className="audit-live__metric-text">{currentActivity}</dd></div>
        <div><dt>{ru ? "Прошло времени" : "Elapsed time"}</dt><dd>{elapsed}</dd></div>
      </dl>
      <p className="audit-live__notice">{ru ? "Показываем фактический ход проверки. Детали и рекомендации будут в результате." : "This shows the observed check progress. Details and recommendations will be available in the result."}</p>
    </article>
  );
}

export function AuditLiveOverlay({ locale, domain, snapshot }: { locale: Locale; domain?: string; snapshot: AuditLiveSnapshot }) {
  const [mounted, setMounted] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const ru = locale === "ru";

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted || minimized) return;
    const { style } = document.body;
    const previousOverflow = style.overflow;
    const previousPaddingRight = style.paddingRight;
    style.overflow = "hidden";
    style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`;
    return () => {
      style.overflow = previousOverflow;
      style.paddingRight = previousPaddingRight;
    };
  }, [minimized, mounted]);

  if (!mounted) return null;
  const title = ru ? "Ход SEO-проверки" : "SEO check progress";
  if (minimized) {
    return createPortal(
      <button className="audit-live-float" type="button" onClick={() => setMinimized(false)} aria-label={ru ? "Открыть ход проверки" : "Open check progress"}>
        <span className="audit-live-float__pulse"/><span>{ru ? "Проверка сайта идёт" : "Website check in progress"}</span><strong>{progressFor(snapshot)}%</strong>
      </button>,
      document.body,
    );
  }

  return createPortal(
    <section className="audit-live-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="audit-live-overlay__toolbar"><span>{ru ? "KILENI / SEO-АУДИТ" : "KILENI / SEO AUDIT"}</span><button type="button" onClick={() => setMinimized(true)}>{ru ? "Свернуть" : "Minimize"}<span aria-hidden="true">↓</span></button></div>
      <div className="audit-live-overlay__content"><AuditLiveProgress locale={locale} domain={domain} snapshot={snapshot}/></div>
    </section>,
    document.body,
  );
}
