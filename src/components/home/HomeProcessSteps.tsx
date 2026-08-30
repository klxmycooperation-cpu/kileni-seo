"use client";

import { useEffect, useRef, useState } from "react";

type ProcessStep = { title: string; text: string; result: string };

export function HomeProcessSteps({ steps }: { steps: ProcessStep[] }) {
  const storyRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const story = storyRef.current;
    const chapters = Array.from(story?.querySelectorAll<HTMLElement>("[data-process-chapter]") ?? []);
    if (!story || !chapters.length) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const readingLine = window.innerHeight * 0.46;
      let next = 0;
      chapters.forEach((chapter, index) => {
        if (chapter.getBoundingClientRect().top <= readingLine) next = index;
      });
      setActiveStep((current) => current === next ? current : next);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const active = steps[activeStep] ?? steps[0];
  const ru = /[А-Яа-яЁё]/u.test(steps[0]?.title ?? "");

  return (
    <div className="home-process-story" ref={storyRef} data-active-step={activeStep}>
      <div className="home-process-story__sticky" aria-label={active?.title}>
        <div className="home-process-board" data-stage={activeStep} aria-hidden="true">
          <div className="home-process-board__header"><span>KILENI / workflow</span><i /></div>
          <div className="home-process-board__screen">
            <div className="home-process-board__phase home-process-board__phase--audit">
              <div className="home-process-browser">
                <header><i/><i/><i/><span>{ru ? "Проверка страниц" : "Page check"}</span></header>
                {["/", "/services", "/contacts"].map((path, index) => (
                  <div className="home-process-browser__row" key={path}>
                    <span>{path}</span><b>{index === 2 ? "302" : "200"}</b><i data-state={index === 2 ? "attention" : "ok"}/>
                  </div>
                ))}
              </div>
              <div className="home-process-board__scanline" />
            </div>
            <div className="home-process-board__phase home-process-board__phase--plan">
              <p>{ru ? "Приоритеты" : "Priorities"}</p>
              {[
                [ru ? "Закрыта важная страница" : "Key page is blocked", "P1"],
                [ru ? "Смена адреса после перехода" : "URL changes after redirect", "P2"],
                [ru ? "Нет описания страницы" : "Page description is missing", "P3"],
              ].map(([label, priority]) => <div key={priority}><b>{priority}</b><span>{label}</span><i/></div>)}
            </div>
            <div className="home-process-board__phase home-process-board__phase--fix">
              <div><span>{ru ? "Было" : "Before"}</span><code>{ru ? "Закрыта для поиска" : "noindex"}</code><i aria-hidden="true">×</i></div>
              <b aria-hidden="true">→</b>
              <div><span>{ru ? "Стало" : "After"}</span><code>{ru ? "Разрешена для поиска" : "index, follow"}</code><i aria-hidden="true">✓</i></div>
              <p>{ru ? "Исправление связано с причиной и критерием приёмки" : "Every fix has a cause and an acceptance check"}</p>
            </div>
            <div className="home-process-board__phase home-process-board__phase--verify">
              <header><i>✓</i><div><b>{ru ? "Контроль пройден" : "Verification passed"}</b><span>{ru ? "повторная проверка" : "follow-up check"}</span></div></header>
              {[
                ru ? "Страницы доступны" : "Pages are reachable",
                ru ? "Основные сигналы на месте" : "Core signals are present",
                ru ? "Результат сохранён" : "Result is recorded",
              ].map((label) => <div key={label}><i>✓</i><span>{label}</span></div>)}
            </div>
          </div>
          <div className="home-process-board__rail">
            {steps.map((step, index) => <span key={step.title} data-current={index === activeStep || undefined}>{String(index + 1).padStart(2, "0")}</span>)}
          </div>
        </div>
        <div className="home-process-story__result" aria-live="polite">
          <span>{String(activeStep + 1).padStart(2, "0")} / 04</span>
          <strong>{active?.result}</strong>
        </div>
      </div>
      <ol className="home-process-chapters">
        {steps.map((step, index) => (
          <li key={step.title} data-process-chapter={index} data-active={index === activeStep || undefined}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div><h3>{step.title}</h3><p>{step.text}</p></div>
            <strong><i aria-hidden="true">✓</i>{step.result}</strong>
          </li>
        ))}
      </ol>
    </div>
  );
}
