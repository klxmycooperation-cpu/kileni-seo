"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { formatOfferPrice, getOffer, localizedOffer, offerBriefHref } from "../../config/offers";
import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";
import { priceToneClass } from "../price-emphasis";

type DecisionRouteProps = {
  locale: Locale;
};

type RouteOption = {
  number: string;
  title: string;
  eyebrow: string;
  description: string;
  price: string;
  timing: string;
  scope: string;
  details: string[];
  href: string;
  cta: string;
};

export function HomeDecisionRoute({ locale }: DecisionRouteProps) {
  const ru = locale === "ru";
  const freeAudit = localizedOffer(getOffer("seo-audit-free")!, locale);
  const fullAudit = localizedOffer(getOffer("seo-audit-200")!, locale);
  const implementation = localizedOffer(getOffer("seo-audit-implementation")!, locale);
  const options: RouteOption[] = ru
    ? [
        {
          number: "01",
          title: "Бесплатная проверка",
          eyebrow: "Быстрая предварительная оценка",
          description: "Быстро проверим до 10 ключевых страниц и покажем, с чего разумно начать.",
          price: formatOfferPrice(getOffer("seo-audit-free")!, locale),
          timing: freeAudit.duration,
          scope: freeAudit.scope,
          details: freeAudit.features.slice(0, 3),
          href: localizedPath(locale, "free-audit"),
          cta: "Запустить проверку",
        },
        {
          number: "02",
          title: fullAudit.title,
          eyebrow: "Когда нужна ясность",
          description: "Разбираем причины, приоритеты и порядок исправлений.",
          price: formatOfferPrice(getOffer("seo-audit-200")!, locale),
          timing: fullAudit.duration,
          scope: fullAudit.scope,
          details: fullAudit.features.slice(0, 3),
          href: offerBriefHref("seo-audit-200", locale),
          cta: "Выбрать технический аудит",
        },
        {
          number: "03",
          title: "Аудит и внедрение",
          eyebrow: "Когда нужна реализация",
          description: "Согласуем объём, вносим изменения и повторно проверяем результат.",
          price: formatOfferPrice(getOffer("seo-audit-implementation")!, locale),
          timing: implementation.duration,
          scope: implementation.scope,
          details: implementation.features.slice(0, 3),
          href: offerBriefHref("seo-audit-implementation", locale),
          cta: "Описать задачу",
        },
      ]
    : [
        {
          number: "01",
          title: "Free check",
          eyebrow: "When you need an initial check",
          description: "We review up to 10 key public pages and show where a sensible review should start.",
          price: formatOfferPrice(getOffer("seo-audit-free")!, locale),
          timing: freeAudit.duration,
          scope: freeAudit.scope,
          details: freeAudit.features.slice(0, 3),
          href: localizedPath(locale, "free-audit"),
          cta: "Start a free check",
        },
        {
          number: "02",
          title: fullAudit.title,
          eyebrow: "When you need clarity",
          description: "We turn issues into priorities and an implementation order, so your team can stop guessing.",
          price: formatOfferPrice(getOffer("seo-audit-200")!, locale),
          timing: fullAudit.duration,
          scope: fullAudit.scope,
          details: fullAudit.features.slice(0, 3),
          href: offerBriefHref("seo-audit-200", locale),
          cta: "Choose the technical audit",
        },
        {
          number: "03",
          title: "Audit with implementation",
          eyebrow: "When execution matters",
          description: "We agree the scope, implement the work and verify the result instead of leaving you with a list.",
          price: formatOfferPrice(getOffer("seo-audit-implementation")!, locale),
          timing: implementation.duration,
          scope: implementation.scope,
          details: implementation.features.slice(0, 3),
          href: offerBriefHref("seo-audit-implementation", locale),
          cta: "Describe your task",
        },
      ];

  const [active, setActive] = useState(1);
  const baseId = useId().replace(/:/g, "");
  const tabId = (index: number) => `${baseId}-tab-${index}`;
  const panelId = (index: number) => `${baseId}-panel-${index}`;

  function moveTab(index: number) {
    const next = (index + options.length) % options.length;
    setActive(next);
    window.requestAnimationFrame(() => document.getElementById(tabId(next))?.focus());
  }

  return (
    <section id="home-levels" className="home-decision" aria-labelledby="decision-heading">
      <div className="home-decision__intro" id="home-formats">
        <p className="section-label">{ru ? "Какой объём выбрать" : "Choose the right scope"}</p>
        <h2 id="decision-heading">
          {ru
            ? <span className="decision-heading-ru"><span className="decision-heading-ru__line">Начните</span>{" "}<span className="decision-heading-ru__line">с того объёма,</span>{" "}<span className="decision-heading-ru__line">который</span>{" "}<span className="decision-heading-ru__line">нужен сейчас</span></span>
            : "Start with the level that fits the task now"}
        </h2>
        <p>{ru ? "Можно ограничиться проверкой ключевых страниц, получить технический аудит или сразу обсудить исправления. Состав и цена каждого варианта указаны отдельно." : "Start with a key-page review, choose a technical audit or discuss implementation. Each option has its own scope and price."}</p>
      </div>

      <div className="home-decision__body" data-dashboard-surface="tier-selector">
        <div className="home-decision__tabs" role="tablist" aria-label={ru ? "Выбор формата работы" : "Choose a format"} data-mobile-route-tabs>
          {options.map((option, index) => (
            <button
              id={tabId(index)}
              className="home-decision__tab"
              data-active={index === active}
              key={option.number}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-controls={panelId(index)}
              tabIndex={index === active ? 0 : -1}
              onClick={() => setActive(index)}
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
                  moveTab(options.length - 1);
                }
              }}
            >
              <span>{option.number}</span>
              <strong>{option.title}</strong>
              <i aria-hidden="true">↗</i>
            </button>
          ))}
        </div>

        {options.map((option, index) => (
          <article
            className="home-decision__panel"
            id={panelId(index)}
            role="tabpanel"
            aria-labelledby={tabId(index)}
            key={option.number}
            hidden={active !== index}
            data-route={index}
          >
            <div className="home-decision__panel-head">
              <div>
                <p>{option.eyebrow}</p>
                <h3>{option.title}</h3>
              </div>
              <b className={`home-decision__price price-emphasis ${priceToneClass(index)}`}>{option.price}</b>
            </div>
            <div className="home-decision__content">
              <p className="home-decision__description">{option.description}</p>
              <dl>
                <div>
                  <dt>{ru ? "Объём" : "Scope"}</dt>
                  <dd>{option.scope}</dd>
                </div>
                <div>
                  <dt>{ru ? "Срок" : "Timing"}</dt>
                  <dd>{option.timing}</dd>
                </div>
              </dl>
              <ul>
                {option.details.map((detail) => <li key={detail}>{detail}</li>)}
              </ul>
            </div>
            <Link className="home-decision__cta" href={option.href}>
              {option.cta}<span aria-hidden="true">↗</span>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
