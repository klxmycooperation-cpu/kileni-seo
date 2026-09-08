"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { Locale } from "../../config/site";
import { Logo } from "../brand/Logo";

export type AuditLiveSelectedPage = {
  readonly url: string;
  readonly pageType: string;
  readonly selectionReason: string;
};

export type AuditLiveEvent = {
  readonly kind: string;
  readonly path?: string;
  readonly pageType?: string;
  readonly createdAt?: string;
};

export type AuditLiveSnapshot = {
  token?: string;
  status?: string;
  pagesChecked?: number;
  pagesDiscovered?: number;
  pagesEligible?: number;
  pagesSelected?: number;
  selectedPages?: readonly AuditLiveSelectedPage[];
  checkedUrls?: readonly string[];
  failedUrls?: readonly string[];
  selectionComplete?: boolean;
  technicalFilesChecked?: number;
  robotsStatus?: "found" | "missing" | "error";
  sitemapStatus?: "found" | "missing" | "error";
  currentUrl?: string;
  currentPageType?: string;
  recentEvents?: readonly AuditLiveEvent[];
  eventKind?: string;
  eventCreatedAt?: string;
  pageLimit?: number;
  createdAt?: number;
  completedAt?: number | null;
};

type StageKey = "connection" | "rules" | "selection" | "check" | "report";
type StageState = "waiting" | "active" | "completed" | "error";

const stages: readonly { key: StageKey; ru: string; en: string }[] = [
  { key: "connection", ru: "Подключение", en: "Connection" },
  { key: "rules", ru: "Правила сайта", en: "Site rules" },
  { key: "selection", ru: "Выбор страниц", en: "Page selection" },
  { key: "check", ru: "Проверка", en: "Checking" },
  { key: "report", ru: "Результат", en: "Result" },
];

function currentStage(snapshot: AuditLiveSnapshot): number {
  const status = snapshot.status ?? "queued";
  if (["queued", "validating_target", "connecting"].includes(status)) return 0;
  if (["checking_robots", "checking_sitemaps", "discovering_pages"].includes(status)) return 1;
  if (status === "crawling_pages" && snapshot.selectionComplete !== true) return 2;
  if (["crawling_pages", "analyzing_structure", "running_performance"].includes(status)) return 3;
  return 4;
}

function isTerminal(status: string): boolean {
  return ["completed", "partial", "failed"].includes(status);
}

function progressState(snapshot: AuditLiveSnapshot): { determinate: boolean; value: number } {
  const selected = Math.max(0, snapshot.pagesSelected ?? snapshot.selectedPages?.length ?? 0);
  const checked = Math.max(0, snapshot.pagesChecked ?? 0);
  if (snapshot.selectionComplete !== true || selected === 0) return { determinate: false, value: 0 };
  return { determinate: true, value: Math.min(100, Math.round((checked / selected) * 100)) };
}

function pageTypeLabel(type: string, locale: Locale): string {
  const labels: Record<string, [string, string]> = {
    homepage: ["Главная", "Homepage"],
    service: ["Страница услуги", "Service page"],
    commercial: ["Коммерческая страница", "Commercial page"],
    conversion_support: ["Страница для связи", "Contact-support page"],
    hub: ["Раздел", "Hub page"],
    unique: ["Отдельная страница", "Distinct page"],
    category: ["Раздел", "Category"],
    pricing: ["Страница с ценами", "Pricing page"],
    contact: ["Контакты", "Contacts"],
    case: ["Кейс", "Case study"],
    about: ["О компании", "About page"],
    blog: ["Раздел блога", "Blog section"],
    article: ["Статья", "Article"],
    product: ["Детальная страница", "Detail page"],
    detail: ["Детальная страница", "Detail page"],
    alternate_locale: ["Другая языковая версия", "Other language version"],
    unknown: ["Отдельная страница", "Distinct page"],
  };
  return (labels[type] ?? labels.unknown)[locale === "ru" ? 0 : 1];
}

