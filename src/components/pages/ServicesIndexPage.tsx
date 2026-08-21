import "../../../app/service-pricing-brief-10.css";

import Link from "next/link";
import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";
import { getService, serviceSlugs } from "../../content/services";
import { Breadcrumbs } from "../layout/Breadcrumbs";
import { PublicShell } from "../layout/PublicShell";
import { Faq } from "./Faq";

export function ServicesIndexPage({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const faq = ru ? [
    { q: "С чего начать, если услуга непонятна?", a: "Начните с бесплатной проверки сайта или короткого брифа. По ответам предложим один подходящий следующий шаг — без обязательства покупать большой пакет." },
    { q: "Можно заказать только отдельный этап?", a: "Да. Диагностику, прототип, настройку или внедрение можно выделить отдельно, если у этапа есть понятный результат и границы." },
    { q: "Цена изменится после начала?", a: "До старта фиксируем состав и предел тарифа. Всё, что не входит в него, сначала оцениваем и согласуем отдельно." },
    { q: "Вы гарантируете позиции или продажи?", a: "Нет. Мы отвечаем за согласованный объём и качество выполнения, но спрос, конкуренты и алгоритмы площадок невозможно контролировать полностью." },
  ] : [
    { q: "Where should I start if the service is unclear?", a: "Start with the free website check or a short brief. We will suggest one sensible next step without pushing a large package." },
    { q: "Can we buy one stage only?", a: "Yes. Diagnosis, prototyping, setup or implementation can be scoped separately when the deliverable is clear." },
    { q: "Can the price change after work starts?", a: "Scope and package limits are agreed upfront. Anything outside them is estimated and approved separately." },
    { q: "Do you guarantee rankings or sales?", a: "No. We are accountable for the agreed delivery, but demand, competition and platform algorithms cannot be controlled completely." },
  ];

  return (
    <PublicShell locale={locale}>
      <div className="services-10">
        <header className="svc-index-hero">
          <Breadcrumbs locale={locale} items={[{ label: ru ? "Услуги" : "Services" }]} />
          <div className="shell svc-index-hero-grid">
            <div>
              <p className="svc-kicker">{ru ? "Шесть направлений" : "Six directions"}</p>
              <h1>{ru ? "От проблемы — к понятному результату" : "From a problem to a clear deliverable"}</h1>
            </div>
            <p>{ru ? "Выберите задачу, которую узнаёте. На каждой странице показаны диагностика, результат, процесс, сроки, ограничения и цена." : "Choose the task that sounds familiar. Every page explains diagnosis, deliverables, process, timing, limitations and pricing."}</p>
          </div>
        </header>

        <section className="svc-index-list" aria-labelledby="services-list-title">
          <div className="shell">
            <h2 className="visually-hidden" id="services-list-title">{ru ? "Направления KILENI" : "KILENI services"}</h2>
            {serviceSlugs.map((slug, index) => {
              const item = getService(locale, slug)!;
              return (
                <Link href={localizedPath(locale, slug)} key={slug} className={`svc-index-row svc-index-row-${item.visual.kind}`}>
                  <span className="svc-index-number">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="svc-kicker">{item.eyebrow}</p>
                    <h2>{item.title}</h2>
                    <p>{item.lead}</p>
                  </div>
                  <ul aria-label={ru ? "Ожидаемый результат" : "Expected outcome"}>
                    {item.outcomes.slice(0, 2).map((outcome) => <li key={outcome}>{outcome}</li>)}
                  </ul>
                  <b aria-hidden="true">↗</b>
                </Link>
              );
            })}
          </div>
        </section>
        <Faq title={ru ? "Перед выбором услуги" : "Before choosing a service"} items={faq} />
      </div>
    </PublicShell>
  );
}
