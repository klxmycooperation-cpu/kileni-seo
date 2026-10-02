"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import Link from "next/link";
import type { Locale } from "../../config/site";
import { priceToneClass } from "../price-emphasis";

type TierView = {
  id: string;
  tierLabel: string;
  name: string;
  description: string;
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

export function ServiceTierSelector({ locale, tiers }: { locale: Locale; tiers: TierView[] }) {
  const { selectedTier, selectTier } = useContext(TierContext);
  const ru = locale === "ru";
  return (
    <div className="svc-package-grid">
      {tiers.map((tier, index) => {
        const selected = selectedTier?.id === tier.id;
        return (
          <article className={tier.featured ? "featured" : ""} data-has-highlights={tier.highlights?.length ? "true" : undefined} data-offer-id={tier.id} data-selected={selected || undefined} key={tier.id}>
            <div className="svc-package-badge-slot">
              {tier.featured && <span className="svc-package-badge">{ru ? "Рекомендуем" : "Recommended"}</span>}
            </div>
            <div className="svc-package-head">
              <div className="svc-package-meta"><span className="svc-tier-label">{tier.tierLabel}</span><span>{tier.duration}</span></div>
              <h3>{tier.name}</h3>
              <p>{tier.description}</p>
            </div>
            <p className="svc-package-limit"><span>{ru ? "Объём тарифа" : "Package scope"}</span><b>{tier.limit}</b></p>
            <strong className={`svc-package-price price-emphasis ${priceToneClass(index)}`}>{tier.current}</strong>
            <small className="svc-package-note">{tier.note ?? ""}</small>
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