function selectionReasonLabel(reason: string, locale: Locale): string {
  const labels: Record<string, [string, string]> = {
    user_target: ["адрес, который вы указали", "the address you entered"],
    homepage: ["главная страница сайта", "the website homepage"],
    priority_url: ["важный раздел сайта", "an important website section"],
    primary_commercial: ["основная коммерческая страница", "a primary commercial page"],
    commercial_different_template: ["другой коммерческий формат", "a different commercial format"],
    conversion_support: ["страница помогает связаться", "a page that helps visitors make contact"],
    category_hub: ["страница объединяет раздел", "a page that groups a section"],
    case_page: ["пример отдельного кейса", "a representative case study"],
    article_page: ["пример отдельной статьи", "a representative article"],
    unique_template: ["отдельный формат страницы", "a distinct page format"],
    page_type: ["отдельный тип страницы", "a distinct page type"],
    template_diversity: ["другой формат страницы", "a different page format"],
    detail_page: ["пример детальной страницы", "a representative detail page"],
    alternate_locale_control: ["контроль другой языковой версии", "a check of another language version"],
    primary_locale_type_missing: ["основная локаль этого типа страницы не обнаружена", "no primary-locale page of this type was found"],
    additional_important: ["важная страница", "an important page"],
  };
  return (labels[reason] ?? labels.additional_important)[locale === "ru" ? 0 : 1];
}

function urlPath(value: string): string {
  try {
    const url = new URL(value);
    return `${url.pathname || "/"}${url.search}`;
  } catch {
    return value;
  }
}

function normalizedUrl(value: string | undefined): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    url.hash = "";
    return url.href;
  } catch {
    return value;
  }
}

function displayDomain(domain: string | undefined): string {
  if (!domain) return "";
  try {
    return new URL(domain.includes("://") ? domain : `https://${domain}`).hostname.replace(/^www\./u, "");
  } catch {
    return domain;
  }
}

function currentPagePosition(snapshot: AuditLiveSnapshot, selectedCount: number): number {
  const current = normalizedUrl(snapshot.currentUrl);
  const selectedIndex = (snapshot.selectedPages ?? []).findIndex((page) => normalizedUrl(page.url) === current);
  if (selectedIndex >= 0) return selectedIndex + 1;
  const attempted = new Set([
    ...(snapshot.checkedUrls ?? []),
    ...(snapshot.failedUrls ?? []),
  ].map(normalizedUrl).filter(Boolean)).size;
  return Math.min(Math.max(1, attempted + 1), Math.max(1, selectedCount));
}

