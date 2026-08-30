import "../../../app/services-hub.css";

import Link from "next/link";

import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";
import { getServiceDirections } from "../../content/service-directions";
import { PublicShell } from "../layout/PublicShell";
import { ServicesExplorer } from "./ServicesExplorer";

export function ServicesIndexPage({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const directions = getServiceDirections(locale);

  return (
    <PublicShell locale={locale}>
      <div className="services-10 services-hub">
        <header className="services-hub__hero">
          <div className="shell services-hub__hero-layout">
            <div className="services-hub__hero-copy">
              <p className="services-hub__eyebrow">{ru ? "Услуги KILENI" : "KILENI services"}</p>
              <h1>{ru ? "От проблемы — к понятному результату" : "From a problem to a clear result"}</h1>
              <p className="services-hub__hero-lead">
                {ru
                  ? "Выберите задачу. Сразу покажем, что сделаем, сколько это занимает, сколько стоит и что останется у вас после работы."
                  : "Choose the task. See what we will do, how long it takes, what it costs and what you keep after the work is done."}
              </p>
              <div className="services-hub__hero-actions">
                <Link className="services-hub__button services-hub__button--primary" href="#services-directions">{ru ? "Выбрать направление" : "Choose a direction"}<span aria-hidden="true">↓</span></Link>
                <Link className="services-hub__text-link" href={localizedPath(locale, "free-audit")}>{ru ? "Проверить сайт бесплатно" : "Check a website for free"}<span aria-hidden="true">↗</span></Link>
              </div>
            </div>
            <ServicesHeroJourney locale={locale} />
          </div>
        </header>

        <ServicesExplorer directions={directions} locale={locale} />
      </div>
    </PublicShell>
  );
}

function ServicesHeroJourney({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const stages = ru
    ? ["Проблема", "Разбор", "Решение", "Проверяемый результат"]
    : ["Problem", "Review", "Solution", "Verified result"];
  return (
    <div className="services-hub__trajectory" role="img" aria-label={stages.join(" — ")}>
      <div className="services-hub__trajectory-heading">
        <span>{ru ? "Один понятный маршрут" : "One clear route"}</span>
        <b>{ru ? "От вопроса к проверке" : "From question to verification"}</b>
      </div>
      <svg aria-hidden="true" className="services-hero__journey" viewBox="0 0 720 270">
        <path className="services-hero__guide" d="M70 182C174 182 176 78 286 78S402 204 510 204 594 118 650 118" />
        <path className="services-hero__line" d="M70 182C174 182 176 78 286 78S402 204 510 204 594 118 650 118" />
        <g className="services-hero__node services-hero__node--1"><circle cx="70" cy="182" r="22" /><path d="M61 173L79 191M79 173L61 191" /></g>
        <g className="services-hero__node services-hero__node--2"><circle cx="286" cy="78" r="28" /><path d="M274 78H298M286 66V90" /></g>
        <g className="services-hero__node services-hero__node--3"><rect height="48" rx="12" width="64" x="478" y="180" /><path d="M493 204H527" /></g>
        <g className="services-hero__node services-hero__node--4"><circle cx="650" cy="118" r="25" /><path d="M638 118L646 126 663 108" /></g>
      </svg>
      <ol>
        {stages.map((stage, index) => <li key={stage}><span>{String(index + 1).padStart(2, "0")}</span>{stage}</li>)}
      </ol>
      <p><span aria-hidden="true">✓</span>{ru ? "Результат можно проверить" : "The result can be verified"}</p>
    </div>
  );
}
