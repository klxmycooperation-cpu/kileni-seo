"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import type { Locale } from "../../config/site";
import { INTRO_FINISHED_EVENT } from "../home/brand-intro-config";

type Point = {
  label: string;
  value: number;
  tooltip: string;
};

export type TechnicalScoreValues = {
  score: number;
  performance: number;
  seo: number;
  accessibility: number;
  recommendations: number;
};

const baselineTechnicalScore: TechnicalScoreValues = {
  score: 89,
  performance: 92,
  seo: 88,
  accessibility: 95,
  recommendations: 81,
};

function useVisualReveal(waitForIntro = false) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [inViewport, setInViewport] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    const subscribe = () => {
      if (typeof media.addEventListener === "function") media.addEventListener("change", sync);
      else media.addListener(sync);
    };
    const unsubscribe = () => {
      if (typeof media.removeEventListener === "function") media.removeEventListener("change", sync);
      else media.removeListener(sync);
    };
    sync();
    subscribe();

    const node = ref.current;
    if (!node) return unsubscribe;

    let introReady = !waitForIntro
      || !document.documentElement.dataset.kileniIntro
      || document.documentElement.dataset.kileniIntro === "done";
    let visible = false;
    let fallback: number | undefined;
    let introObserver: MutationObserver | undefined;

    const revealWhenReady = () => {
      if (!introReady) return;
      if (media.matches || visible) setReady(true);
    };
    const onIntroFinished = () => {
      introReady = true;
      window.removeEventListener(INTRO_FINISHED_EVENT, onIntroFinished);
      introObserver?.disconnect();
      introObserver = undefined;
      revealWhenReady();
    };

    if (!introReady) {
      window.addEventListener(INTRO_FINISHED_EVENT, onIntroFinished, { once: true });
      introObserver = new MutationObserver(() => {
        if (document.documentElement.dataset.kileniIntro === "done") onIntroFinished();
      });
      introObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-kileni-intro"] });
    }

    // A 1% threshold also works for short landscape screens. The hero keeps
    // observing after its single reveal so its finite motion can pause when a
    // visitor scrolls away before the run has finished.
    const observer = typeof IntersectionObserver === "function"
      ? new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting;
          setInViewport(visible);
          revealWhenReady();
          if (!waitForIntro && visible) observer?.disconnect();
        },
        { threshold: 0.01, rootMargin: "160px 0px" },
      )
      : null;

    if (observer) observer.observe(node);
    else {
      visible = true;
      setInViewport(true);
      fallback = window.setTimeout(revealWhenReady, 0);
    }

    return () => {
      window.clearTimeout(fallback);
      observer?.disconnect();
      introObserver?.disconnect();
      window.removeEventListener(INTRO_FINISHED_EVENT, onIntroFinished);
      unsubscribe();
    };
  }, [waitForIntro]);

  return { ref, ready, reducedMotion, inViewport };
}

function useCountUp(value: number, ready: boolean, reducedMotion: boolean, duration = 1250) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (!ready) return;
    if (reducedMotion) {
      setDisplay(value);
      return;
    }

    setDisplay(0);
    const startedAt = performance.now();
    let frame = 0;
    const render = (now: number) => {
      const progress = Math.min(Math.max((now - startedAt) / duration, 0), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [duration, ready, reducedMotion, value]);

  return display;
}

function localeNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US").format(value);
}

function MetricHeader({
  title,
  value,
  suffix = "",
  delta,
  caption,
  ready,
  reducedMotion,
  locale,
}: {
  title: string;
  value: number;
  suffix?: string;
  delta: string;
  caption: string;
  ready: boolean;
  reducedMotion: boolean;
  locale: Locale;
}) {
  const number = useCountUp(value, ready, reducedMotion);
  return (
    <header className="analytics-metric-header">
      <p>{title}</p>
      <div><strong>{localeNumber(number, locale)}{suffix}</strong><span className="analytics-delta">{delta}</span></div>
      <small>{caption}</small>
    </header>
  );
}

type TrendTick = { label: string; value: number };
type TrendStage = { index: number; label: string };
type TrendChip = { label: string; value: string; success?: boolean };