function stageCopy(snapshot: AuditLiveSnapshot, locale: Locale): { title: string; description: string; shortStatus: string } {
  const ru = locale === "ru";
  const stage = currentStage(snapshot);
  const status = snapshot.status ?? "queued";
  const selected = Math.max(0, snapshot.pagesSelected ?? snapshot.selectedPages?.length ?? 0);
  const checked = Math.min(Math.max(0, snapshot.pagesChecked ?? 0), Math.max(0, selected));
  if (stage === 0) return {
    title: ru ? "Подключение" : "Connecting",
    description: ru ? "Подключаемся к сайту и проверяем, отвечает ли сервер." : "Connecting to the website and checking whether the server responds.",
    shortStatus: ru ? "Подключаемся" : "Connecting",
  };
  if (stage === 1) return {
    title: ru ? "Читаем правила сайта" : "Reading the site rules",
    description: ru ? "Проверяем robots.txt и sitemap.xml, затем ищем страницы сайта." : "Checking robots.txt and sitemap.xml, then finding website pages.",
    shortStatus: ru ? "Ищем страницы" : "Finding pages",
  };
  if (stage === 2) return {
    title: ru ? "Выбираем страницы" : "Selecting pages",
    description: ru ? "Берём разные типы страниц, чтобы бесплатная десятка показывала сайт целиком, а не повторяла один раздел." : "Choosing different page types so the free sample represents the site instead of repeating one section.",
    shortStatus: ru ? "Формируем выборку" : "Building the sample",
  };
  if (stage === 3) {
    const position = currentPagePosition(snapshot, selected);
    const currentType = pageTypeLabel(snapshot.currentPageType ?? "unknown", locale);
    const path = snapshot.currentUrl ? urlPath(snapshot.currentUrl) : "";
    const started = snapshot.eventKind === "page_started" && path;
    return {
      title: selected > 0
        ? (ru ? `Проверяем ${started ? position : Math.min(checked + 1, selected)} из ${selected}` : `Checking ${started ? position : Math.min(checked + 1, selected)} of ${selected}`)
        : (ru ? "Проверяем выбранные страницы" : "Checking selected pages"),
      description: started
        ? `${currentType} · ${path}`
        : (ru ? "Проверяем страницы по очереди и сохраняем только подтверждённые результаты." : "Checking pages one by one and saving only confirmed results."),
      shortStatus: ru ? "Проверка страниц" : "Checking pages",
    };
  }
  if (status === "failed") return {
    title: ru ? "Проверка остановлена" : "The check stopped",
    description: ru ? "Не удалось завершить автоматическую проверку. Уже полученные данные сохранены." : "The automated check could not finish. The data already collected was saved.",
    shortStatus: ru ? "Проверка остановлена" : "Check stopped",
  };
  if (status === "completed" || status === "partial") return {
    title: ru ? "Проверка завершена" : "Check complete",
    description: ru ? "Страницы проверены. Собираем выводы в понятный отчёт." : "The pages are checked. Turning the results into a clear report.",
    shortStatus: ru ? "Отчёт готов" : "Report ready",
  };
  return {
    title: ru ? "Собираем результат" : "Preparing the result",
    description: ru ? "Объединяем одинаковые замечания и готовим краткий итог." : "Combining repeated findings and preparing a concise summary.",
    shortStatus: ru ? "Формируем отчёт" : "Preparing report",
  };
}

function eventLabel(event: AuditLiveEvent, snapshot: AuditLiveSnapshot, locale: Locale): string {
  const ru = locale === "ru";
  const path = event.path ?? "";
  if (event.kind === "site_connected") return ru ? "Сайт ответил." : "The website responded.";
  if (event.kind === "robots_checked") {
    if (snapshot.robotsStatus === "found") return ru ? "robots.txt найден и прочитан." : "robots.txt was found and read.";
    if (snapshot.robotsStatus === "missing") return ru ? "robots.txt не найден." : "robots.txt was not found.";
    return ru ? "robots.txt не удалось прочитать." : "robots.txt could not be read.";
  }
  if (event.kind === "sitemap_checked") {
    if (snapshot.sitemapStatus === "found") return ru ? "sitemap.xml найден и прочитан." : "sitemap.xml was found and read.";
    if (snapshot.sitemapStatus === "missing") return ru ? "sitemap.xml не найден." : "sitemap.xml was not found.";
    return ru ? "sitemap.xml не удалось прочитать." : "sitemap.xml could not be read.";
  }
  if (event.kind === "selection_started") return ru ? "Сравниваем найденные страницы." : "Comparing the discovered pages.";
  if (event.kind === "selection_complete") {
    const count = Math.max(0, snapshot.pagesSelected ?? snapshot.selectedPages?.length ?? 0);
    return ru ? `Выбрали ${count} страниц разных типов.` : `Selected ${count} pages of different types.`;
  }
  if (event.kind === "page_started") return ru ? `Проверяем ${path || "страницу"}.` : `Checking ${path || "a page"}.`;
  if (event.kind === "page_checked") return ru ? `Проверена ${path || "страница"}.` : `Checked ${path || "a page"}.`;
  if (event.kind === "page_failed") return ru ? `Не удалось проверить ${path || "страницу"}.` : `Could not check ${path || "a page"}.`;
  return ru ? "Получены новые данные." : "New audit data received.";
}

function technicalStatus(status: AuditLiveSnapshot["robotsStatus"] | AuditLiveSnapshot["sitemapStatus"], locale: Locale): string | null {
  const ru = locale === "ru";
  if (status === "found") return ru ? "Прочитан" : "Read";
  if (status === "missing") return ru ? "Не найден" : "Not found";
  if (status === "error") return ru ? "Не удалось прочитать" : "Could not be read";
  return null;
}

