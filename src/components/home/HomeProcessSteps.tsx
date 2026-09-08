"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

type ProcessStep = { title: string; text: string; result: string };
type CheckCategory = { title: string; text: string; href: string };

export function HomeMobileDisclosure({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const contentId = `home-mobile-disclosure-${useId().replace(/:/g, "")}`;
  const [mobile, setMobile] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const sync = () => setMobile(query.matches);
    sync();
    if (typeof query.addEventListener === "function") query.addEventListener("change", sync);
    else query.addListener(sync);
    return () => {
      if (typeof query.removeEventListener === "function") query.removeEventListener("change", sync);
      else query.removeListener(sync);
    };
  }, []);

  const collapsed = mobile && !open;

  return (
    <div className={`home-mobile-disclosure ${className}`.trim()} data-mobile-disclosure data-open={!collapsed || undefined}>
      <button
        className="home-mobile-disclosure__toggle"
        type="button"
        aria-expanded={!collapsed}
        aria-controls={contentId}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{label}</span><i aria-hidden="true">{collapsed ? "+" : "−"}</i>
      </button>
      <div id={contentId} hidden={collapsed}>{children}</div>
    </div>
  );
}

export function HomeCheckCategories({
  locale,
  items,
}: {
  locale: "ru" | "en";
  items: CheckCategory[];
}) {
  const baseId = useId().replace(/:/g, "");
  const [active, setActive] = useState(0);
  const ru = locale === "ru";

  return (
    <section className="home-check-categories" id="home-checks" aria-labelledby={`${baseId}-title`} data-mobile-check-categories>
      <div className="shell">
        <header>
          <p>{ru ? "Что проверяем" : "What we check"}</p>
          <h2 id={`${baseId}-title`}>{ru ? "Четыре группы проверок" : "Four groups of checks"}</h2>
        </header>
        <div className="home-check-categories__controls">
          {items.map((item, index) => (
            <button
              key={item.title}
              type="button"
              aria-expanded={active === index}
              aria-controls={`${baseId}-panel-${index}`}
              data-active={active === index || undefined}
              onClick={() => setActive(index)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>{item.title}
            </button>
          ))}
        </div>
        <div className="home-check-categories__panels" aria-live="polite">
          {items.map((item, index) => (
            <div id={`${baseId}-panel-${index}`} key={item.title} hidden={active !== index} data-check={index}>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
              <Link href={item.href}>{ru ? "Подробнее о проверке" : "Read about this check"}<span aria-hidden="true">↗</span></Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeProcessSteps({ steps }: { steps: ProcessStep[] }) {
  const storyRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const story = storyRef.current;
    const chapters = Array.from(story?.querySelectorAll<HTMLElement>("[data-process-chapter]") ?? []);
    if (!story || !chapters.length) return;

    const mobile = window.matchMedia("(max-width: 760px)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let frame = 0;
    const update = () => {
      frame = 0;
      if (mobile.matches || reducedMotion.matches) return;
      const storyBox = story.getBoundingClientRect();
      if (storyBox.bottom <= 0 || storyBox.top >= window.innerHeight) return;
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
  const tabId = (index: number) => `home-process-mobile-tab-${index}`;

  function moveTab(index: number) {
    const next = (index + steps.length) % steps.length;
    setActiveStep(next);
    window.requestAnimationFrame(() => document.getElementById(tabId(next))?.focus());
  }

  return (
    <div className="home-process-story" ref={storyRef} data-active-step={activeStep}>
      <div className="home-process-tabs" role="tablist" aria-label={ru ? "Этапы работы" : "Work stages"} data-mobile-process-tabs>
        {steps.map((step, index) => (
          <button
            id={tabId(index)}
            key={step.title}
            type="button"
            role="tab"
            aria-selected={activeStep === index}
            aria-controls="home-process-mobile-panel"
            tabIndex={activeStep === index ? 0 : -1}
            onClick={() => setActiveStep(index)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                event.preventDefault();
                moveTab(index + 1);
              } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                event.preventDefault();
                moveTab(index - 1);
              } else if (event.key === "Home") {
                event.preventDefault();
                moveTab(0);
              } else if (event.key === "End") {
                event.preventDefault();
                moveTab(steps.length - 1);
              }
            }}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <small>{step.title}</small>
          </button>
        ))}
      </div>
      <div
        className="home-process-story__sticky"
        id="home-process-mobile-panel"
        role="tabpanel"
        aria-labelledby={tabId(activeStep)}
        data-stage={activeStep}
        data-mobile-process-panel
      >
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
                ru ? "Основные данные страницы заполнены" : "Core page data is complete",
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
        <div className="home-process-mobile-copy">
          <h3>{active?.title}</h3>
          <p>{active?.text}</p>
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
