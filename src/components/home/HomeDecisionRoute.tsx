"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";

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
  const options: RouteOption[] = ru
    ? [
        {
          number: "01",
          title: "Бесплатная проверка",
          eyebrow: "Первый ориентир",
          description: "Быстро проверим до 10 ключевых страниц и покажем, с чего разумно начать.",
          price: "0 ₽",
          timing: "в день обращения",
          scope: "до 10 публичных страниц",
          details: ["Индексация и доступность", "Базовые технические сигналы", "Ссылка на результат"],
          href: "free-audit",
          cta: "Запустить проверку",
        },
        {
          number: "02",
          title: "Полный SEO-аудит",
          eyebrow: "Когда нужна ясность",
          description: "Разбираем причины, приоритеты и порядок исправлений — чтобы команда не тратила время на случайные доработки.",
          price: "от 19 900 ₽",
          timing: "5–7 рабочих дней",
          scope: "до 200 страниц",
          details: ["Приоритеты и понятный план", "Технические, SEO и UX-наблюдения", "PDF-отчёт и созвон по выводам"],
          href: "seo-audit",
          cta: "Посмотреть состав аудита",
        },
        {
          number: "03",
          title: "Аудит и внедрение",
          eyebrow: "Когда нужна реализация",
          description: "Не только фиксируем проблемы: согласуем объём, вносим изменения и повторно проверяем результат.",
          price: "по задаче",
          timing: "после оценки",
          scope: "работы фиксируются до старта",
          details: ["Смета и границы до начала", "Внедрение без лишних задач", "Контрольная проверка изменений"],
          href: "brief",
          cta: "Описать задачу",
        },
      ]
    : [
        {
          number: "01",
          title: "Free check",
          eyebrow: "A first signal",
          description: "We review up to 10 key public pages and show where a sensible review should start.",
          price: "Free",
          timing: "on the day of request",
          scope: "up to 10 public pages",
          details: ["Indexability and access", "Core technical signals", "A link to the result"],
          href: "free-audit",
          cta: "Start a free check",
        },
        {
          number: "02",
          title: "Full SEO audit",
          eyebrow: "When you need clarity",
          description: "We turn issues into priorities and an implementation order, so your team can stop guessing.",
          price: "Individual estimate",
          timing: "5–7 business days",
          scope: "up to 200 pages",
          details: ["Priorities and a clear plan", "Technical, SEO and UX findings", "PDF report and a results call"],
          href: "seo-audit",
          cta: "See the audit scope",
        },
        {
          number: "03",
          title: "Audit with implementation",
          eyebrow: "When execution matters",
          description: "We agree the scope, implement the work and verify the result instead of leaving you with a list.",
          price: "Individual estimate",
          timing: "after scoping",
          scope: "scope is fixed before work starts",
          details: ["Quote and boundaries up front", "Focused implementation", "Post-change verification"],
          href: "brief",
          cta: "Describe your task",
        },
      ];

  const [active, setActive] = useState(1);
  const activeOption = options[active];
  const panelId = useId();

  return (
    <section id="home-levels" className="home-decision" aria-labelledby="decision-heading">
      <div className="home-decision__intro">
        <p className="section-label">{ru ? "Маршрут работы" : "Working route"}</p>
        <h2 id="decision-heading">{ru ? "Начните с того объёма, который нужен сейчас" : "Start with the level that fits the task now"}</h2>
        <p>{ru ? "Можно ограничиться проверкой, перейти к полному аудиту или сразу обсудить внедрение. Никаких скрытых переходов между форматами." : "Start with a check, move to a full audit, or discuss implementation straight away. The formats stay transparent."}</p>
      </div>

      <div className="home-decision__body">
        <div className="home-decision__tabs" role="tablist" aria-label={ru ? "Выбор формата работы" : "Choose a format"}>
          {options.map((option, index) => (
            <button
              className="home-decision__tab"
              data-active={index === active}
              key={option.number}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-controls={panelId}
              onClick={() => setActive(index)}
            >
              <span>{option.number}</span>
              <strong>{option.title}</strong>
              <i aria-hidden="true">↗</i>
            </button>
          ))}
        </div>

        <article className="home-decision__panel" id={panelId} role="tabpanel">
          <div className="home-decision__panel-head">
            <div>
              <p>{activeOption.eyebrow}</p>
              <h3>{activeOption.title}</h3>
            </div>
            <b>{activeOption.price}</b>
          </div>
          <p className="home-decision__description">{activeOption.description}</p>
          <dl>
            <div>
              <dt>{ru ? "Объём" : "Scope"}</dt>
              <dd>{activeOption.scope}</dd>
            </div>
            <div>
              <dt>{ru ? "Срок" : "Timing"}</dt>
              <dd>{activeOption.timing}</dd>
            </div>
          </dl>
          <ul>
            {activeOption.details.map((detail) => <li key={detail}>{detail}</li>)}
          </ul>
          <Link className="home-decision__cta" href={localizedPath(locale, activeOption.href)}>
            {activeOption.cta}<span aria-hidden="true">↗</span>
          </Link>
        </article>
      </div>
    </section>
  );
}