function liveMetrics(snapshot: AuditLiveSnapshot, locale: Locale): Array<{ label: string; value: string | number }> {
  const ru = locale === "ru";
  const stage = currentStage(snapshot);
  const discovered = Math.max(0, snapshot.pagesDiscovered ?? 0);
  const eligible = Math.max(0, snapshot.pagesEligible ?? 0);
  const selected = Math.max(0, snapshot.pagesSelected ?? snapshot.selectedPages?.length ?? 0);
  const checked = Math.min(Math.max(0, snapshot.pagesChecked ?? 0), Math.max(0, selected));
  const technical = Math.max(0, snapshot.technicalFilesChecked ?? 0);
  if (stage === 0) return [];
  if (stage === 1) return [
    ...(discovered > 0 ? [{ label: ru ? "Найдено HTML-страниц" : "HTML pages found", value: discovered }] : []),
    ...(technical > 0 ? [{ label: ru ? "Технических файлов прочитано" : "Technical files read", value: technical }] : []),
  ].slice(0, 3);
  if (stage === 2) return [
    { label: ru ? "Найдено HTML-страниц" : "HTML pages found", value: discovered > 0 ? discovered : ru ? "Ищем…" : "Searching…" },
    { label: ru ? "Подходят для проверки" : "Eligible pages", value: eligible > 0 ? eligible : ru ? "Ищем…" : "Searching…" },
    { label: ru ? "Выбрано" : "Selected", value: snapshot.selectionComplete ? selected : ru ? "Ещё не выбраны." : "Not selected yet." },
  ];
  return [
    { label: ru ? "Проверено" : "Checked", value: `${checked} ${ru ? "из" : "of"} ${selected}` },
    ...(discovered > 0 ? [{ label: ru ? "Найдено HTML-страниц" : "HTML pages found", value: discovered }] : []),
    ...(technical > 0 ? [{ label: ru ? "Технических файлов прочитано" : "Technical files read", value: technical }] : []),
  ].slice(0, 3);
}

