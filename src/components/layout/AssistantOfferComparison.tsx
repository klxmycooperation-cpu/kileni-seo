"use client";

import { useId, useState } from "react";
import type { AssistantOffer } from "../../lib/site-assistant";
import type { Locale } from "../../config/site";

function scopeLabel(offer: AssistantOffer, locale: Locale): string {
  if (locale === "en") return offer.scope;
  const c = offer.contract;
  if (!c) return offer.scope;
  switch (c.kind) {
    case "seo-audit": return offer.amount === 0 ? offer.scope : c.urls === null ? "Объём по согласованию" : `До ${c.urls} страниц${c.implementationHours ? `; ${c.implementationHours} ч исправлений` : c.competitors === "included" ? "; анализ конкурентов" : ""}`;
    case "seo-promotion": return `${c.pages === null ? "Объём страниц в месяц по согласованию" : `До ${c.pages} страниц в месяц`}; ${c.regions === null ? "регионы по согласованию" : `регионов: ${c.regions}`}`;
    case "web-development": return c.productType === "landing" ? "Одностраничный сайт" : c.products ? `Каталог до ${c.products} товаров` : c.pages ? `До ${c.pages} страниц` : offer.scope;
    case "marketplaces": return `Один артикул${c.frames ? `; до ${c.frames} кадров` : ""}`;
    case "content-materials": return "Один материал для сайта";
    default: return offer.scope;
  }
}

export function AssistantOfferComparison({ offers, active, onChoose, selectedOfferId, locale = "ru" }: {
  offers: AssistantOffer[]; active: boolean; onChoose: (offer: AssistantOffer) => void; selectedOfferId?: string; locale?: Locale;
}) {
  const [expanded, setExpanded] = useState<string>();
  const instance = useId();
  const commonUnit = offers.every(offer => offer.billingUnit === offers[0]?.billingUnit) ? offers[0]?.billingUnit : undefined;
  const text = (ru: string, en: string) => locale === "ru" ? ru : en;
  if (!offers.length) return <p className="contact-chat__status">{text("Тарифы из этого сравнения больше недоступны. Для выбора откройте актуальное сравнение.", "The plans in this comparison are no longer available. Open a current comparison to choose a plan.")}</p>;
  const reasons=(offer:AssistantOffer)=>[...new Set([...(offer.fit?.reasons??[]),...(offer.fit?.pending??[])])];
  const commonReasons=reasons(offers[0]).filter(reason=>offers.every(offer=>reasons(offer).includes(reason)));
  return <div className="contact-chat__comparisons" aria-label={text("Сравнение тарифов", "Compare plans")}>
    {!active && <p className="contact-chat__historical">{text("Сравнение из истории. Чтобы изменить текущий выбор, откройте сравнение в последнем ответе.", "Historical comparison. Open the latest comparison to change your current choice.")}</p>}
    {commonReasons.length>0 && <ul className="contact-chat__offer-fit contact-chat__fit-shared" aria-label={text("Общие условия проверки", "Shared requirements")}>{commonReasons.map(reason=><li key={reason}>{reason}</li>)}</ul>}
    <div className="contact-chat__comparison-heading"><span>{text("Тариф, объём и срок", "Plan, scope and timing")}</span><span>{commonUnit === "month" ? text("Цена в месяц", "Monthly price") : commonUnit === "sku" ? text("Цена за артикул", "Price per SKU") : commonUnit === "project" ? text("Цена за проект", "Project price") : text("Стоимость", "Price")}</span></div>
    {offers.map(offer => <article className="contact-chat__offer" key={offer.id} data-selected={active && selectedOfferId === offer.id}>
      <div className="contact-chat__offer-row">
        <button className="contact-chat__offer-info" type="button" aria-expanded={expanded === offer.id} aria-controls={`${instance}-${offer.id}`} aria-label={`${text("Подробнее о тарифе", "Plan details")}: ${offer.title}`} onClick={() => setExpanded(expanded === offer.id ? undefined : offer.id)}>
          <strong>{offer.amount === 0 ? text("Бесплатная проверка", "Free preliminary check") : offer.title}<span aria-hidden="true">{expanded === offer.id ? "−" : "+"}</span></strong>
          <span>{scopeLabel(offer, locale)}</span><span>{offer.duration}</span>
          {active && selectedOfferId === offer.id && <span className="contact-chat__offer-preferred">{text("Предпочтительный тариф", "Preferred plan")}</span>}
        </button>
        <div className="contact-chat__offer-select"><button type="button" disabled={!active} aria-label={`${offer.fit?.suitable === false ? text("Проверить тариф", "Check plan") : text("Выбрать тариф", "Choose plan")}: ${offer.title}`} onClick={() => onChoose(offer)}>
          <strong>{offer.amount === null ? offer.price : offer.amount === 0 ? text("Бесплатно", "Free") : `${offer.priceType === "from" ? text("от ", "from ") : ""}${new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-GB").format(offer.amount)} ₽`}</strong>
          {!commonUnit && offer.amount !== null && offer.amount > 0 && <small>{offer.billingUnit === "month" ? text("в месяц", "per month") : offer.billingUnit === "sku" ? text("за артикул", "per SKU") : text("за проект", "per project")}</small>}
          <span className="contact-chat__offer-pick">{offer.fit?.suitable === false ? text("Проверить", "Check") : text("Выбрать", "Choose")}<span aria-hidden="true">→</span></span>
        </button></div>
      </div>
      {reasons(offer).some(reason=>!commonReasons.includes(reason)) && <ul className="contact-chat__offer-fit" aria-label={text("Соответствие вашей задаче", "Fit for your requirements")}>{reasons(offer).filter(reason=>!commonReasons.includes(reason)).map(reason => <li key={reason}>{reason}</li>)}</ul>}
      {offer.estimate && <p className="contact-chat__estimate">{offer.estimate}</p>}
      <div id={`${instance}-${offer.id}`} hidden={expanded !== offer.id} className="contact-chat__offer-detail">
        <p><b>{text("Объём:", "Scope:")}</b> {offer.scope}</p><p><b>{text("Результат:", "Outcome:")}</b> {offer.result}</p>
        <h4>{text("Входит в стоимость", "Included in the price")}</h4><ul>{offer.features.map(feature => <li key={feature}>{feature}</li>)}</ul>
        <h4>{text("Не входит в тариф", "Not included")}</h4><ul>{offer.exclusions.map(exclusion => <li key={exclusion}>{exclusion}</li>)}</ul>
      </div>
    </article>)}
  </div>;
}
