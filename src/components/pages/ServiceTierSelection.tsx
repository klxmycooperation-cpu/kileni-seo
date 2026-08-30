"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import Link from "next/link";
import type { Locale } from "../../config/site";

type TierView = {
  id: string;
  tierLabel: string;
  name: string;
  description: string;
  limit: string;
  duration: string;
  current: string;
  note?: string;
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

export function ServiceTierSelector({ locale, tiers }: { locale: Locale; tiers: TierView[] }) {
  const { selectedTier, selectTier } = useContext(TierContext);
  const ru = locale === "ru";
  return (
    <div className="svc-package-grid">
      {tiers.map((tier) => {
        const selected = selectedTier?.id === tier.id;
        return (
          <article className={tier.featured ? "featured" : ""} data-offer-id={tier.id} data-selected={selected || undefined} key={tier.id}>
            {tier.featured && <span className="svc-package-badge">{ru ? "Рекомендуем" : "Recommended"}</span>}
            <div><span className="svc-tier-label">{tier.tierLabel}</span><span>{tier.duration}</span><h3>{tier.name}</h3><p>{tier.description}</p></div>
            <p className="svc-package-limit"><span>{ru ? "Предел" : "Limit"}</span><b>{tier.limit}</b></p>
            <strong>{tier.current}</strong>
            {tier.note && <small>{tier.note}</small>}
            <div className="svc-package-included">
              <span>{ru ? "Что получите" : "What you receive"}</span>
              <ul>{tier.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
            </div>
            <button type="button" aria-pressed={selected} onClick={() => selectTier({ id: tier.id, label: tier.name })}>{selected ? (ru ? "Выбрано" : "Selected") : (ru ? "Выбрать" : "Select")}</button>
            {selected && <Link href={tier.briefHref}>{ru ? "Продолжить с этим вариантом" : "Continue with this option"}<span aria-hidden="true">↘</span></Link>}
          </article>
        );
      })}
    </div>
  );
}