function AuditStageVisual({ locale, domain, snapshot, stage }: { locale: Locale; domain?: string; snapshot: AuditLiveSnapshot; stage: number }) {
  const ru = locale === "ru";
  const selectedPages = (snapshot.selectedPages ?? []).slice(0, 10);
  const checkedUrls = new Set((snapshot.checkedUrls ?? []).map(normalizedUrl));
  const failedUrls = new Set((snapshot.failedUrls ?? []).map(normalizedUrl));
  const current = snapshot.eventKind === "page_started" ? normalizedUrl(snapshot.currentUrl) : "";
  const siteName = displayDomain(domain) || (ru ? "Адрес сайта" : "Website address");

  if (stage === 0) return <div className="audit-live__connection" data-connected="false">
    <div className="audit-live__connection-brand"><Logo locale={locale}/></div>
    <div className="audit-live__connection-line" aria-hidden="true"><span/></div>
    <div className="audit-live__connection-domain"><span aria-hidden="true"/><strong>{siteName}</strong></div>
  </div>;

  if (stage === 1) return <div className="audit-live__rules-scene">
    <div className="audit-live__site-core"><span aria-hidden="true"/><strong>{siteName}</strong></div>
    <div className="audit-live__rule-files" aria-label={ru ? "Технические файлы сайта" : "Website technical files"}>
      {(["robots", "sitemap"] as const).map((type) => {
        const state = type === "robots" ? snapshot.robotsStatus : snapshot.sitemapStatus;
        const label = type === "robots" ? "robots.txt" : "sitemap.xml";
        const detail = technicalStatus(state, locale);
        return <article className={`audit-live__rule-file${state ? ` is-${state}` : ""}`} key={type}><span aria-hidden="true"/><div><strong>{label}</strong>{detail ? <small>{detail}</small> : null}</div></article>;
      })}
    </div>
    <p>{ru ? "Эти файлы проверяются отдельно и не занимают места в выборке страниц." : "These files are checked separately and do not use page-sample slots."}</p>
  </div>;

  if (stage === 4) return <div className="audit-live__report-scene">
    <div className="audit-live__report-sheet" aria-hidden="true"><span/><span/><span/></div>
    <div className="audit-live__report-groups">
      <div><span className="is-attention"/><strong>{ru ? "Что требует внимания" : "What needs attention"}</strong></div>
      <div><span className="is-ready"/><strong>{ru ? "Что уже в порядке" : "What is already fine"}</strong></div>
      <div><span/><strong>{ru ? "Проверенные страницы" : "Checked pages"}</strong></div>
    </div>
  </div>;

  return <div className={`audit-live__tree${stage === 3 ? " is-checking" : " is-selecting"}`}>
    <div className="audit-live__tree-root"><span aria-hidden="true"/><strong>{siteName}</strong></div>
    {selectedPages.length > 0 ? <ol className="audit-live__tree-pages">
      {selectedPages.map((page, index) => {
        const pageUrl = normalizedUrl(page.url);
        const isCurrent = current !== "" && pageUrl === current;
        const isCompleted = !isCurrent && checkedUrls.has(pageUrl);
        const isFailed = !isCurrent && !isCompleted && failedUrls.has(pageUrl);
        return <li
          className={`${isCurrent ? "is-current" : ""}${isCompleted ? " is-completed" : ""}${isFailed ? " is-failed" : ""}`}
          key={page.url}
          title={selectionReasonLabel(page.selectionReason, locale)}
          style={{ "--page-index": index } as CSSProperties}
        ><span aria-hidden="true"/><div><small>{pageTypeLabel(page.pageType, locale)}</small><strong>{urlPath(page.url)}</strong></div>{isFailed ? <span className="visually-hidden">{ru ? "Не удалось проверить" : "Could not be checked"}</span> : null}</li>;
      })}
    </ol> : <div className="audit-live__discovery" aria-label={ru ? "Найденные страницы группируются" : "Discovered pages are being grouped"}>
      {Array.from({ length: Math.min(6, Math.max(1, snapshot.pagesDiscovered ?? 1)) }, (_, index) => <span key={index}/>) }
    </div>}
  </div>;
}

export function AuditLiveProgress({ locale, domain, snapshot }: { locale: Locale; domain?: string; snapshot: AuditLiveSnapshot }) {
  const ru = locale === "ru";
  const status = snapshot.status ?? "queued";
  const activeStage = currentStage(snapshot);
  const progress = progressState(snapshot);
  const copy = stageCopy(snapshot, locale);
  const events = (snapshot.recentEvents ?? []).slice(-3);
  const metrics = liveMetrics(snapshot, locale);
  const stageItems = useMemo(() => stages.map((stage, index) => {
    let state: StageState = "waiting";
    if (status === "failed" && index === activeStage) state = "error";
    else if (index < activeStage || ((status === "completed" || status === "partial") && index <= activeStage)) state = "completed";
    else if (index === activeStage && !isTerminal(status)) state = "active";
    return { stage, state };
  }), [activeStage, status]);

  return <article className="audit-live" data-stage={stages[activeStage].key} data-status={status}>
    <section className="audit-live__narrative" aria-labelledby="audit-live-heading">
      <p className="audit-live__eyebrow">{ru ? `Этап ${activeStage + 1} из 5` : `Stage ${activeStage + 1} of 5`}</p>
      <h1 id="audit-live-heading">{copy.title}</h1>
      <p className="audit-live__activity" aria-live="polite" aria-atomic="true">{copy.description}</p>
    </section>

    <section className="audit-live__visual" aria-label={ru ? `Текущий этап: ${copy.shortStatus}` : `Current stage: ${copy.shortStatus}`}>
      <AuditStageVisual locale={locale} domain={domain} snapshot={snapshot} stage={activeStage}/>
    </section>

    <section className="audit-live__data" aria-label={ru ? "Реальные показатели проверки" : "Observed audit figures"}>
      {metrics.length > 0 ? <dl className="audit-live__metrics">{metrics.map((metric) => <div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value}</dd></div>)}</dl> : null}
      {events.length > 0 ? <div className="audit-live__events"><h2>{ru ? "Последние события" : "Latest events"}</h2><ol>{events.map((event, index) => <li key={`${event.createdAt ?? index}-${event.kind}-${event.path ?? ""}`}>{eventLabel(event, snapshot, locale)}</li>)}</ol></div> : null}
    </section>

    <div className="audit-live__timeline-wrap">
      <div
        className={`audit-live__progress${progress.determinate ? " is-determinate" : " is-indeterminate"}`}
        role="progressbar"
        aria-label={ru ? "Ход проверки сайта" : "Website audit progress"}
        aria-valuemin={0}
        aria-valuemax={100}
        {...(progress.determinate ? { "aria-valuenow": progress.value } : {})}
      ><span style={progress.determinate ? { width: `${progress.value}%` } : undefined}/></div>
      <ol className="audit-live__stages" aria-label={ru ? "Этапы проверки" : "Audit stages"}>{stageItems.map(({ stage, state }, index) => <li className={`is-${state}`} aria-current={state === "active" ? "step" : undefined} key={stage.key}><span aria-hidden="true">{state === "completed" ? "✓" : index + 1}</span><strong>{ru ? stage.ru : stage.en}</strong></li>)}</ol>
    </div>

    <footer className="audit-live__footer"><p>{ru ? "Не отправляем формы, не вводим пароли и не открываем закрытые разделы." : "We do not submit forms, enter passwords, or open private sections."}</p><p>{ru ? "Можно свернуть окно — проверка продолжится." : "You can minimize this window — the audit will continue."}</p></footer>
  </article>;
}