function DetailedTrendChart({
  locale,
  points,
  ready,
  ariaLabel,
  yTicks,
  target,
  stages,
  chips,
  statuses,
  finalLabel,
  kind = "blue",
}: {
  locale: Locale;
  points: Point[];
  ready: boolean;
  ariaLabel: string;
  yTicks: TrendTick[];
  target?: { from: number; to: number; label: string };
  stages: TrendStage[];
  chips: TrendChip[];
  statuses: string[];
  finalLabel: string;
  kind?: "blue" | "errors";
}) {
  const id = useId().replace(/:/g, "");
  const [hovered, setHovered] = useState<number | null>(null);
  const frame = { left: 48, top: 25, width: 462, height: 174 };
  const high = yTicks[0]?.value ?? 100;
  const low = yTicks.at(-1)?.value ?? 0;
  const range = Math.max(high - low, 1);
  const pointAt = (value: number, index: number) => ({
    x: frame.left + (index / Math.max(points.length - 1, 1)) * frame.width,
    y: frame.top + ((high - value) / range) * frame.height,
  });
  const plotted = points.map((point, index) => ({ ...point, ...pointAt(point.value, index) }));
  const path = plotted.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const area = `${path} L${(frame.left + frame.width).toFixed(2)} ${(frame.top + frame.height).toFixed(2)} L${frame.left} ${(frame.top + frame.height).toFixed(2)} Z`;
  const active = plotted[hovered ?? plotted.length - 1];
  const tooltipX = Math.min(Math.max(active.x, 92), 474);
  const tooltipY = Math.max(active.y - 42, 10);
  const last = plotted.at(-1);
  const previous = plotted.at(-2);
  const labelWidth = Math.max(40, Math.min(76, finalLabel.length * 6.2 + 14));
  const errorTrend = kind === "errors";

  return (
    <div className="analytics-detail-trend" data-ready={ready ? "true" : "false"} aria-label={ariaLabel}>
      <div className={`analytics-visibility-detail analytics-trend-detail${errorTrend ? " analytics-trend-detail--errors" : ""}`}>
        <svg viewBox="0 0 560 238" role="group" aria-label={ariaLabel}>
          <defs>
            <linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" className={errorTrend ? "analytics-trend-detail__risk-fill" : "analytics-visibility-detail__area-top"} />
              <stop offset="100%" className="analytics-visibility-detail__area-bottom" />
            </linearGradient>
            {errorTrend && (
              <linearGradient id={`${id}-line`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" className="analytics-trend-detail__risk-stop" />
                <stop offset="64%" className="analytics-trend-detail__neutral-stop" />
                <stop offset="100%" className="analytics-trend-detail__success-stop" />
              </linearGradient>
            )}
          </defs>
          {target && (
            <>
              <rect
                className="analytics-visibility-detail__target-zone"
                x={frame.left}
                y={pointAt(target.to, 0).y}
                width={frame.width}
                height={Math.max(4, pointAt(target.from, 0).y - pointAt(target.to, 0).y)}
                rx="5"
              />
              <text className="analytics-visibility-detail__target-label" x={frame.left + 8} y={pointAt(target.to, 0).y + 13}>{target.label}</text>
            </>
          )}
          {yTicks.map((tick) => (
            <g key={tick.label}>
              <line className="analytics-visibility-detail__grid" x1={frame.left} x2={frame.left + frame.width} y1={pointAt(tick.value, 0).y} y2={pointAt(tick.value, 0).y} />
              <text className="analytics-visibility-detail__axis" x="0" y={pointAt(tick.value, 0).y + 4}>{tick.label}</text>
            </g>
          ))}
          <path className="analytics-visibility-detail__area" d={area} fill={`url(#${id}-area)`} />
          <path className="analytics-visibility-detail__line" d={path} pathLength="100" stroke={errorTrend ? `url(#${id}-line)` : undefined} />
          {previous && last && <path className="analytics-visibility-detail__projection" d={`M${previous.x} ${previous.y} L${last.x} ${last.y} L${frame.left + frame.width + 17} ${Math.max(frame.top, last.y - 8)}`} />}
          {stages.map((stage) => {
            const point = plotted[stage.index];
            if (!point) return null;
            const width = Math.max(58, Math.min(88, stage.label.length * 5 + 15));
            const x = Math.min(Math.max(frame.left, point.x - width / 2), frame.left + frame.width - width);
            return <g className="analytics-visibility-detail__stage" key={stage.label} transform={`translate(${x} ${Math.max(frame.top + 16, point.y - 30)})`}><rect width={width} height="17" rx="8.5" /><text x={width / 2} y="11.5">{stage.label}</text></g>;
          })}
          {plotted.map((point, index) => {
            const pointTone = errorTrend
              ? index < Math.floor(plotted.length * 0.45)
                ? "is-risk"
                : index === plotted.length - 1
                  ? "is-success"
                  : "is-neutral"
              : "";

            return (
              <g
              className="analytics-visibility-detail__point-wrap"
              key={`${point.label}-${index}`}
              tabIndex={0}
              role="button"
              aria-label={`${point.label || (locale === "ru" ? "Промежуточное значение" : "Intermediate value")}: ${point.tooltip}`}
              onFocus={() => setHovered(index)}
              onBlur={() => setHovered(null)}
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
              onPointerDown={() => setHovered(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setHovered((current) => current === index ? null : index);
                }
              }}
              style={{ "--point-delay": `${520 + index * 76}ms` } as CSSProperties}
            >
              <circle className="analytics-visibility-detail__hit" cx={point.x} cy={point.y} r="10" />
              <circle className={`analytics-visibility-detail__point ${pointTone}`} cx={point.x} cy={point.y} r={index === plotted.length - 1 ? "4.8" : "2.8"} />
            </g>
            );
          })}
          {hovered !== null && <g className="analytics-visibility-detail__tooltip" transform={`translate(${tooltipX} ${tooltipY})`}><rect x="-42" y="-19" width="84" height="33" rx="7" /><text x="0" y="-6">{active.label || (locale === "ru" ? "Этап" : "Stage")}</text><text className="analytics-visibility-detail__tooltip-value" x="0" y="7">{active.tooltip}</text></g>}
          <g className="analytics-visibility-detail__end-tag" transform={`translate(${last?.x ?? 0} ${(last?.y ?? 0) - 26})`}><rect x={-labelWidth / 2} y="-14" width={labelWidth} height="20" rx="6" /><text x="0" y="0">{finalLabel}</text></g>
          {errorTrend && last && <g className="analytics-trend-detail__check" transform={`translate(${last.x + 17} ${last.y - 4})`}><circle r="8" /><path d="M-3 0 L-1.1 2.1 L3.2 -3" /></g>}
          {plotted.filter((point) => point.label).map((point) => <text className="analytics-visibility-detail__month" key={point.label} x={point.x} y="226">{point.label}</text>)}
        </svg>
        <p className="analytics-visibility-detail__summary" aria-live="polite" aria-atomic="true">{active.label || (locale === "ru" ? "Промежуточный этап" : "Intermediate stage")}: <strong>{active.tooltip}</strong></p>
      </div>
      <div className="analytics-visibility-detail__chips" aria-label={locale === "ru" ? "Ключевые показатели" : "Key indicators"}>
        {chips.map((chip, index) => <span className={chip.success ? "is-success" : ""} key={chip.label} style={{ "--chip-delay": `${1080 + index * 75}ms` } as CSSProperties}><small>{chip.label}</small><strong>{chip.value}</strong></span>)}
      </div>
      <div className="analytics-hero-chart__statuses" aria-label={locale === "ru" ? "Положительные изменения" : "Positive signals"}>
        {statuses.map((status, index) => <span key={status} style={{ "--status-delay": `${1180 + index * 120}ms` } as CSSProperties}><i aria-hidden="true" />{status}</span>)}
      </div>
    </div>
  );
}

