"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import Link from "next/link";
import type { Locale } from "../../config/site";
import { priceToneClass } from "../price-emphasis";
import { PriceCardIcon, servicePriceKind, servicePriceTone } from "./PriceCardIcon";

type TierView = {
  id: string;
  tierLabel: string;
  name: string;
  description: string;
  mainResult: string;
  limit: string;
  duration: string;
  current: string;
  note?: string;
  highlights?: Array<{ value: string; label: string }>;
  features: string[];
  featured: boolean;
  briefHref: string;
};

type SelectedTier = { id: string; label: string } | null;
type TierContextValue = { selectedTier: SelectedTier; selectTier: (tier: SelectedTier) => void };
const TierContext = createContext<TierContextValue>({ selectedTier: null, selectTier: () => undefined });

export function ServiceTierProvider({ children }: { children: ReactNode }) {
  const [selectedTier, selectTier] = useState<SelectedTier>(null);
  return <TierContext.Provider value={{ selectedTier, selectTier }}>{children}</TierContext.Provider>;
}

export function useSelectedServiceTier(): string {
  return useContext(TierContext).selectedTier?.label ?? "";
}

export function useSelectedServiceOfferId(): string {
  return useContext(TierContext).selectedTier?.id ?? "";
}

export function ServiceTierSelector({ locale, tiers, layout = "standard" }: { locale: Locale; tiers: TierView[]; layout?: "standard" | "marketplace" }) {
  const { selectedTier, selectTier } = useContext(TierContext);
  const ru = locale === "ru";
  const refreshed = tiers.every((tier) => /^(development-|seo-audit-|seo-promotion-)/u.test(tier.id));

  if (layout === "marketplace") {
    return (
      <div className="marketplace-offer-grid svc-website-offer-grid service-price-grid">
        {tiers.map((tier, index) => {
          const selected = selectedTier?.id === tier.id;
          return (
            <article className="marketplace-offer service-price-card" data-price-tone={servicePriceTone(index)} data-offer-id={tier.id} data-featured={tier.featured || undefined} data-selected={selected || undefined} key={tier.id}>
              <div className="marketplace-offer-badge-slot">
                <PriceCardIcon kind={servicePriceKind(tier.id)} index={index} />
                {tier.featured && <span className="marketplace-offer-badge">{tier.tierLabel}</span>}
              </div>
              <div className="marketplace-offer-head">
                <h3>{tier.name}</h3>
                {!tier.featured && <span className="svc-website-offer-label">{tier.tierLabel}</span>}
                <p>{tier.description}</p>
              </div>
              <strong className={`marketplace-offer-price price-emphasis ${priceToneClass(index)}`}>{tier.current}</strong>
              <small className="marketplace-offer-note">{tier.note ?? ""}</small>
              <dl>
                <div><dt>{ru ? "Что вы получите" : "What you receive"}</dt><dd>{tier.mainResult}</dd></div>
                <div><dt>{ru ? "Объём работы" : "Scope of work"}</dt><dd>{tier.limit}</dd></div>
                <div><dt>{ru ? "Срок" : "Timing"}</dt><dd>{tier.duration}</dd></div>
              </dl>
              <div className="marketplace-offer__included">
                <h4>{ru ? "В результат входят" : "Included in the result"}</h4>
                <ul>{tier.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
              </div>
              <div className="marketplace-offer-actions">
                {selected ? (
                  <Link href={tier.briefHref}>{ru ? "Продолжить с этим вариантом" : "Continue with this option"}<span aria-hidden="true">↘</span></Link>
                ) : (
                  <button type="button" onClick={() => selectTier({ id: tier.id, label: tier.name })}>{ru ? "Выбрать" : "Select"}</button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`svc-package-grid${refreshed ? " service-price-grid" : ""}`}>
      {tiers.map((tier, index) => {
        const selected = selectedTier?.id === tier.id;
        return (
          <article className={`${tier.featured ? "featured" : ""}${refreshed ? " service-price-card" : ""}`} data-price-tone={refreshed ? servicePriceTone(index) : undefined} data-has-highlights={tier.highlights?.length ? "true" : undefined} data-offer-id={tier.id} data-selected={selected || undefined} key={tier.id}>
            <div className="svc-package-badge-slot">
              {refreshed && <PriceCardIcon kind={servicePriceKind(tier.id)} index={index} />}
              {tier.featured && <span className="svc-package-badge">{ru ? "Рекомендуем" : "Recommended"}</span>}
            </div>
            <div className="svc-package-head">
              <div className="svc-package-meta"><span className="svc-tier-label">{tier.tierLabel}</span>{!refreshed && <span>{tier.duration}</span>}</div>
              <h3>{tier.name}</h3>
              <p>{tier.description}</p>
            </div>
            {!refreshed && <p className="svc-package-limit"><span>{ru ? "Объём тарифа" : "Package scope"}</span><b>{tier.limit}</b></p>}
            <strong className={`svc-package-price price-emphasis ${priceToneClass(index)}`}>{tier.current}</strong>
            <small className="svc-package-note">{tier.note ?? ""}</small>
            {refreshed && <div className="service-price-facts">
              <p className="svc-package-limit"><span>{ru ? "Объём тарифа" : "Package scope"}</span><b>{tier.limit}</b></p>
              <span className="service-price-duration">{tier.duration}</span>
            </div>}
            {tier.highlights && tier.highlights.length > 0 && (
              <div className="svc-package-highlights" aria-label={ru ? "Ключевые параметры" : "Key details"}>
                {tier.highlights.map((highlight) => (
                  <div className="svc-package-highlight" key={`${highlight.value}-${highlight.label}`}>
                    <strong>{highlight.value}</strong>
                    <span>{highlight.label}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="svc-package-included">
              <span>{ru ? "Что получите" : "What you receive"}</span>
              <ul>{tier.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
            </div>
            <div className="svc-package-actions">
              {selected ? (
                <Link href={tier.briefHref}>{ru ? "Продолжить с этим вариантом" : "Continue with this option"}<span aria-hidden="true">↘</span></Link>
              ) : (
                <button type="button" onClick={() => selectTier({ id: tier.id, label: tier.name })}>{ru ? "Выбрать" : "Select"}</button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