export function AuditLiveOverlay({ locale, domain, snapshot }: { locale: Locale; domain?: string; snapshot: AuditLiveSnapshot }) {
  const [mounted, setMounted] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const ru = locale === "ru";
  const progress = progressState(snapshot);
  const completing = snapshot.status === "completed" || snapshot.status === "partial";
  const copy = stageCopy(snapshot, locale);

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
  if (minimized) return <>
    <section className="audit-live-minimized" aria-labelledby="audit-live-minimized-heading">
      <div>
        <p>{displayDomain(domain) || (ru ? "Бесплатная SEO-проверка" : "Free SEO check")}</p>
        <h1 id="audit-live-minimized-heading">{ru ? "Проверка продолжается" : "The audit is still running"}</h1>
        <p>{ru ? "Откройте ход проверки в правом нижнем углу." : "Open the audit progress in the bottom-right corner."}</p>
      </div>
    </section>
    {createPortal(<button className="audit-live-float" type="button" onClick={() => setMinimized(false)} aria-label={ru ? "Открыть ход проверки" : "Open audit progress"}><span className="audit-live-float__pulse"/><span>{ru ? "Проверка сайта идёт" : "Website audit in progress"}</span>{progress.determinate ? <strong>{Math.min(snapshot.pagesChecked ?? 0, snapshot.pagesSelected ?? 0)} / {snapshot.pagesSelected ?? 0}</strong> : <strong>{copy.shortStatus}</strong>}</button>, document.body)}
  </>;

  return createPortal(<section className={`audit-live-overlay${completing ? " is-completing" : ""}`} role="dialog" aria-modal="true" aria-label={ru ? "Ход SEO-проверки" : "SEO audit progress"}>
    <header className="audit-live-overlay__toolbar"><div className="audit-live-overlay__brand"><Logo locale={locale}/><span>{ru ? "Бесплатная SEO-проверка" : "Free SEO check"}</span></div><div className="audit-live-overlay__status"><strong>{displayDomain(domain) || (ru ? "Уточняем адрес" : "Confirming address")}</strong><span>{copy.shortStatus}</span>{!completing ? <button type="button" onClick={() => setMinimized(true)}>{ru ? "Свернуть" : "Minimize"}<span aria-hidden="true">↓</span></button> : null}</div></header>
    <div className="audit-live-overlay__content"><AuditLiveProgress locale={locale} domain={domain} snapshot={snapshot}/></div>
  </section>, document.body);
}
