"use client";

import Link from "next/link";
import { useState } from "react";
import { localizedPath } from "../../config/site";

export type PricingCategory = {
  slug: string;
  label: string;
  lead: string;
  packages: Array<{
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
  const selectedKey = (name: string) => `${category.slug}:${name}`;

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
            onClick={() => setActive(item.slug)}
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
        {category.slug === "seo-audit" && (
          <p className="cp-first-audit-offer">
            {ru
              ? "−25% только на первый платный SEO-аудит для нового клиента. После бесплатной проверки подтверждаем право на скидку до оплаты."
              : "25% off applies only to a new client’s first paid SEO audit. Eligibility is confirmed after the free check and before payment."}
          </p>
        )}
        <div className="cp-package-list">
          {category.packages.map((item) => (
            <article className="cp-package" data-featured={item.featured || undefined} data-selected={selected === selectedKey(item.name) || undefined} key={item.name}>
              {item.featured && <span className="cp-package-badge">{ru ? "Рекомендуем" : "Recommended"}</span>}
              <div className="cp-package-main">
                <div>
                  <p className="cp-package-tier">{item.tierLabel}</p>
                  <h3>{item.name}</h3>
                  <p className="cp-package-fit"><span>{ru ? "Кому подходит" : "Best for"}</span>{item.description}</p>
                </div>
                <div className="cp-package-price">
                  <strong>{item.price}</strong>
                  {item.note && <small>{item.note}</small>}
                </div>
              </div>
              <dl className="cp-package-facts">
                <div><dt>{ru ? "Главный результат" : "Main result"}</dt><dd>{item.mainResult}</dd></div>
                <div><dt>{ru ? "Срок" : "Timing"}</dt><dd>{item.duration}</dd></div>
              </dl>
              <div className="cp-package-scope">
                <span>{ru ? "Предел тарифа" : "Package limit"}</span>
                <b>{item.limit}</b>
              </div>
              <details className="cp-package-details">
                <summary>{ru ? "Полный состав уровня" : "Full tier scope"}</summary>
                <ul aria-label={ru ? `Что входит в «${item.name}»` : `Included in ${item.name}`}>
                  {item.features.map((feature) => <li key={feature}>{feature}</li>)}
                </ul>
              </details>
              <button className="cp-package-select" type="button" aria-pressed={selected === selectedKey(item.name)} onClick={() => setSelected(selectedKey(item.name))}>
                {selected === selectedKey(item.name) ? (ru ? "Выбрано" : "Selected") : (ru ? "Выбрать уровень" : "Select tier")}
              </button>
              {selected === selectedKey(item.name) && (
                <Link className="cp-package-brief" href={`${localizedPath(locale, "brief")}?service=${encodeURIComponent(category.slug)}&tier=${encodeURIComponent(item.name)}`}>
                  {ru ? "Перейти к короткому брифу" : "Continue to the short brief"}<span aria-hidden="true">↗</span>
                </Link>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
