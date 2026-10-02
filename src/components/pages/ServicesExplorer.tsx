"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

import type { Locale } from "../../config/site";
import {
  serviceDirectionIds,
  type ServiceDirection,
  type ServiceDirectionId,
} from "../../content/service-directions";
import { marketplacePlatforms } from "../../content/marketplaces";
import { priceToneClass } from "../price-emphasis";

const directionSet = new Set<string>(serviceDirectionIds);

export function ServicesExplorer({ locale, directions }: { locale: Locale; directions: readonly ServiceDirection[] }) {
  const ru = locale === "ru";
  const [activeId, setActiveId] = useState<ServiceDirectionId>("seo");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const active = useMemo(
    () => directions.find((direction) => direction.id === activeId) ?? directions[0],
    [activeId, directions],
  );

  useEffect(() => {
    const syncFromLocation = () => {
      const requested = new URL(window.location.href).searchParams.get("direction");
      if (requested && directionSet.has(requested)) setActiveId(requested as ServiceDirectionId);
    };
    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);
    return () => window.removeEventListener("popstate", syncFromLocation);
  }, []);

  const selectDirection = (id: ServiceDirectionId, focus = false) => {
    setActiveId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("direction", id);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    if (focus) {
      const index = serviceDirectionIds.indexOf(id);
      requestAnimationFrame(() => tabRefs.current[index]?.focus());
    }
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex: number | undefined;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (currentIndex + 1) % directions.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (currentIndex - 1 + directions.length) % directions.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = directions.length - 1;
    if (nextIndex === undefined) return;
    event.preventDefault();
    selectDirection(directions[nextIndex].id, true);
  };

  return (
    <section className="services-explorer" id="services-directions" aria-labelledby="services-directions-title">
      <div className="shell services-explorer__surface">
        <header className="services-explorer__heading">
          <p>{ru ? "Выбор направления" : "Choose a direction"}</p>
          <h2 id="services-directions-title">{ru ? "Что нужно сделать?" : "What needs to be done?"}</h2>
        </header>

        <div className="services-explorer__tabs" role="tablist" aria-label={ru ? "Направления услуг" : "Service directions"}>
          {directions.map((direction, index) => {
            const selected = direction.id === active.id;
            return (
              <button
                aria-label={direction.label}
                aria-controls={`services-panel-${direction.id}`}
                aria-selected={selected}
                className="services-explorer__tab"
                id={`services-tab-${direction.id}`}
                key={direction.id}
                onClick={() => selectDirection(direction.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                ref={(node) => { tabRefs.current[index] = node; }}
                role="tab"
                tabIndex={selected ? 0 : -1}
                type="button"
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                {direction.label}
              </button>
            );
          })}
        </div>

        <div className="services-explorer__layout">
          <article
            aria-labelledby={`services-tab-${active.id}`}
            className="services-explorer__panel"
            data-direction={active.id}
            id={`services-panel-${active.id}`}
            key={active.id}
            role="tabpanel"
            tabIndex={0}
          >
            <div className="services-explorer__panel-intro">
              <p className="services-explorer__problem"><span>{ru ? "Задача" : "The task"}</span>{active.problem}</p>
              <h2>{active.title}</h2>
              <p className="services-explorer__promise">{active.promise}</p>
            </div>

            {active.id === "marketplaces" ? <MarketplaceMarks locale={locale} /> : null}

            <ol className="services-explorer__journey" aria-label={ru ? "Путь работы" : "Working path"}>
              {active.journey.map((step, index) => (
                <li key={step}>
                  <span>{step}</span>
                  {index < active.journey.length - 1 ? <b aria-hidden="true">→</b> : null}
                </li>
              ))}
            </ol>

            <div className="services-explorer__lists">
              <section>
                <h3>{ru ? "Что делаем" : "What we do"}</h3>
                <ul aria-label={ru ? "Что делаем" : "What we do"}>{active.actions.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
              <section>
                <h3>{ru ? "Что останется у вас" : "What you keep"}</h3>
                <ul aria-label={ru ? "Что останется у вас" : "What you keep"}>{active.outcomes.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
            </div>

            <dl className="services-explorer__facts">
              <div>
                <dt>{active.id === "custom" ? (ru ? "Стоимость" : "Price") : (ru ? "Стартовая цена" : "Starting price")}</dt>
                <dd className={`services-explorer__price price-emphasis ${priceToneClass(directions.indexOf(active))}`}>{active.price}</dd>
              </div>
              <div>
                <dt>{ru ? "Срок" : "Timing"}</dt>
                <dd>{active.duration}</dd>
              </div>
            </dl>

            <details className="services-explorer__scope">
              <summary>{ru ? "Что входит" : "What is included"}<span aria-hidden="true">+</span></summary>
              <ul>{active.included.map((item) => <li key={item}>{item}</li>)}</ul>
            </details>

            <div className="services-explorer__actions">
              <Link className="services-hub__button services-hub__button--primary" href={active.primaryCta.href}>{active.primaryCta.label}<span aria-hidden="true">↗</span></Link>
              {active.secondaryCta ? <Link className="services-hub__text-link" href={active.secondaryCta.href}>{active.secondaryCta.label}<span aria-hidden="true">↗</span></Link> : null}
            </div>
          </article>

          <ServicesDirectionVisual active={active} directions={directions} locale={locale} />
        </div>
      </div>
    </section>
  );
}

type JourneyStep = 0 | 1 | 2 | 3 | 4;

const journeyStates = ["idle", "observing", "analyzing", "updating", "verified"] as const;

export function ServicesHeroJourney({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const stages = ru
    ? ["Проблема", "Разбор", "Решение", "Проверяемый результат"]
    : ["Problem", "Review", "Solution", "Verified result"];
  const trajectoryRef = useRef<HTMLDivElement | null>(null);
  const [step, setStep] = useState<JourneyStep>(0);

  useEffect(() => {
    const trajectory = trajectoryRef.current;
    if (!trajectory) return;

    const constrained = window.matchMedia("(prefers-reduced-motion: reduce), (max-width: 820px), (pointer: coarse)").matches;
    const timers: number[] = [];
    const play = () => {
      setStep(0);
      [1, 2, 3, 4].forEach((nextStep, index) => {
        timers.push(window.setTimeout(() => setStep(nextStep as JourneyStep), 420 + index * 430));
      });
    };

    if (constrained || typeof IntersectionObserver === "undefined") {
      setStep(4);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      play();
    }, { threshold: 0.3 });
    observer.observe(trajectory);

    return () => {
      observer.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const state = journeyStates[step];
  return (
    <div className="services-hub__trajectory" data-journey-state={state} data-journey-step={step} ref={trajectoryRef} role="img" aria-label={stages.join(" — ")}>
      <div className="services-hub__trajectory-heading">
        <span>{ru ? "Как переходим от задачи к проверенному результату" : "How we move from the task to a verified result"}</span>
        <b>{ru ? "От вопроса к проверке" : "From question to verification"}</b>
      </div>
      <svg aria-hidden="true" className="services-hero__journey" viewBox="0 0 720 270">
        <path className="services-hero__guide" d="M70 182C174 182 176 78 286 78S402 204 510 204 594 118 650 118" />
        <path className="services-hero__line" pathLength="1" d="M70 182C174 182 176 78 286 78S402 204 510 204 594 118 650 118" />
        <g className="services-hero__node services-hero__node--1" data-node-state={step > 1 ? "complete" : step === 1 ? "active" : "pending"} data-stage={stages[0]}><circle cx="70" cy="182" r="22" /><path d="M61 173L79 191M79 173L61 191" /><text x="70" y="226">{stages[0]}</text></g>
        <g className="services-hero__node services-hero__node--2" data-node-state={step > 2 ? "complete" : step === 2 ? "active" : "pending"} data-stage={stages[1]}><circle cx="286" cy="78" r="28" /><path d="M274 78H298M286 66V90" /><text x="286" y="42">{stages[1]}</text></g>
        <g className="services-hero__node services-hero__node--3" data-node-state={step > 3 ? "complete" : step === 3 ? "active" : "pending"} data-stage={stages[2]}><rect height="48" rx="12" width="64" x="478" y="180" /><path d="M493 204H527" /><text x="510" y="226">{stages[2]}</text></g>
        <g className="services-hero__node services-hero__node--4" data-node-state={step === 4 ? "active" : "pending"} data-stage={stages[3]}><circle cx="650" cy="118" r="25" /><path d="M638 118L646 126 663 108" /><text x="650" y="158">{stages[3]}</text></g>
      </svg>
      <ol>
        {stages.map((stage, index) => <li key={stage}><span>{String(index + 1).padStart(2, "0")}</span>{stage}</li>)}
      </ol>
      <p><span aria-hidden="true">✓</span>{ru ? "Результат можно проверить" : "The result can be verified"}</p>
    </div>
  );
}

export function MarketplaceMarks({ locale }: { locale: Locale }) {
  const marks = marketplacePlatforms.map((platform) => ({ label: locale === "ru" ? platform.name : platform.nameEn, src: platform.iconSrc, width: platform.iconWidth, height: platform.iconHeight }));
  return (
    <div className="services-explorer__marketplace-marks" aria-label={locale === "ru" ? "Поддерживаемые площадки" : "Supported marketplaces"}>
      {marks.map((mark) => <span key={mark.src}><Image alt={mark.label} decoding="async" height={mark.height} loading="eager" src={mark.src} unoptimized width={mark.width} /></span>)}
    </div>
  );
}

function ServicesDirectionVisual({ active, directions, locale }: { active: ServiceDirection; directions: readonly ServiceDirection[]; locale: Locale }) {
  const [visualStep, setVisualStep] = useState<JourneyStep>(active.id === "seo" ? 0 : 4);

  useEffect(() => {
    const constrained = window.matchMedia("(prefers-reduced-motion: reduce), (max-width: 820px), (pointer: coarse)").matches;
    if (active.id !== "seo" || constrained) {
      setVisualStep(4);
      return;
    }

    const timers: number[] = [];
    setVisualStep(0);
    [1, 2, 3, 4].forEach((nextStep, index) => {
      timers.push(window.setTimeout(() => setVisualStep(nextStep as JourneyStep), 320 + index * 360));
    });
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [active.id]);

  const visualState = journeyStates[visualStep];
  return (
    <figure className="services-explorer__visual" data-direction={active.id} data-visual-state={visualState} data-visual-step={visualStep}>
      <div className="services-explorer__visual-heading">
        <span>{active.visual.label}</span>
        <b>{String(serviceDirectionIds.indexOf(active.id) + 1).padStart(2, "0")} / 04</b>
      </div>
      <svg aria-labelledby="services-visual-title services-visual-description" role="img" viewBox="0 0 560 420">
        <title id="services-visual-title">{active.visual.label}</title>
        <desc id="services-visual-description">{active.visual.result}</desc>
        <path className="services-explorer__visual-grid" d="M44 94H516M44 210H516M44 326H516M132 54V366M280 54V366M428 54V366" />
        <path className="services-explorer__visual-route" d="M72 314C142 314 142 112 224 112S310 308 384 308 444 176 504 176" />
        {directions.map((direction) => (
          <g
            aria-hidden={direction.id !== active.id}
            className={`services-explorer__visual-variant services-explorer__visual-variant--${direction.id}`}
            data-active={direction.id === active.id ? "true" : "false"}
            key={direction.id}
          >
            {direction.id === "seo" ? <SeoVisual locale={locale} visualStep={visualStep} /> : null}
            {direction.id === "development" ? <DevelopmentVisual /> : null}
            {direction.id === "marketplaces" ? <MarketplaceVisual /> : null}
            {direction.id === "custom" ? <CustomVisual /> : null}
          </g>
        ))}
      </svg>
      <ol className="services-explorer__visual-stages" aria-label={active.visual.label}>
        {active.visual.stages.map((stage, index) => <li key={stage}><span>{String(index + 1).padStart(2, "0")}</span>{stage}</li>)}
      </ol>
      <figcaption className="services-explorer__visual-result"><span aria-hidden="true">✓</span>{active.visual.result}</figcaption>
    </figure>
  );
}

function SeoVisual({ locale, visualStep }: { locale: Locale; visualStep: JourneyStep }) {
  const labels = locale === "ru"
    ? ["Проверка страницы", "Внесённые правки", "Повторная проверка"]
    : ["Page check", "Changes applied", "Repeat check"];
  return <>
    <g className="services-seo__stage services-seo__stage--1" data-stage-state={visualStep > 1 ? "complete" : visualStep === 1 ? "active" : "pending"} data-stage={labels[0]}><rect className="services-explorer__shape" height="92" rx="10" width="106" x="54" y="258" /><path className="services-explorer__shape-line" d="M76 282H138M76 302H124M76 322H132" /><text x="107" y="370">{labels[0]}</text></g>
    <g className="services-seo__stage services-seo__stage--2" data-stage-state={visualStep > 2 ? "complete" : visualStep === 2 ? "active" : "pending"} data-stage={labels[1]}><circle className="services-explorer__shape services-explorer__shape--accent" cx="224" cy="112" r="46" /><path className="services-explorer__shape-line" d="M202 112L218 128 247 93" /><text x="224" y="48">{labels[1]}</text></g>
    <g className="services-seo__stage services-seo__stage--3" data-stage-state={visualStep > 3 ? "complete" : visualStep === 3 ? "active" : "pending"} data-stage={labels[2]}><rect className="services-explorer__shape" height="104" rx="12" width="116" x="326" y="256" /><path className="services-explorer__shape-line" d="M350 328L372 304 392 316 420 280" /><text x="384" y="370">{labels[2]}</text></g>
    <g className="services-seo__stage services-seo__stage--4" data-stage-state={visualStep === 4 ? "active" : "pending"}><circle className="services-explorer__shape services-explorer__shape--verified" cx="504" cy="176" r="22" /><path className="services-explorer__shape-line services-explorer__shape-line--verified" d="M494 176L501 183 515 168" /></g>
  </>;
}

function DevelopmentVisual() {
  return <>
    <rect className="services-explorer__shape" height="82" rx="8" width="112" x="48" y="268" />
    <rect className="services-explorer__shape services-explorer__shape--accent" height="92" rx="10" width="124" x="162" y="70" />
    <rect className="services-explorer__shape" height="122" rx="12" width="142" x="306" y="238" />
    <path className="services-explorer__shape-line" d="M176 96H272M176 116H236M326 268H428M326 288H390M326 310H408M326 334H374" />
    <circle className="services-explorer__shape services-explorer__shape--verified" cx="504" cy="176" r="22" />
    <path className="services-explorer__shape-line services-explorer__shape-line--verified" d="M494 176L501 183 515 168" />
  </>;
}

function MarketplaceVisual() {
  return <>
    <rect className="services-explorer__shape" height="98" rx="12" width="88" x="54" y="252" />
    <rect className="services-explorer__shape services-explorer__shape--accent" height="132" rx="16" width="112" x="170" y="66" />
    <rect className="services-explorer__shape" height="132" rx="16" width="112" x="328" y="228" />
    <circle className="services-explorer__shape-fill" cx="226" cy="110" r="24" />
    <path className="services-explorer__shape-line" d="M190 158H262M348 256H420M348 278H400M348 326H382" />
    <rect className="services-explorer__shape-fill" height="26" rx="6" width="72" x="348" y="292" />
    <circle className="services-explorer__shape services-explorer__shape--verified" cx="504" cy="176" r="22" />
    <path className="services-explorer__shape-line services-explorer__shape-line--verified" d="M494 176L501 183 515 168" />
  </>;
}

function CustomVisual() {
  return <>
    <circle className="services-explorer__shape" cx="78" cy="306" r="26" />
    <circle className="services-explorer__shape" cx="130" cy="270" r="16" />
    <circle className="services-explorer__shape services-explorer__shape--accent" cx="224" cy="112" r="42" />
    <rect className="services-explorer__shape" height="112" rx="18" width="132" x="318" y="246" />
    <path className="services-explorer__shape-line" d="M104 290L186 140M148 270L198 150M266 136L336 260M340 280H428M340 306H402M340 332H384" />
    <circle className="services-explorer__shape services-explorer__shape--verified" cx="504" cy="176" r="22" />
    <path className="services-explorer__shape-line services-explorer__shape-line--verified" d="M494 176L501 183 515 168" />
  </>;
}
