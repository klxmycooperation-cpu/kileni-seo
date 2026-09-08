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
  const baseId = useId().replace(/:/g, "");
  const item = cases[active];
  const isEco = item.slug === "eco-santeh";
  const logo = `/case-sites/${item.slug}.ico`;
  const scoreFrom = item.before;
  const scoreTo = item.after;

  const resultRows = isEco
    ? ru
      ? [["Готовность сайта", "score"], ["Страницы открываются", "pages"], ["Скорость на телефоне", "mobilePerformance"], ["Скорость на компьютере", "performance"]]
      : [["Technical readiness", "score"], ["Pages returning HTTP 200", "pages"], ["Mobile Performance", "mobilePerformance"], ["Desktop Performance", "performance"]]
    : ru
      ? [["Готовность сайта", "score"], ["Страницы открываются", "pages"], ["Стабильность первого экрана", "cls"], ["Изображения без размеров", "images"]]
      : [["Technical readiness", "score"], ["Pages returning HTTP 200", "pages"], ["First-screen CLS", "cls"], ["Images without dimensions", "images"]];

  const steps = isEco
    ? ru ? ["Шаблоны", "Адреса", "Заголовки и описания", "Контрольная проверка"] : ["Templates", "URLs", "Metadata", "Recheck"]
    : ru ? ["Проверка", "Первый экран", "Данные для поиска", "Контрольная проверка"] : ["Diagnostics", "First screen", "JSON-LD", "Recheck"];
  const chartPoints = isEco ? "24,129 156,118 262,97 382,84 505,58 628,34" : "24,142 156,113 262,93 382,77 505,62 628,44";
  const tabId = (index: number) => `${baseId}-case-tab-${index}`;
  const panelId = `${baseId}-case-panel`;

  function moveCase(index: number, focusTab = false) {
    const next = (index + cases.length) % cases.length;
    setActive(next);
    if (focusTab) window.requestAnimationFrame(() => document.getElementById(tabId(next))?.focus());
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

      <div className="home-case-explorer__switch" role="tablist" aria-label={ru ? "Выбор кейса" : "Choose a case"}>
        {cases.map((study, index) => (
          <button
            id={tabId(index)}
            key={study.slug}
            type="button"
            role="tab"
            aria-selected={active === index}
            aria-controls={panelId}
            tabIndex={active === index ? 0 : -1}
            onClick={() => setActive(index)}
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
            <Image src={`/case-sites/${study.slug}.ico`} width={42} height={42} alt="" unoptimized loading="lazy" />
            <strong>{study.domain}</strong>
          </button>
        ))}
      </div>

      <div className="home-case-explorer__mobile-controls" aria-label={ru ? "Переключение кейсов" : "Switch cases"} data-mobile-case-controls>
        <button type="button" onClick={() => moveCase(active - 1)} aria-label={ru ? "Предыдущий кейс" : "Previous case"}>←</button>
        <span aria-live="polite">{String(active + 1).padStart(2, "0")} / {String(cases.length).padStart(2, "0")}</span>
        <button type="button" onClick={() => moveCase(active + 1)} aria-label={ru ? "Следующий кейс" : "Next case"}>→</button>
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
          <Image src={logo} width={64} height={64} alt="" unoptimized loading="lazy" />
          <div>
            <p>{ru ? "Кейс" : "Case"} {String(active + 1).padStart(2, "0")} · {item.period}</p>
            <h3>{item.domain}</h3>
          </div>
          <span>{ru ? "Контрольная проверка" : "Control check"} <b>✓</b></span>
        </div>

        <div className="home-case-explorer__story">
          <div>
            <p className="home-case-explorer__eyebrow">{ru ? "Задача" : "Task"}</p>
            <h4>{item.task}</h4>
            <p className="home-case-explorer__summary">{item.lead}</p>
            <ol>
              {steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span>{step}</li>)}
            </ol>
          </div>

          <div className="home-case-explorer__chart-wrap">
            <p>{ru ? "Изменение итоговой шкалы проекта" : "Change in the project score"}</p>
            <svg key={`${item.slug}-${metricsRun}`} className="home-case-explorer__chart" viewBox="0 0 652 176" role="img" aria-label={`${resultRows[0][0]} ${scoreFrom} → ${scoreTo}`}>
              <defs>
                <linearGradient id="case-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4668ff" stopOpacity=".24" />
                  <stop offset="100%" stopColor="#4668ff" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[35, 70, 105, 140].map((line) => <line key={line} x1="24" y1={line} x2="628" y2={line} />)}
              <path className="home-case-explorer__chart-area" d={"M " + chartPoints + " L 628 152 L 24 152 Z"} />
              <polyline className="home-case-explorer__chart-line" points={chartPoints} />
              {chartPoints.split(" ").map((point) => {
                const [cx, cy] = point.split(",");
                return <circle key={point} cx={cx} cy={cy} r="5" />;
              })}
              <text x="24" y="171">{scoreFrom}</text>
              <text x="594" y="171">{scoreTo}</text>
            </svg>
          </div>
        </div>

        <dl className="home-case-explorer__results">
          {resultRows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                {value === "score" && <AnimatedScore key={`${item.slug}-${metricsRun}-score`} from={scoreFrom} to={scoreTo} enabled={metricsVisible} />}
                {value === "pages" && <AnimatedMetric key={`${item.slug}-${metricsRun}-pages`} from={0} to={isEco ? 509 : 575} suffix={` / ${isEco ? 509 : 575}`} enabled={metricsVisible} />}
                {value === "mobilePerformance" && <AnimatedScore key={`${item.slug}-${metricsRun}-mobile-performance`} from={36} to={57} enabled={metricsVisible} />}
                {value === "performance" && <AnimatedMetric key={`${item.slug}-${metricsRun}-performance`} from={0} to={99} suffix=" / 100" enabled={metricsVisible} />}
                {value === "cls" && <AnimatedMetric key={`${item.slug}-${metricsRun}-cls`} from={0.519} to={0.0001} enabled={metricsVisible} format={(metric) => Math.abs(metric - 0.0001) < 0.0002 ? (ru ? "0,0001" : "0.0001") : metric.toLocaleString(ru ? "ru-RU" : "en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} />}
                {value === "images" && <AnimatedScore key={`${item.slug}-${metricsRun}-images`} from={20_314} to={25} enabled={metricsVisible} />}
              </dd>
            </div>
          ))}
        </dl>

        <footer>
          <p>{ru ? "Цифры относятся к этому проекту и подтверждены повторной проверкой." : "These figures apply to this project and were confirmed by a repeat check."}</p>
          <Link href={localizedPath(locale, `cases/${item.slug}`)}>{ru ? "Открыть разбор с доказательствами" : "Open the evidence review"} <span aria-hidden="true">↗</span></Link>
        </footer>
      </article>
    </section>
  );
}
