"use client";

import Link from "next/link";
import { useState } from "react";
import { offerBriefHref } from "../../config/offers";
import type { Locale } from "../../config/site";
import type { MarketplaceId } from "../../content/marketplaces";

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
      {offers.map((offer) => {
        const active = offer.id === selected;
        const href = offerBriefHref(offer.id, locale);
        return (
          <article className="marketplace-offer" data-offer-id={offer.id} data-platform={platform} data-selected={active || undefined} data-featured={offer.featured || undefined} key={offer.id}>
            {offer.featured && <span className="marketplace-offer-badge">{ru ? "Рекомендуем" : "Recommended"}</span>}
            <h3>{offer.name}</h3>
            <p>{offer.description}</p>
            <strong>{offer.current}</strong>
            {offer.note && <small>{offer.note}</small>}
            <dl>
              <div><dt>{ru ? "Главный результат" : "Main result"}</dt><dd>{offer.mainResult}</dd></div>
              <div><dt>{ru ? "Предел" : "Limit"}</dt><dd>{offer.limit}</dd></div>
              <div><dt>{ru ? "Срок" : "Timing"}</dt><dd>{offer.duration}</dd></div>
            </dl>
            <div className="marketplace-offer__included">
              <h4>{ru ? "В результат входят" : "Included in the result"}</h4>
              <ul>{offer.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
            </div>
            <button type="button" aria-pressed={active} onClick={() => setSelected(offer.id)}>{active ? (ru ? "Выбрано" : "Selected") : (ru ? "Выбрать вариант" : "Select option")}</button>
            {active && <Link href={href}>{ru ? "Передать в короткий бриф" : "Continue to the short brief"}<span aria-hidden="true">↗</span></Link>}
          </article>
        );
      })}
    </div>
  );
}
