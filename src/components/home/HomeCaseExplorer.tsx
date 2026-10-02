"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { CaseStudy } from "../../content/cases";
import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";

type HomeCaseExplorerProps = {
  locale: Locale;
  cases: CaseStudy[];
};

type ResultRow = {
  label: string;
  kind: "score" | "pages" | "mobilePerformance" | "performance" | "cls" | "images" | "text";
  text?: string;
};

function useAnimatedNumber(from: number, to: number, enabled: boolean, duration = 2_800) {
  // The server and first client render always contain the verified final value.
  // Animation is progressive enhancement and may only change the visual value
  // after hydration, never the factual HTML exposed to crawlers or no-JS users.
  const [value, setValue] = useState(to);

  useEffect(() => {
    if (!enabled) {
      setValue(to);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(to);
      return;
    }
    let frame = 0;
    const startedAt = performance.now();
    setValue(from);

    const update = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(from + (to - from) * eased));
      if (progress < 1) frame = window.requestAnimationFrame(update);
    };
    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [from, to, enabled, duration]);

  return value;
}

function AnimatedScore({ from, to, enabled }: { from: number; to: number; enabled: boolean }) {
  const value = useAnimatedNumber(from, to, enabled);

  return (
    <span className="home-case-explorer__score" data-score-from={from} data-score-to={to}>
      <span className="visually-hidden">{from} → {to}</span>
      <span aria-hidden="true">{from} → {value}</span>
    </span>
  );
}

function AnimatedMetric({
  from,
  to,
  suffix = "",
  format = (value) => String(value),
  enabled,
}: {
  from: number;
  to: number;
  suffix?: string;
  format?: (value: number) => string;
  enabled: boolean;
}) {
  const value = useAnimatedNumber(from, to, enabled);
  return (
    <span className="home-case-explorer__score" data-counter-from={from} data-counter-to={to}>
      <span className="visually-hidden">{format(to)}{suffix}</span>
      <span aria-hidden="true">{format(value)}{suffix}</span>
    </span>
  );
}

