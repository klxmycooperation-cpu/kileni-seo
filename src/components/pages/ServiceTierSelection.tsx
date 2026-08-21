"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
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
};

type TierContextValue = { selectedTier: string; selectTier: (tier: string) => void };
const TierContext = createContext<TierContextValue>({ selectedTier: "", selectTier: () => undefined });

export function ServiceTierProvider({ children }: { children: ReactNode }) {
  const [selectedTier, selectTier] = useState("");
  return <TierContext.Provider value={{ selectedTier, selectTier }}>{children}</TierContext.Provider>;
}

export function useSelectedServiceTier(): string {
  return useContext(TierContext).selectedTier;
}

export function ServiceTierSelector({ locale, tiers }: { locale: Locale; tiers: TierView[] }) {
  const { selectedTier, selectTier } = useContext(TierContext);
  const ru = locale === "ru";
  return (
    <div className="svc-package-grid">
      {tiers.map((tier) => {
        const selected = selectedTier === tier.id;
        return (
          <article className={tier.featured ? "featured" : ""} data-selected={selected || undefined} key={tier.id}>
            {tier.featured && <span className="svc-package-badge">{ru ? "Рекомендуем" : "Recommended"}</span>}
            <div><span className="svc-tier-label">{tier.tierLabel}</span><span>{tier.duration}</span><h3>{tier.name}</h3><p>{tier.description}</p></div>
            <p className="svc-package-limit"><span>{ru ? "Предел" : "Limit"}</span><b>{tier.limit}</b></p>
            <strong>{tier.current}</strong>
            {tier.note && <small>{tier.note}</small>}
            <details className="svc-package-details">
              <summary>{ru ? "Полный состав уровня" : "Full tier scope"}</summary>
              <ul>{tier.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
            </details>
            <button type="button" aria-pressed={selected} onClick={() => selectTier(tier.id)}>{selected ? (ru ? "Выбрано" : "Selected") : (ru ? "Выбрать уровень" : "Select tier")}</button>
            {selected && <a href="#request">{ru ? "Перейти к заявке" : "Continue to the request"}<span aria-hidden="true">↘</span></a>}
          </article>
        );
      })}
    </div>
  );
}
