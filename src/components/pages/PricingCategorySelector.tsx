"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from "react";
import type { OfferPriceType, OfferService } from "../../config/offers";
import { formatPricingOptionCount } from "../../lib/pricing/format-option-count";

export type PricingCategory = {
  slug: OfferService;
  label: string;
  lead: string;
  eyebrow: string;
  heading: string;
  explanation: string;
  comparisonHeading: string;
  packages: Array<{
    offerId: string;
    category: OfferService;
    priceType: OfferPriceType;
    tierLabel: string;
    name: string;
    description: string;
    price: string;
    note?: string;
    limit: string;
    duration: string;
    mainResult: string;
    features: string[];
    scopeDetails: string[];
    exclusions: string[];
    featured: boolean;
  }>;
};

export function PricingCategorySelector({ breadcrumbs, categories, locale }: { breadcrumbs: ReactNode; categories: PricingCategory[]; locale: "ru" | "en" }) {
  const initialCategory = categories[0];
  const [active, setActive] = useState(initialCategory?.slug ?? "seo-audit");
  const [selected, setSelected] = useState(() => initialCategory ? defaultOfferId(initialCategory) : "");
  const [previewed, setPreviewed] = useState("");
  const [invalidOffer, setInvalidOffer] = useState("");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const offerRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const ru = locale === "ru";
  const category = categories.find((item) => item.slug === active) ?? initialCategory;

  useEffect(() => {
    const syncFromLocation = () => {
      const search = new URL(window.location.href).searchParams;
      const requestedCategory = search.get("category");
      const requestedOffer = search.get("offer");
      const categoryFromUrl = categories.find((item) => item.slug === requestedCategory);
      const categoryFromOffer = requestedOffer
        ? categories.find((item) => item.packages.some((offer) => offer.offerId === requestedOffer))
        : undefined;

      if (requestedOffer && (!categoryFromOffer || (categoryFromUrl && categoryFromOffer.slug !== categoryFromUrl.slug))) {
        setActive(categoryFromUrl?.slug ?? initialCategory?.slug ?? "seo-audit");
        setSelected("");
        setPreviewed("");
        setInvalidOffer(requestedOffer);
        return;
      }

      if (categoryFromOffer && requestedOffer) {
        setActive(categoryFromOffer.slug);
        setSelected(requestedOffer);
        setPreviewed("");
        setInvalidOffer("");
        return;
      }

      if (categoryFromUrl) {
        setActive(categoryFromUrl.slug);
        setSelected(defaultOfferId(categoryFromUrl));
        setPreviewed("");
        setInvalidOffer("");
        return;
      }

      setActive(initialCategory?.slug ?? "seo-audit");
      setSelected(initialCategory ? defaultOfferId(initialCategory) : "");
      setPreviewed("");
      setInvalidOffer("");
    };

    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);
    return () => window.removeEventListener("popstate", syncFromLocation);
  }, [categories, initialCategory]);

  if (!category) return null;

  const updateLocation = (categorySlug: OfferService, offerId?: string) => {
    const url = new URL(window.location.href);
    url.searchParams.delete("category");
    url.searchParams.delete("offer");
    url.searchParams.set("category", categorySlug);
    if (offerId) url.searchParams.set("offer", offerId);
    window.history.pushState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const selectCategory = (next: PricingCategory, focus = false) => {
    const offerId = defaultOfferId(next);
    setActive(next.slug);
    setSelected(offerId);
    setPreviewed("");
    setInvalidOffer("");
    updateLocation(next.slug, offerId || undefined);
    if (focus) requestAnimationFrame(() => tabRefs.current[categories.indexOf(next)]?.focus());
  };

  const selectOffer = (offerId: string) => {
    setSelected(offerId);
    setPreviewed("");
    setInvalidOffer("");
    updateLocation(category.slug, offerId);
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex: number | undefined;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (currentIndex + 1) % categories.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (currentIndex - 1 + categories.length) % categories.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = categories.length - 1;
    if (nextIndex === undefined) return;
    event.preventDefault();
    selectCategory(categories[nextIndex], true);
  };

  const handleOfferKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex: number | undefined;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (currentIndex + 1) % category.packages.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (currentIndex - 1 + category.packages.length) % category.packages.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = category.packages.length - 1;
    if (nextIndex === undefined) return;
    event.preventDefault();
    offerRefs.current[nextIndex]?.focus();
  };

  const stopPreviewWhenFocusLeaves = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPreviewed("");
  };

  const visibleOfferId = invalidOffer ? "" : (previewed || selected || defaultOfferId(category));
  const visibleOffer = category.packages.find((item) => item.offerId === visibleOfferId);

  return (
    <>
      <header className="cp-hero">
        {breadcrumbs}
        <div className="shell cp-hero-grid">
          <div>
            <p className="cp-kicker">{category.eyebrow}</p>
            <h1>{category.heading}</h1>
          </div>
          <div className="cp-hero-note">
            <strong>{ru ? "Цена привязана к видимому объёму" : "Price follows the visible scope"}</strong>
            <p>{category.explanation}</p>
          </div>
        </div>
      </header>

      <section className="cp-pricing-section" aria-labelledby="pricing-list-title">
        <div className="shell">
          <div className="cp-section-intro">
            <p className="cp-kicker">{ru ? "Сравнение вариантов" : "Compare options"}</p>
            <h2 id="pricing-list-title">{category.comparisonHeading}</h2>
            <p>{ru ? "Внешние расходы и работа сверх указанного объёма согласуются до начала." : "External spend and work beyond the package limit are agreed before work begins."}</p>
          </div>
          {invalidOffer ? (
            <p className="cp-pricing-status" role="status">
              {ru ? `Тариф не найден: ${invalidOffer}. Выберите доступный вариант.` : `Offer not found: ${invalidOffer}. Choose an available option.`}
            </p>
          ) : null}
          <div className="cp-category-selector">
            <div className="cp-category-tabs" role="tablist" aria-label={ru ? "Категории услуг" : "Service categories"}>
              {categories.map((item, index) => (
                <button
                  key={item.slug}
                  id={`pricing-tab-${item.slug}`}
                  ref={(node) => { tabRefs.current[index] = node; }}
                  type="button"
                  role="tab"
                  aria-selected={item.slug === category.slug}
                  aria-controls={`pricing-panel-${item.slug}`}
                  tabIndex={item.slug === category.slug ? 0 : -1}
                  onClick={() => selectCategory(item)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
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
                <span>{formatPricingOptionCount(category.packages.length, locale)}</span>
              </header>
              <div className="cp-package-list">
                <div
                  className="cp-tier-switch"
                  role="radiogroup"
                  aria-label={ru ? "Варианты тарифа" : "Package options"}
                  onMouseLeave={() => setPreviewed("")}
                  onBlur={stopPreviewWhenFocusLeaves}
                >
                  {category.packages.map((item, index) => {
                    const isSelected = selected === item.offerId;
                    const isPreview = visibleOfferId === item.offerId;
                    return (
                      <button
                        key={item.offerId}
                        ref={(node) => { offerRefs.current[index] = node; }}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        data-offer-id={item.offerId}
                        data-selected={isSelected}
                        data-preview={isPreview || undefined}
                        onMouseEnter={() => setPreviewed(item.offerId)}
                        onFocus={() => setPreviewed(item.offerId)}
                        onClick={() => selectOffer(item.offerId)}
                        onKeyDown={(event) => handleOfferKeyDown(event, index)}
                      >
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <strong>{item.tierLabel}</strong>
                        <small>{item.price}</small>
                        {item.featured && <b>{ru ? "Рекомендуем" : "Recommended"}</b>}
                      </button>
                    );
                  })}
                </div>
                {visibleOffer ? (
                  <article
                    key={visibleOffer.offerId}
                    className="cp-package cp-package-detail"
                    data-detail-offer-id={visibleOffer.offerId}
                    data-featured={visibleOffer.featured || undefined}
                    data-selected={selected === visibleOffer.offerId || undefined}
                    aria-live="polite"
                  >
                    <div className="cp-package-topline">
                      <p className="cp-package-tier">{visibleOffer.tierLabel}</p>
                      {visibleOffer.featured && <span className="cp-package-badge">{ru ? "Рекомендуем" : "Recommended"}</span>}
                    </div>
                    <h3>{visibleOffer.name}</h3>
                    <p className="cp-package-fit">{visibleOffer.description}</p>
                    <div className="cp-package-price"><strong>{visibleOffer.price}</strong>{visibleOffer.note && <small>{visibleOffer.note}</small>}</div>
                    <p className="cp-package-contract">{priceContract(visibleOffer.priceType, ru)}</p>
                    <dl className="cp-package-facts">
                      <div><dt>{ru ? "Результат" : "Result"}</dt><dd>{visibleOffer.mainResult}</dd></div>
                      <div><dt>{ru ? "Срок" : "Timing"}</dt><dd>{visibleOffer.duration}</dd></div>
                      <div><dt>{ru ? "Объём тарифа" : "Package scope"}</dt><dd>{visibleOffer.limit}</dd></div>
                    </dl>
                    <div className="cp-package-included">
                      <span>{ru ? "Что получите" : "What you receive"}</span>
                      <ul aria-label={ru ? `Что входит в «${visibleOffer.name}»` : `Included in ${visibleOffer.name}`}>{visibleOffer.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
                    </div>
                    <details className="cp-package-exclusions">
                      <summary>{ru ? "Что входит и что считается отдельно" : "What is included and priced separately"}</summary>
                      <p>{ru ? "Указанный объём" : "Stated scope"}</p>
                      <ul>{visibleOffer.scopeDetails.map((detail) => <li key={detail}>{detail}</li>)}</ul>
                      <p>{ru ? "Не входит" : "Excluded"}</p>
                      <ul>{visibleOffer.exclusions.map((exclusion) => <li key={exclusion}>{exclusion}</li>)}</ul>
                    </details>
                    {selected === visibleOffer.offerId ? (
                      <Link className="cp-package-brief" href={`${locale === "en" ? "/en" : ""}/brief?offer=${encodeURIComponent(visibleOffer.offerId)}`}>{ru ? "Перейти к брифу" : "Continue to brief"}<span aria-hidden="true">↗</span></Link>
                    ) : (
                      <button className="cp-package-select" type="button" onClick={() => selectOffer(visibleOffer.offerId)}>
                        {ru ? "Выбрать этот тариф" : "Select this package"}
                      </button>
                    )}
                  </article>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      </section>
    </>
  );
}

function defaultOfferId(category: PricingCategory): string {
  return category.packages.find((item) => item.featured)?.offerId ?? category.packages[0]?.offerId ?? "";
}

function priceContract(type: OfferPriceType, ru: boolean): string {
  if (type === "fixed") return ru ? "Тариф и цена зафиксированы. Дополнительные работы — только после отдельного согласования." : "Package and price are fixed. Additional work only follows a separate agreement.";
  if (type === "from") return ru ? "Это стартовая цена. На итог влияют объём, нужные доступы и нестандартные работы — всё фиксируем до начала." : "This is a starting price. Final cost depends on scope, required access and custom work, all confirmed before work begins.";
  return ru ? "Цена появится после короткого брифа — без выдуманной суммы." : "The price follows a short brief rather than a made-up number.";
}
