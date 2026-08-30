"use client";

import Link from "next/link";
import { useState } from "react";

export type PricingCategory = {
  slug: string;
  label: string;
  lead: string;
  packages: Array<{
    offerId: string;
    tierLabel: string;
    name: string;
    description: string;
    price: string;
    note?: string;
    limit: string;
    duration: string;
    mainResult: string;
    features: string[];
    featured: boolean;
  }>;
};

export function PricingCategorySelector({ categories, locale }: { categories: PricingCategory[]; locale: "ru" | "en" }) {
  const [active, setActive] = useState(categories[0]?.slug ?? "");
  const [selected, setSelected] = useState("");
  const ru = locale === "ru";
  const category = categories.find((item) => item.slug === active) ?? categories[0];
  if (!category) return null;
  const selectedKey = (offerId: string) => offerId;

  const selectCategory = (next: PricingCategory) => {
    setActive(next.slug);
    setSelected("");
  };

  return (
    <div className="cp-category-selector">
      <div className="cp-category-tabs" role="tablist" aria-label={ru ? "Категории услуг" : "Service categories"}>
        {categories.map((item, index) => (
          <button
            key={item.slug}
            id={`pricing-tab-${item.slug}`}
            type="button"
            role="tab"
            aria-selected={item.slug === category.slug}
            aria-controls={`pricing-panel-${item.slug}`}
            tabIndex={item.slug === category.slug ? 0 : -1}
            onClick={() => selectCategory(item)}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {item.label}
          </button>
        ))}
      </div>
      <section
        className="cp-category-panel"
        id={`pricing-panel-${category.slug}`}
        role="tabpanel"
        aria-labelledby={`pricing-tab-${category.slug}`}
      >
        <header>
          <p>{category.lead}</p>
          <span>{ru ? `${category.packages.length} уровня` : `${category.packages.length} tiers`}</span>
        </header>
        <div className="cp-package-list" aria-live="polite">
          {category.packages.map((item) => (
            <article className="cp-package" data-offer-id={item.offerId} data-featured={item.featured || undefined} data-selected={selected === selectedKey(item.offerId) || undefined} key={item.offerId}>
              <div className="cp-package-topline">
                <p className="cp-package-tier">{item.tierLabel}</p>
                {item.featured && <span className="cp-package-badge">{ru ? "Рекомендуем" : "Recommended"}</span>}
              </div>
              <h3>{item.name}</h3>
              <p className="cp-package-fit">{item.description}</p>
              <div className="cp-package-price"><strong>{item.price}</strong>{item.note && <small>{item.note}</small>}</div>
              <dl className="cp-package-facts">
                <div><dt>{ru ? "Результат" : "Result"}</dt><dd>{item.mainResult}</dd></div>
                <div><dt>{ru ? "Срок" : "Timing"}</dt><dd>{item.duration}</dd></div>
                <div><dt>{ru ? "Объём" : "Scope"}</dt><dd>{item.limit}</dd></div>
              </dl>
              <div className="cp-package-included">
                <span>{ru ? "Что получите" : "What you receive"}</span>
                <ul aria-label={ru ? `Что входит в «${item.name}»` : `Included in ${item.name}`}>{item.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
              </div>
              <button className="cp-package-select" type="button" aria-pressed={selected === selectedKey(item.offerId)} onClick={() => setSelected(selected === selectedKey(item.offerId) ? "" : selectedKey(item.offerId))}>
                {selected === selectedKey(item.offerId) ? (ru ? "Выбрано" : "Selected") : (ru ? "Выбрать" : "Select")}
              </button>
              {selected === selectedKey(item.offerId) && <Link className="cp-package-brief" href={`${locale === "en" ? "/en" : ""}/brief?offer=${encodeURIComponent(item.offerId)}`}>{ru ? "Перейти к брифу" : "Continue to brief"}<span aria-hidden="true">↗</span></Link>}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