export function HomeCaseExplorer({ locale, cases }: HomeCaseExplorerProps) {
  const ru = locale === "ru";
  const [active, setActive] = useState(0);
  const [metricsVisible, setMetricsVisible] = useState(false);
  const [metricsRun, setMetricsRun] = useState(0);
  const [interactive, setInteractive] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const caseRailRef = useRef<HTMLDivElement>(null);
  const baseId = useId().replace(/:/g, "");
  const item = cases[active];
  const home = item.home;
  const isEco = item.slug === "eco-santeh";
  const logo = home?.logoPath ?? `/case-sites/${item.slug}.ico`;
  const scoreFrom = item.before;
  const scoreTo = item.after;

  const resultRows: ResultRow[] = home
    ? home.metrics.map((metric) => ({ label: metric.label, kind: "text", text: metric.value }))
    : isEco
    ? ru
      ? [{ label: "Готовность сайта", kind: "score" }, { label: "Страницы открываются", kind: "pages" }, { label: "Скорость на телефоне", kind: "mobilePerformance" }, { label: "Скорость на компьютере", kind: "performance" }]
      : [{ label: "Technical readiness", kind: "score" }, { label: "Pages returning HTTP 200", kind: "pages" }, { label: "Mobile Performance", kind: "mobilePerformance" }, { label: "Desktop Performance", kind: "performance" }]
    : ru
      ? [{ label: "Готовность сайта", kind: "score" }, { label: "Страницы открываются", kind: "pages" }, { label: "Стабильность первого экрана", kind: "cls" }, { label: "Изображения без размеров", kind: "images" }]
      : [{ label: "Technical readiness", kind: "score" }, { label: "Pages returning HTTP 200", kind: "pages" }, { label: "First-screen CLS", kind: "cls" }, { label: "Images without dimensions", kind: "images" }];

  const steps = home?.steps ?? (isEco
    ? ru ? ["Шаблоны", "Адреса", "Заголовки и описания", "Контрольная проверка"] : ["Templates", "URLs", "Metadata", "Recheck"]
    : ru ? ["Проверка", "Первый экран", "Данные для поиска", "Контрольная проверка"] : ["Diagnostics", "First screen", "JSON-LD", "Recheck"]);
  const chartPoints = home?.chartPoints ?? (isEco ? "24,129 156,118 262,97 382,84 505,58 628,34" : "24,142 156,113 262,93 382,77 505,62 628,44");
  const chartTitle = home?.chartTitle ?? (ru ? "Изменение итоговой шкалы проекта" : "Change in the project score");
  const chartStartLabel = home?.chartStartLabel ?? String(scoreFrom);
  const chartEndLabel = home?.chartEndLabel ?? String(scoreTo);
  const chartAriaLabel = home?.chartAriaLabel ?? `${resultRows[0].label} ${scoreFrom} → ${scoreTo}`;
  const chartPointList = chartPoints.split(" ").map((point) => {
    const [x, y] = point.split(",").map(Number);
    return { x, y };
  });
  const tabId = (index: number) => `${baseId}-case-tab-${index}`;
  const panelId = `${baseId}-case-panel`;

  function moveCase(index: number, focusTab = false) {
    const next = (index + cases.length) % cases.length;
    setActive(next);
    window.requestAnimationFrame(() => {
      const tab = document.getElementById(tabId(next));
      tab?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      if (focusTab) tab?.focus();
    });
  }

  useEffect(() => {
    setInteractive(true);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") {
      setMetricsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setMetricsVisible(true);
      observer.disconnect();
    }, { threshold: 0.08, rootMargin: "0px 0px -10%" });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!metricsVisible || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setMetricsRun((value) => value + 1), 15_000);
    return () => window.clearInterval(timer);
  }, [metricsVisible]);

  return (
    <section ref={sectionRef} id="home-cases" className="home-case-explorer" aria-labelledby="case-explorer-heading">
      <header className="home-case-explorer__heading">
        <div>
          <p className="section-label">{ru ? "Доказательства" : "Evidence"}</p>
          <h2 id="case-explorer-heading">{ru ? "Результаты, которые можно проверить" : "Results you can verify"}</h2>
        </div>
        <p>{ru ? "Показываем конкретные изменения до и после — без обещаний продаж и нарисованной статистики." : "We show concrete before-and-after changes without sales promises or invented statistics."}</p>
      </header>

      <div className="home-case-explorer__tape" data-mobile-case-controls>
        <button type="button" className="home-case-explorer__tape-control" onClick={() => moveCase(active - 1)} aria-label={ru ? "Предыдущий кейс" : "Previous case"} disabled={!interactive}>←</button>
        <div ref={caseRailRef} className="home-case-explorer__switch" role="tablist" aria-label={ru ? "Лента кейсов" : "Case carousel"}>
          {cases.map((study, index) => (
            <button
              id={tabId(index)}
              key={study.slug}
              type="button"
              role="tab"
              aria-selected={active === index}
              aria-controls={panelId}
              tabIndex={active === index ? 0 : -1}
              onClick={() => moveCase(index)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                  event.preventDefault();
                  moveCase(index + 1, true);
                } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                  event.preventDefault();
                  moveCase(index - 1, true);
                } else if (event.key === "Home") {
                  event.preventDefault();
                  moveCase(0, true);
                } else if (event.key === "End") {
                  event.preventDefault();
                  moveCase(cases.length - 1, true);
                }
              }}
              disabled={!interactive}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <Image src={study.home?.logoPath ?? `/case-sites/${study.slug}.ico`} width={220} height={48} alt="" data-logo-fit={study.home?.logoFit} unoptimized loading="lazy" />
              <strong>{study.domain}</strong>
            </button>
          ))}
        </div>
        <button type="button" className="home-case-explorer__tape-control" onClick={() => moveCase(active + 1)} aria-label={ru ? "Следующий кейс" : "Next case"} disabled={!interactive}>→</button>
      </div>

      <article
        id={panelId}
        key={item.slug}
        className="home-case-explorer__surface"
        role="tabpanel"
        aria-labelledby={tabId(active)}
        data-case={item.slug}
      >
        <div className="home-case-explorer__identity">
          <Image src={logo} width={220} height={48} alt="" data-logo-fit={home?.logoFit} unoptimized loading="lazy" />
          <span>{home?.status ?? (ru ? "Контрольная проверка" : "Control check")} <b>✓</b></span>
        </div>

        <div className="home-case-explorer__story">
          <div>
            <p className="home-case-explorer__eyebrow">{ru ? "Задача" : "Task"}</p>
            <h3>{item.task}</h3>
            <p className="home-case-explorer__summary">{item.lead}</p>
            <ol>
              {steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span>{step}</li>)}
            </ol>
          </div>

          <div className="home-case-explorer__chart-wrap">
            <p>{chartTitle}</p>
            <svg key={`${item.slug}-${metricsRun}`} className="home-case-explorer__chart" viewBox="0 0 652 176" role="img" aria-label={chartAriaLabel}>
              <defs>
                <linearGradient id="case-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4668ff" stopOpacity=".24" />
                  <stop offset="100%" stopColor="#4668ff" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[35, 70, 105, 140].map((line) => <line key={line} x1="24" y1={line} x2="628" y2={line} />)}
              <path className="home-case-explorer__chart-area" d={"M " + chartPoints + " L 628 152 L 24 152 Z"} />
              <polyline className="home-case-explorer__chart-line" points={chartPoints} />
              {chartPointList.map(({ x, y }) => {
                return <circle key={`${x}-${y}`} cx={x} cy={y} r="5" />;
              })}
              {home?.chartMarkers?.map((marker, index) => {
                const point = chartPointList[index];
                if (!point) return null;
                const markerX = Math.min(604, Math.max(48, point.x));
                const markerY = Math.max(16, point.y - 20);
                const markerWidth = Math.max(44, marker.label.length * 9 + 16);
                return (
                  <g
                    className={`home-case-explorer__chart-marker home-case-explorer__chart-marker--${marker.tone}`}
                    key={`${marker.label}-${index}`}
                    transform={`translate(${markerX} ${markerY})`}
                  >
                    <rect x={-markerWidth / 2} y="-13" width={markerWidth} height="22" rx="7" />
                    <text x="0" y="2" textAnchor="middle">{marker.label}</text>
                  </g>
                );
              })}
              <text x="24" y="171">{chartStartLabel}</text>
              <text x="628" y="171" textAnchor="end">{chartEndLabel}</text>
            </svg>
          </div>
        </div>

        <dl className="home-case-explorer__results">
          {resultRows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>
                {row.kind === "text" && row.text}
                {row.kind === "score" && <AnimatedScore key={`${item.slug}-${metricsRun}-score`} from={scoreFrom} to={scoreTo} enabled={metricsVisible} />}
                {row.kind === "pages" && <AnimatedMetric key={`${item.slug}-${metricsRun}-pages`} from={0} to={isEco ? 509 : 575} suffix={` / ${isEco ? 509 : 575}`} enabled={metricsVisible} />}
                {row.kind === "mobilePerformance" && <AnimatedScore key={`${item.slug}-${metricsRun}-mobile-performance`} from={36} to={57} enabled={metricsVisible} />}
                {row.kind === "performance" && <AnimatedMetric key={`${item.slug}-${metricsRun}-performance`} from={0} to={99} suffix=" / 100" enabled={metricsVisible} />}
                {row.kind === "cls" && <AnimatedMetric key={`${item.slug}-${metricsRun}-cls`} from={0.519} to={0.0001} enabled={metricsVisible} format={(metric) => Math.abs(metric - 0.0001) < 0.0002 ? (ru ? "0,0001" : "0.0001") : metric.toLocaleString(ru ? "ru-RU" : "en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} />}
                {row.kind === "images" && <AnimatedScore key={`${item.slug}-${metricsRun}-images`} from={20_314} to={25} enabled={metricsVisible} />}
              </dd>
            </div>
          ))}
        </dl>

        <footer>
          <p>{home?.footer ?? (ru ? "Цифры относятся к этому проекту и подтверждены повторной проверкой." : "These figures apply to this project and were confirmed by a repeat check.")}</p>
          {home?.external ? (
            <a href={home.href} target="_blank" rel="noreferrer">{home.linkLabel} <span aria-hidden="true">↗</span></a>
          ) : (
            <Link href={home?.href ?? localizedPath(locale, `cases/${item.slug}`)}>{home?.linkLabel ?? (ru ? "Открыть разбор с доказательствами" : "Open the evidence review")} <span aria-hidden="true">↗</span></Link>
          )}
        </footer>
      </article>
    </section>
  );
}
