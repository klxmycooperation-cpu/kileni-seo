"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { CaseStudy } from "../../content/cases";
import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";

type HomeCaseExplorerProps = {
  locale: Locale;
  cases: CaseStudy[];
};

function AnimatedScore({ from, to }: { from: number; to: number }) {
  const [value, setValue] = useState(to);

  useEffect(() => {
    let frame = 0;
    const startedAt = performance.now();
    const duration = 900;
    setValue(from);

    const update = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(from + (to - from) * eased));
      if (progress < 1) frame = window.requestAnimationFrame(update);
    };
    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [from, to]);

  return <span className="home-case-explorer__score" data-score-from={from} data-score-to={to}>{from} → {value}</span>;
}

export function HomeCaseExplorer({ locale, cases }: HomeCaseExplorerProps) {
  const ru = locale === "ru";
  const [active, setActive] = useState(0);
  const item = cases[active];
  const isEco = item.slug === "eco-santeh";
  const logo = `/case-sites/${item.slug}.ico`;
  const scoreFrom = isEco ? 35 : 37;
  const scoreTo = isEco ? 93 : 80;

  const resultRows = isEco
    ? ru
      ? [["Техническая готовность", "35 → 93"], ["Страницы без ошибки", "509 / 509"], ["Desktop Performance", "99 / 100"], ["SEO / Accessibility", "100 / 100"]]
      : [["Technical readiness", "35 → 93"], ["Pages without errors", "509 / 509"], ["Desktop Performance", "99 / 100"], ["SEO / Accessibility", "100 / 100"]]
    : ru
      ? [["Техническая готовность", "37 → 80"], ["Страницы без ошибки", "575 / 575"], ["CLS главного экрана", "0,519 → 0,0001"], ["JSON-LD / изображения", "0 → 575 / 20 314 → 25"]]
      : [["Technical readiness", "37 → 80"], ["Pages without errors", "575 / 575"], ["First-screen CLS", "0.519 → 0.0001"], ["JSON-LD / images", "0 → 575 / 20,314 → 25"]];

  const steps = isEco
    ? ru ? ["Шаблоны", "Адреса", "Метаданные", "Повторный обход"] : ["Templates", "URLs", "Metadata", "Recheck"]
    : ru ? ["Диагностика", "Первый экран", "JSON-LD", "Повторный обход"] : ["Diagnostics", "First screen", "JSON-LD", "Recheck"];
  const chartPoints = isEco ? "24,129 156,118 262,97 382,84 505,58 628,34" : "24,142 156,113 262,93 382,77 505,62 628,44";

  return (
    <section id="home-cases" className="home-case-explorer" aria-labelledby="case-explorer-heading">
      <header className="home-case-explorer__heading">
        <div>
          <p className="section-label">{ru ? "Доказательства" : "Evidence"}</p>
          <h2 id="case-explorer-heading">{ru ? "Не «красивые цифры», а проверяемый результат" : "Not nice-looking numbers — verified results"}</h2>
        </div>
        <p>{ru ? "Показываем стартовую точку, что именно изменили и чем подтвердили финальное состояние." : "We show the starting point, what changed, and how the final state was verified."}</p>
      </header>

      <div className="home-case-explorer__switch" role="tablist" aria-label={ru ? "Выбор кейса" : "Choose a case"}>
        {cases.map((study, index) => (
          <button key={study.slug} type="button" role="tab" aria-selected={active === index} onClick={() => setActive(index)}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <Image src={`/case-sites/${study.slug}.ico`} width={42} height={42} alt="" unoptimized />
            <strong>{study.domain}</strong>
          </button>
        ))}
      </div>

      <article key={item.slug} className="home-case-explorer__surface" data-case={item.slug}>
        <div className="home-case-explorer__identity">
          <Image src={logo} width={64} height={64} alt="" unoptimized />
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
            <svg key={item.slug} className="home-case-explorer__chart" viewBox="0 0 652 176" role="img" aria-label={resultRows[0][0] + " " + resultRows[0][1]}>
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
          {resultRows.map(([label, value], index) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{index === 0 ? <AnimatedScore key={item.slug} from={scoreFrom} to={scoreTo} /> : value}</dd>
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
