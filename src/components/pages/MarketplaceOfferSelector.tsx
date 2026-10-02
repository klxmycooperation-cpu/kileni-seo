"use client";

import Link from "next/link";
import { useState } from "react";
import { offerBriefHref } from "../../config/offers";
import type { Locale } from "../../config/site";
import type { MarketplaceId } from "../../content/marketplaces";
import { priceToneClass } from "../price-emphasis";

export type MarketplaceOfferView = {
  id: string;
  name: string;
  description: string;
  current: string;
  note?: string;
  limit: string;
  duration: string;
  mainResult: string;
  features: string[];
  featured: boolean;
};

export function MarketplaceOfferSelector({ platform, locale, offers }: { platform: MarketplaceId; locale: Locale; offers: MarketplaceOfferView[] }) {
  const [selected, setSelected] = useState(offers.find((offer) => offer.featured)?.id ?? offers[0]?.id ?? "");
  const ru = locale === "ru";

  return (
    <div className="marketplace-offer-grid">
      {offers.map((offer, index) => {
        const active = offer.id === selected;
        const href = offerBriefHref(offer.id, locale);
        return (
          <article className="marketplace-offer" data-offer-id={offer.id} data-platform={platform} data-selected={active || undefined} data-featured={offer.featured || undefined} key={offer.id}>
            <div className="marketplace-offer-badge-slot">
              {offer.featured && <span className="marketplace-offer-badge">{ru ? "Рекомендуем" : "Recommended"}</span>}
            </div>
            <div className="marketplace-offer-head"><h3>{offer.name}</h3><p>{offer.description}</p></div>
            <strong className={`marketplace-offer-price price-emphasis ${priceToneClass(index)}`}>{offer.current}</strong>
            <small className="marketplace-offer-note">{offer.note ?? ""}</small>
            <dl>
              <div><dt>{ru ? "Что вы получите" : "What you receive"}</dt><dd>{offer.mainResult}</dd></div>
              <div><dt>{ru ? "Объём работы" : "Work scope"}</dt><dd>{offer.limit}</dd></div>
              <div><dt>{ru ? "Срок" : "Timing"}</dt><dd>{offer.duration}</dd></div>
            </dl>
            <div className="marketplace-offer__included">
              <h4>{ru ? "В результат входят" : "Included in the result"}</h4>
              <ul>{offer.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
            </div>
            <div className="marketplace-offer-actions">
              {!active && <button type="button" onClick={() => setSelected(offer.id)}>{ru ? "Выбрать вариант" : "Select option"}</button>}
              {active && <Link href={href}>{ru ? "Передать в короткий бриф" : "Continue to the short brief"}<span aria-hidden="true">↗</span></Link>}
            </div>
          </article>
        );
      })}
    </div>
  );
}