function VisibilityChart({ locale }: { locale: Locale }) {
  const { ref, ready, reducedMotion, inViewport } = useVisualReveal(true);
  const chartId = useId().replace(/:/g, "");
  const ru = locale === "ru";
  const [hovered, setHovered] = useState<number | null>(null);
  const [animationRun, setAnimationRun] = useState(0);

  useEffect(() => {
    if (!ready || reducedMotion || !inViewport) return;
    const timer = window.setInterval(() => setAnimationRun((run) => run + 1), 15_000);
    return () => window.clearInterval(timer);
  }, [inViewport, ready, reducedMotion]);
  const points = ru
    ? [
      { label: "Мар", value: 34, detail: "Старт замера" }, { label: "", value: 37, detail: "Первые правки" },
      { label: "Апр", value: 36, detail: "Небольшая просадка" }, { label: "", value: 42, detail: "Страницы в индексе" },
      { label: "Май", value: 50, detail: "Уточнили структуру" }, { label: "", value: 49, detail: "Поиск повторно проверил страницы" },
      { label: "Июн", value: 54, detail: "Добавили полезные материалы" }, { label: "", value: 56, detail: "Обновили названия и описания" },
      { label: "", value: 55, detail: "Обычное колебание" }, { label: "Июл", value: 61, detail: "Сайт чаще появляется в поиске" },
      { label: "", value: 66, detail: "Точнее ответили на запросы" }, { label: "", value: 64, detail: "Небольшое снижение" },
      { label: "Авг", value: 68, detail: "Текущее значение" },
    ]
    : [
      { label: "Mar", value: 34, detail: "Starting point" }, { label: "", value: 37, detail: "First fixes" },
      { label: "Apr", value: 36, detail: "Small dip" }, { label: "", value: 42, detail: "Pages indexed" },
      { label: "May", value: 50, detail: "Structure refined" }, { label: "", value: 49, detail: "Pages re-crawled" },
      { label: "Jun", value: 54, detail: "Content expanded" }, { label: "", value: 56, detail: "Metadata refreshed" },
      { label: "", value: 55, detail: "Natural volatility" }, { label: "Jul", value: 61, detail: "Visibility growing" },
      { label: "", value: 66, detail: "Relevance strengthened" }, { label: "", value: 64, detail: "Planned dip" },
      { label: "Aug", value: 68, detail: "Current reference" },
    ];
  const frame = { left: 20, top: 25, width: 520, height: 174 };
  const pointAt = (value: number, index: number) => ({
    x: frame.left + (index / (points.length - 1)) * frame.width,
    y: frame.top + ((100 - value) / 100) * frame.height,
  });
  const plotted = points.map((point, index) => ({ ...point, ...pointAt(point.value, index) }));
  const path = plotted.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const area = `${path} L${(frame.left + frame.width).toFixed(2)} ${(frame.top + frame.height).toFixed(2)} L${frame.left} ${(frame.top + frame.height).toFixed(2)} Z`;
  const active = plotted[hovered ?? plotted.length - 1];
  const tooltipX = Math.min(Math.max(active.x, 92), 474);
  const tooltipY = Math.max(active.y - 42, 10);
  const number = useCountUp(68, ready, reducedMotion);
  const chips = ru
    ? [{ label: "Целевые переходы", value: "+24%" }, { label: "Переходы из поиска", value: "4,7%" }, { label: "Доступны поиску", value: "92/100" }, { label: "Ошибки сайта", value: "−28%" }]
    : [{ label: "Target visits", value: "+24%" }, { label: "CTR", value: "4.7%" }, { label: "Indexed", value: "92/100" }, { label: "Tech issues", value: "−28%" }];
  const chartTitle = ru ? "Динамика поисковой видимости с марта по август" : "Search visibility trend from March to August";
  const spokenMonths = ru
    ? ["Март", "Март", "Апрель", "Апрель", "Май", "Май", "Июнь", "Июнь", "Июнь", "Июль", "Июль", "Июль", "Август"]
    : ["March", "March", "April", "April", "May", "May", "June", "June", "June", "July", "July", "July", "August"];
  const chartDescription = points
    .map((point, index) => `${spokenMonths[index]}: ${point.value}%. ${point.detail}`)
    .join("; ");

  return (
    <div className="analytics-hero-chart" ref={ref} data-testid="hero-search-visibility" data-ready={ready ? "true" : "false"} data-in-viewport={inViewport ? "true" : "false"} data-visualisation-run={animationRun}>
      <header className="analytics-hero-chart__header">
        <p>{ru ? "Поисковая видимость" : "Search visibility"}</p>
        <span className="analytics-hero-chart__mode"><i aria-hidden="true" />{ru ? "Обзор за месяц" : "Monthly overview"}</span>
      </header>
      <div className="analytics-hero-chart__metric">
        <div className="analytics-hero-chart__metric-primary"><p>{ru ? "средняя видимость" : "average visibility"}</p><strong>{number}%</strong></div>
        <div className="analytics-hero-chart__metric-change"><span>{ru ? "Изменение" : "Change"}</span><b className="analytics-delta">↑17%</b><small>{ru ? "за период" : "over the period"}</small></div>
        <div className="analytics-hero-chart__metric-context"><span>{ru ? "Доступны поиску" : "Indexed"}</span><b>92/100</b><small>{ru ? "проверенных страниц" : "checked pages"}</small></div>
      </div>
      <div className="analytics-visibility-detail" key={animationRun}>
        <div className="analytics-chart-chrome" aria-hidden="true"><span>{ru ? "Динамика" : "Trend"}</span><b>{ru ? "Март — август" : "March — August"}</b><i /></div>
        <svg viewBox="0 0 560 238" preserveAspectRatio="xMidYMid meet" role="group" aria-labelledby={`${chartId}-title ${chartId}-description`}>
          <title id={`${chartId}-title`}>{chartTitle}</title>
          <desc id={`${chartId}-description`}>{chartDescription}</desc>
          <defs>
            <linearGradient id={`${chartId}-area`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" className="analytics-visibility-detail__area-top" />
              <stop offset="100%" className="analytics-visibility-detail__area-bottom" />
            </linearGradient>
            <linearGradient id={`${chartId}-line`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7694ff" />
              <stop offset="58%" stopColor="#66c7ff" />
              <stop offset="100%" stopColor="#70e1b0" />
            </linearGradient>
          </defs>
          <rect className="analytics-visibility-detail__target-zone" x={frame.left} y={pointAt(75, 0).y} width={frame.width} height={pointAt(60, 0).y - pointAt(75, 0).y} rx="5" />
          <text className="analytics-visibility-detail__target-label" x={frame.left + 8} y={pointAt(75, 0).y + 13}>{ru ? "целевой диапазон" : "target range"}</text>
          {[100, 75, 50, 25, 0].map((value) => (
            <g key={value}>
              <line className="analytics-visibility-detail__grid" x1={frame.left} x2={frame.left + frame.width} y1={pointAt(value, 0).y} y2={pointAt(value, 0).y} />
              <text className="analytics-visibility-detail__axis" x="0" y={pointAt(value, 0).y + 4}>{value}%</text>
            </g>
          ))}
          <path className="analytics-visibility-detail__area" d={area} fill={`url(#${chartId}-area)`} />
          <path className="analytics-visibility-detail__line-glow" d={path} pathLength="100" style={{ stroke: `url(#${chartId}-line)` }} />
          <path className="analytics-visibility-detail__line" d={path} pathLength="100" style={{ stroke: `url(#${chartId}-line)` }} />
          <path className="analytics-visibility-detail__projection" d={`M${plotted.at(-2)?.x} ${plotted.at(-2)?.y} L${plotted.at(-1)?.x} ${plotted.at(-1)?.y} L${frame.left + frame.width + 17} ${Math.max(frame.top, (plotted.at(-1)?.y ?? 0) - 8)}`} />
          {[{ index: 4, label: ru ? "структура" : "structure" }, { index: 7, label: ru ? "контент" : "content" }].map((stage) => {
            const point = plotted[stage.index];
            return <g className="analytics-visibility-detail__stage" key={stage.label} transform={`translate(${point.x - 29} ${Math.max(frame.top + 16, point.y - 30)})`}><rect width="58" height="17" rx="8.5" /><text x="29" y="11.5">{stage.label}</text></g>;
          })}
          {plotted.map((point, index) => (
            <g
              className={`analytics-visibility-detail__point-wrap analytics-visibility-detail__point-wrap--${index >= 10 ? "mint" : index >= 7 ? "cyan" : index >= 4 ? "amber" : "blue"}`}
              key={`${point.label}-${index}`}
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
              onPointerDown={() => setHovered(index)}
              style={{ "--point-delay": `${520 + index * 76}ms` } as CSSProperties}
            >
              <circle className="analytics-visibility-detail__hit" cx={point.x} cy={point.y} r="10" />
              <circle className="analytics-visibility-detail__point" cx={point.x} cy={point.y} r={index === plotted.length - 1 ? "4.8" : "2.8"} />
            </g>
          ))}
          {[
            { index: 0, tone: "blue", offset: -17 },
            { index: 6, tone: "amber", offset: 24 },
            { index: 9, tone: "cyan", offset: -17 },
          ].map(({ index, tone, offset }) => {
            const point = plotted[index];
            return (
              <g
                aria-hidden="true"
                className={`analytics-visibility-detail__value-tag analytics-visibility-detail__value-tag--${tone}`}
                key={`${tone}-${point.value}`}
                transform={`translate(${point.x} ${point.y + offset})`}
              >
                <rect x="-19" y="-12" width="38" height="18" rx="6" />
                <text x="0" y="1">{point.value}%</text>
              </g>
            );
          })}
          {hovered !== null && <g className="analytics-visibility-detail__tooltip" transform={`translate(${tooltipX} ${tooltipY})`}><rect x="-42" y="-19" width="84" height="33" rx="7" /><text x="0" y="-6">{active.label || (ru ? "Этап" : "Stage")}</text><text className="analytics-visibility-detail__tooltip-value" x="0" y="7">{active.value}%</text></g>}
          <g className="analytics-visibility-detail__end-tag" transform={`translate(${plotted.at(-1)?.x ?? 0} ${(plotted.at(-1)?.y ?? 0) - 26})`}><rect x="-18" y="-14" width="40" height="20" rx="6" /><text x="2" y="0">68%</text></g>
          {plotted.filter((point) => point.label).map((point) => <text className="analytics-visibility-detail__month" key={point.label} x={point.x} y="226">{point.label}</text>)}
        </svg>
        <p className="analytics-visibility-detail__summary" aria-live="polite" aria-atomic="true">{active.label || (ru ? "Промежуточный этап" : "Intermediate stage")}: <strong>{active.value}%</strong> — {active.detail}</p>
      </div>
      <div className="analytics-visibility-detail__chips" aria-label={ru ? "Ключевые показатели" : "Key indicators"}>
        {chips.map((chip, index) => <span key={chip.label} style={{ "--chip-delay": `${1080 + index * 75}ms` } as CSSProperties}><small>{chip.label}</small><strong>{chip.value}</strong></span>)}
      </div>
      <div className="analytics-hero-chart__statuses" aria-label={ru ? "Положительные изменения" : "Positive signals"}>
        {(ru ? ["Показы ↑", "Переходы ↑", "Ошибки ↓", "Страницы ↑", "Скорость ↑"] : ["Visibility ↑", "CTR ↑", "Errors ↓", "Pages ↑", "Speed ↑"]).map((status, index) => (
          <span key={status} style={{ "--status-delay": `${1180 + index * 120}ms` } as CSSProperties}><i aria-hidden="true" />{status}</span>
        ))}
      </div>
    </div>
  );
}

export function HeroSearchVisibilityVisual({ locale }: { locale: Locale }) {
  const ru = locale === "ru";

  return (
    <figure className="hero-audit-visual analytics-card analytics-card--hero" aria-label={ru ? "Поисковая видимость" : "Search visibility"}>
      <VisibilityChart locale={locale} />
      <figcaption className="analytics-demo-caption">
        {ru
          ? "График показывает, как может меняться видимость сайта после исправлений. Это пример, а не результат клиента."
          : "The chart shows how a website's search visibility can change after improvements. This is an example, not a client result."}
      </figcaption>
    </figure>
  );
}

function TechScoreCard({ locale, values = baselineTechnicalScore }: { locale: Locale; values?: TechnicalScoreValues }) {
  const { ref, ready, reducedMotion } = useVisualReveal();
  const ru = locale === "ru";
  const score = useCountUp(values.score, ready, reducedMotion);
  const bars = ru
    ? [{ label: "Производительность", value: values.performance }, { label: "SEO", value: values.seo }, { label: "Доступность", value: values.accessibility }, { label: "Рекомендации", value: values.recommendations }]
    : [{ label: "Performance", value: values.performance }, { label: "SEO", value: values.seo }, { label: "Accessibility", value: values.accessibility }, { label: "Best practices", value: values.recommendations }];

  return (
    <article ref={ref} className="analytics-card analytics-score-card" data-ready={ready ? "true" : "false"}>
      <header className="analytics-card__eyebrow"><span>{ru ? "Техническая оценка сайта" : "Technical site score"}</span></header>
      <div className="analytics-gauge" aria-label={`${ru ? "Техническая оценка" : "Technical score"}: ${score} из 100`}>
        <svg viewBox="0 0 200 126" aria-hidden="true">
          <path className="analytics-gauge__track" pathLength="100" d="M20 105 A80 80 0 0 1 180 105" />
          <path className="analytics-gauge__value" pathLength="100" d="M20 105 A80 80 0 0 1 180 105" style={{ "--gauge-offset": "11" } as CSSProperties} />
        </svg>
        <div><strong>{score}</strong><span>/100</span><p>{ru ? "Хорошая база" : "A strong baseline"}</p></div>
      </div>
      <div className="analytics-score-bars">
        {bars.map((bar, index) => (
          <div key={bar.label} className="analytics-score-bar" style={{ "--bar-value": `${bar.value}%`, "--bar-delay": `${980 + index * 135}ms` } as CSSProperties}>
            <div><span>{bar.label}</span><strong>{bar.value}/100</strong></div><i aria-hidden="true"><b /></i>
          </div>
        ))}
      </div>
      <p className="analytics-legend"><i aria-hidden="true" />{ru ? "Оценка помогает расставить приоритеты; это не обещание позиций." : "The score helps prioritise work; it is not a ranking guarantee."}</p>
    </article>
  );
}

export function SeoAuditScoreVisual({ locale, values }: { locale: Locale; values?: TechnicalScoreValues }) {
  const ru = locale === "ru";
  return (
    <section className="svc-decision-section service-analytics-section service-analytics-section--audit" aria-labelledby="technical-score-title">
      <div className="shell service-analytics-layout">
        <header><p className="svc-kicker">{ru ? "Как читать показатели аудита" : "How to read the audit metrics"}</p><h2 id="technical-score-title">{ru ? "Сначала видим общую картину, затем разбираем причины" : "First see the overall picture, then investigate the causes"}</h2><p>{ru ? "В полном аудите показатели рассчитываются по проверенному сайту и помогают определить порядок работ." : "In a full audit, the metrics are calculated from the checked website and help prioritise the work."}</p></header>
        <TechScoreCard locale={locale} values={values} />
      </div>
    </section>
  );
}

function TrafficCard({ locale }: { locale: Locale }) {
  const { ref, ready, reducedMotion } = useVisualReveal();
  const ru = locale === "ru";
  const points: Point[] = ru
    ? [
      { label: "Мар", value: 12100, tooltip: "12 100" }, { label: "", value: 13200, tooltip: "13 200" },
      { label: "Апр", value: 12800, tooltip: "12 800" }, { label: "", value: 15800, tooltip: "15 800" },
      { label: "Май", value: 15100, tooltip: "15 100" }, { label: "", value: 14100, tooltip: "14 100" },
      { label: "Июн", value: 16900, tooltip: "16 900" }, { label: "", value: 20300, tooltip: "20 300" },
      { label: "", value: 23400, tooltip: "23 400" }, { label: "Июл", value: 22100, tooltip: "22 100" },
      { label: "", value: 23600, tooltip: "23 600" }, { label: "", value: 25900, tooltip: "25 900" },
      { label: "Авг", value: 27842, tooltip: "27 842" },
    ]
    : [
      { label: "Mar", value: 12100, tooltip: "12,100" }, { label: "", value: 13200, tooltip: "13,200" },
      { label: "Apr", value: 12800, tooltip: "12,800" }, { label: "", value: 15800, tooltip: "15,800" },
      { label: "May", value: 15100, tooltip: "15,100" }, { label: "", value: 14100, tooltip: "14,100" },
      { label: "Jun", value: 16900, tooltip: "16,900" }, { label: "", value: 20300, tooltip: "20,300" },
      { label: "", value: 23400, tooltip: "23,400" }, { label: "Jul", value: 22100, tooltip: "22,100" },
      { label: "", value: 23600, tooltip: "23,600" }, { label: "", value: 25900, tooltip: "25,900" },
      { label: "Aug", value: 27842, tooltip: "27,842" },
    ];
  return (
    <article className="analytics-card analytics-time-card" ref={ref} data-ready={ready ? "true" : "false"}>
      <MetricHeader locale={locale} title={ru ? "Переходы из поиска" : "Organic traffic"} value={27842} delta="↑28.4%" caption={ru ? "посетителей в месяц" : "visitors per month"} ready={ready} reducedMotion={reducedMotion} />
      <DetailedTrendChart
        locale={locale}
        points={points}
        ready={ready}
        ariaLabel={ru ? "Динамика органического трафика" : "Organic traffic trend"}
        yTicks={[{ label: "30K", value: 30000 }, { label: "20K", value: 20000 }, { label: "10K", value: 10000 }, { label: "0", value: 0 }]}
        target={{ from: 20000, to: 25000, label: ru ? "целевой диапазон" : "target range" }}
        stages={[{ index: 3, label: ru ? "основа" : "foundation" }, { index: 8, label: ru ? "контент" : "content" }]}
        chips={ru ? [{ label: "Видимость", value: "+17%", success: true }, { label: "Переходы", value: "+28,4%", success: true }, { label: "CTR", value: "4,7%" }, { label: "Страницы", value: "92/100" }] : [{ label: "Visibility", value: "+17%", success: true }, { label: "Visits", value: "+28.4%", success: true }, { label: "CTR", value: "4.7%" }, { label: "Pages", value: "92/100" }]}
        statuses={ru ? ["Видимость ↑", "Переходы ↑", "CTR ↑"] : ["Visibility ↑", "Visits ↑", "CTR ↑"]}
        finalLabel={ru ? "27 842" : "27,842"}
      />
      <p className="analytics-legend"><i aria-hidden="true" />{ru ? "Рост органических переходов — цель работы, а не гарантированный результат." : "Growth in organic visits is the goal of the work, not a guaranteed outcome."}</p>
    </article>
  );
}

function CtrCard({ locale }: { locale: Locale }) {
  const { ref, ready, reducedMotion } = useVisualReveal();
  const ru = locale === "ru";
  const points: Point[] = ru
    ? [
      { label: "Мар", value: 1.2, tooltip: "1,2%" }, { label: "", value: 1.5, tooltip: "1,5%" },
      { label: "Апр", value: 2.5, tooltip: "2,5%" }, { label: "", value: 2.4, tooltip: "2,4%" },
      { label: "Май", value: 2.3, tooltip: "2,3%" }, { label: "", value: 3.1, tooltip: "3,1%" },
      { label: "Июн", value: 3.9, tooltip: "3,9%" }, { label: "", value: 4.2, tooltip: "4,2%" },
      { label: "", value: 3.8, tooltip: "3,8%" }, { label: "Июл", value: 3.7, tooltip: "3,7%" },
      { label: "", value: 4.4, tooltip: "4,4%" }, { label: "", value: 4.1, tooltip: "4,1%" },
      { label: "Авг", value: 4.7, tooltip: "4,7%" },
    ]
    : [
      { label: "Mar", value: 1.2, tooltip: "1.2%" }, { label: "", value: 1.5, tooltip: "1.5%" },
      { label: "Apr", value: 2.5, tooltip: "2.5%" }, { label: "", value: 2.4, tooltip: "2.4%" },
      { label: "May", value: 2.3, tooltip: "2.3%" }, { label: "", value: 3.1, tooltip: "3.1%" },
      { label: "Jun", value: 3.9, tooltip: "3.9%" }, { label: "", value: 4.2, tooltip: "4.2%" },
      { label: "", value: 3.8, tooltip: "3.8%" }, { label: "Jul", value: 3.7, tooltip: "3.7%" },
      { label: "", value: 4.4, tooltip: "4.4%" }, { label: "", value: 4.1, tooltip: "4.1%" },
      { label: "Aug", value: 4.7, tooltip: "4.7%" },
    ];
  const display = useCountUp(47, ready, reducedMotion);
  return (
    <article className="analytics-card analytics-time-card" ref={ref} data-ready={ready ? "true" : "false"}>
      <header className="analytics-metric-header"><p>{ru ? "CTR в поиске" : "Search CTR"}</p><div><strong>{(display / 10).toLocaleString(ru ? "ru-RU" : "en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</strong><span className="analytics-delta">↑0.9 {ru ? "п.п." : "pp"}</span></div><small>{ru ? "средний CTR" : "average CTR"}</small></header>
      <p className="analytics-definition">{ru ? "CTR — доля пользователей, которые увидели сайт в поиске и перешли на него." : "CTR is the share of people who see a site in search and click through."}</p>
      <DetailedTrendChart
        locale={locale}
        points={points}
        ready={ready}
        ariaLabel={ru ? "Динамика CTR в поиске" : "Search CTR trend"}
        yTicks={[{ label: "6%", value: 6 }, { label: "4%", value: 4 }, { label: "2%", value: 2 }, { label: "0%", value: 0 }]}
        target={{ from: 4, to: 5, label: ru ? "целевой диапазон" : "target range" }}
        stages={[{ index: 3, label: ru ? "вид в поиске" : "snippets" }, { index: 8, label: ru ? "проверка" : "review" }]}
        chips={ru ? [{ label: "Показы", value: "+17%", success: true }, { label: "CTR", value: "4,7%", success: true }, { label: "Вид в поиске", value: "обновлён" }, { label: "Переходы", value: "+28,4%", success: true }] : [{ label: "Impressions", value: "+17%", success: true }, { label: "CTR", value: "4.7%", success: true }, { label: "Snippets", value: "refined" }, { label: "Visits", value: "+28.4%", success: true }]}
        statuses={ru ? ["Показы ↑", "CTR ↑", "Переходы ↑"] : ["Impressions ↑", "CTR ↑", "Visits ↑"]}
        finalLabel={ru ? "4,7%" : "4.7%"}
      />
      <p className="analytics-legend"><i aria-hidden="true" />{ru ? "Переходов может стать больше после улучшения заголовков и описаний страниц в поиске." : "Click-through rate can improve after clear work on snippets and pages."}</p>
    </article>
  );
}

export function SeoPromotionMetricsVisual({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  return (
    <section className="svc-decision-section service-analytics-section service-analytics-section--promotion" aria-labelledby="promotion-metrics-title">
      <div className="shell"><header className="service-analytics-heading"><p className="svc-kicker">{ru ? "Что отслеживаем каждый месяц" : "What we monitor every month"}</p><h2 id="promotion-metrics-title">{ru ? "Сравниваем динамику нескольких показателей" : "We compare trends across several metrics"}</h2><p>{ru ? "Показываем динамику, объясняем колебания и сверяемся с тем, что реально изменили на сайте." : "We show the trend, explain fluctuations and compare them with the actual changes made on the site."}</p></header><div className="analytics-time-grid"><TrafficCard locale={locale} /><CtrCard locale={locale} /></div></div>
    </section>
  );
}

export function CaseErrorsVisual({ locale }: { locale: Locale }) {
  const { ref, ready, reducedMotion } = useVisualReveal();
  const ru = locale === "ru";
  const current = useCountUp(27842, ready, reducedMotion);
  const growth = useCountUp(15742, ready, reducedMotion);
  const points: Point[] = ru
    ? [
      { label: "Мар", value: 12100, tooltip: "12 100" }, { label: "", value: 13040, tooltip: "13 040" },
      { label: "Апр", value: 12820, tooltip: "12 820" }, { label: "", value: 15100, tooltip: "15 100" },
      { label: "Май", value: 16800, tooltip: "16 800" }, { label: "", value: 16420, tooltip: "16 420" },
      { label: "Июн", value: 19030, tooltip: "19 030" }, { label: "", value: 20500, tooltip: "20 500" },
      { label: "Июл", value: 20180, tooltip: "20 180" }, { label: "", value: 23220, tooltip: "23 220" },
      { label: "", value: 24600, tooltip: "24 600" }, { label: "", value: 24170, tooltip: "24 170" },
      { label: "Авг", value: 27842, tooltip: "27 842" },
    ]
    : [
      { label: "Mar", value: 12100, tooltip: "12,100" }, { label: "", value: 13040, tooltip: "13,040" },
      { label: "Apr", value: 12820, tooltip: "12,820" }, { label: "", value: 15100, tooltip: "15,100" },
      { label: "May", value: 16800, tooltip: "16,800" }, { label: "", value: 16420, tooltip: "16,420" },
      { label: "Jun", value: 19030, tooltip: "19,030" }, { label: "", value: 20500, tooltip: "20,500" },
      { label: "Jul", value: 20180, tooltip: "20,180" }, { label: "", value: 23220, tooltip: "23,220" },
      { label: "", value: 24600, tooltip: "24,600" }, { label: "", value: 24170, tooltip: "24,170" },
      { label: "Aug", value: 27842, tooltip: "27,842" },
    ];
  return (
    <article className="analytics-card analytics-errors-card" ref={ref} data-ready={ready ? "true" : "false"} aria-label={ru ? "Рост переходов и поисковой видимости" : "Growth in search visits and visibility"}>
      <header className="analytics-metric-header">
        <p>{ru ? "Переходы из поиска" : "Visits from search"}</p>
        <div><strong>{localeNumber(current, locale)}</strong><span className="analytics-delta analytics-delta--higher">↑130%</span></div>
        <small>{ru ? "посетителей в месяц · пример динамики после изменений" : "monthly visitors · example trend after improvements"}</small>
      </header>
      <DetailedTrendChart
        locale={locale}
        points={points}
        ready={ready}
        ariaLabel={ru ? "Рост переходов из поиска по месяцам" : "Monthly growth in visits from search"}
        yTicks={[{ label: "30K", value: 30000 }, { label: "20K", value: 20000 }, { label: "10K", value: 10000 }, { label: "0", value: 0 }]}
        target={{ from: 22000, to: 28000, label: ru ? "целевой диапазон" : "target range" }}
        stages={[{ index: 4, label: ru ? "структура" : "structure" }, { index: 8, label: ru ? "контент" : "content" }]}
        chips={ru ? [{ label: "Переходы", value: "12 100 → 27 842", success: true }, { label: "Страницы", value: "575/575", success: true }, { label: "Видимость", value: "34% → 68%", success: true }, { label: "Контроль", value: "пройден", success: true }] : [{ label: "Visits", value: "12,100 → 27,842", success: true }, { label: "Pages", value: "575/575", success: true }, { label: "Visibility", value: "34% → 68%", success: true }, { label: "Control", value: "passed", success: true }]}
        statuses={ru ? ["Показы растут", "Переходы растут", "Видимость растёт"] : ["Impressions are up", "Visits are up", "Visibility is up"]}
        finalLabel={ru ? "27 842" : "27,842"}
        kind="blue"
      />
      <footer><p><i aria-hidden="true" />{ru ? "Рост за период" : "Growth during the period"}<strong>+{localeNumber(growth, locale)}</strong></p><p className="analytics-case-errors__control"><span>✓</span>{ru ? "Динамика перепроверена" : "Trend rechecked"}</p></footer>
    </article>
  );
}
