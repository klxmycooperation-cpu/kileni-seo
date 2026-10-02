"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent, type ReactNode } from "react";
import type { OfferPriceType, OfferService } from "../../config/offers";
import { priceToneClass } from "../price-emphasis";
import { CanvasText } from "../ui/canvas-text";

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
  const [expandedOffer, setExpandedOffer] = useState("");
  const [invalidOffer, setInvalidOffer] = useState("");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const offerRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const detailsDialogRef = useRef<HTMLDialogElement | null>(null);
  const detailsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const ru = locale === "ru";
  const category = categories.find((item) => item.slug === active) ?? initialCategory;
  const detailsOffer = category?.packages.find((item) => item.offerId === expandedOffer);
  const activeCategoryIndex = Math.max(0, categories.indexOf(category));
  const hasSelectablePackages = !(category?.packages.length === 1 && category.packages[0]?.priceType === "custom");
  const categoryNavigatorStyle = {
    "--category-active-index": activeCategoryIndex,
  } as CSSProperties;

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
        setExpandedOffer("");
        setInvalidOffer(requestedOffer);
        return;
      }

      if (categoryFromOffer && requestedOffer) {
        setActive(categoryFromOffer.slug);
        setSelected(requestedOffer);
        setPreviewed("");
        setExpandedOffer("");
        setInvalidOffer("");
        return;
      }

      if (categoryFromUrl) {
        setActive(categoryFromUrl.slug);
        setSelected(defaultOfferId(categoryFromUrl));
        setPreviewed("");
        setExpandedOffer("");
        setInvalidOffer("");
        return;
      }

      setActive(initialCategory?.slug ?? "seo-audit");
      setSelected(initialCategory ? defaultOfferId(initialCategory) : "");
      setPreviewed("");
      setExpandedOffer("");
      setInvalidOffer("");
    };

    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);
    return () => window.removeEventListener("popstate", syncFromLocation);
  }, [categories, initialCategory]);

  useEffect(() => {
    if (!window.matchMedia("(max-width: 1024px)").matches) return;
    const selectedTab = tabRefs.current[activeCategoryIndex];
    const rail = selectedTab?.parentElement;
    if (!selectedTab || !rail) return;

    const targetLeft = selectedTab.offsetLeft - ((rail.clientWidth - selectedTab.offsetWidth) / 2);
    rail.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [activeCategoryIndex]);

  useEffect(() => {
    const dialog = detailsDialogRef.current;
    if (!dialog) return;
    if (detailsOffer && !dialog.open) dialog.showModal();
    if (!detailsOffer && dialog.open) dialog.close();
  }, [detailsOffer]);

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
    setExpandedOffer("");
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

  return (
    <>
      <header className="cp-hero">
        {breadcrumbs}
        <div className="shell cp-hero-grid">
          <div>
            <p className="cp-kicker">{category.eyebrow}</p>
            <h1><CanvasText text={category.heading} lineGap={7} animationDuration={10}/></h1>
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
            </div>
          {invalidOffer ? (
            <p className="cp-pricing-status" role="status">
              {ru ? `Тариф не найден: ${invalidOffer}. Выберите доступный вариант.` : `Offer not found: ${invalidOffer}. Choose an available option.`}
            </p>
          ) : null}
          <div className="cp-category-selector">
            <div
              className="cp-category-tabs"
              role="tablist"
              aria-label={ru ? "Категории услуг" : "Service categories"}
              data-active-category={category.slug}
              style={categoryNavigatorStyle}
            >
              <span className="cp-category-tabs__active" aria-hidden="true" />
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
              key={category.slug}
              className="cp-category-panel"
              id={`pricing-panel-${category.slug}`}
              role="tabpanel"
              aria-labelledby={`pricing-tab-${category.slug}`}
              data-category={category.slug}
            >
              <header>
                <p>{category.lead}</p>
              </header>
              <div className="cp-package-list">
                <div
                  className="cp-tier-switch"
                  data-option-count={category.packages.length}
                  role={hasSelectablePackages ? "radiogroup" : undefined}
                  aria-label={hasSelectablePackages ? (ru ? "Варианты тарифа" : "Package options") : undefined}
                  onMouseLeave={() => setPreviewed("")}
                  onBlur={stopPreviewWhenFocusLeaves}
                >
                  {category.packages.map((item, index) => {
                    const isSelected = selected === item.offerId;
                    const isPreview = previewed === item.offerId;
                    const price = splitPackagePrice(item.price);
                    const opensBriefDirectly = category.packages.length === 1 && item.priceType === "custom";
                    const briefHref = `/brief?offer=${encodeURIComponent(item.offerId)}`;
                    const selectionContent = (
                      <>
                        <span className="cp-tier-card-summary">
                          <span className="cp-tier-card-index">{String(index + 1).padStart(2, "0")}</span>
                          {item.featured && <b>{ru ? "Рекомендуем" : "Recommended"}</b>}
                          <strong>{item.tierLabel}</strong>
                          <span className="cp-tier-card-description">{item.description}</span>
                        </span>
                        <span className="cp-tier-card-price">
                          <strong className={`price-emphasis ${priceToneClass(index)}`}>{price.amount}</strong>
                          {price.note ? <small>{price.note}</small> : null}
                        </span>
                        <span className="cp-tier-card-action">
                          {opensBriefDirectly
                            ? (ru ? "Заполнить бриф" : "Fill in the brief")
                            : isSelected
                              ? (ru ? "Тариф выбран" : "Package selected")
                              : (ru ? "Выбрать тариф" : "Choose package")}
                        </span>
                      </>
                    );
                    return (
                      <article
                        key={item.offerId}
                        className="cp-tier-card"
                        data-offer-id={item.offerId}
                        data-featured={item.featured || undefined}
                        data-price-type={item.priceType}
                        data-selected={isSelected}
                        data-preview={isPreview || undefined}
                        data-expanded={expandedOffer === item.offerId || undefined}
                      >
                        {opensBriefDirectly ? (
                          <Link
                            className="cp-tier-card-select"
                            href={briefHref}
                            onMouseEnter={() => setPreviewed(item.offerId)}
                            onFocus={() => setPreviewed(item.offerId)}
                          >
                            {selectionContent}
                          </Link>
                        ) : (
                          <button
                            ref={(node) => { offerRefs.current[index] = node; }}
                            className="cp-tier-card-select"
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onMouseEnter={() => setPreviewed(item.offerId)}
                            onFocus={() => setPreviewed(item.offerId)}
                            onClick={() => selectOffer(item.offerId)}
                            onKeyDown={(event) => handleOfferKeyDown(event, index)}
                          >
                            {selectionContent}
                          </button>
                        )}
                        <div className="cp-tier-card-value">
                          <p className="cp-tier-card-outcome">
                            <span>{ru ? "Что получите" : "What you receive"}</span>
                            <strong>{item.mainResult}</strong>
                          </p>
                          <ul className="cp-tier-card-includes">
                            {item.features.map((feature) => <li key={feature}>{feature}</li>)}
                          </ul>
                        </div>
                        <button
                          className="cp-tier-card-details-trigger"
                          type="button"
                          aria-haspopup="dialog"
                          aria-expanded={expandedOffer === item.offerId}
                          aria-controls="cp-tier-details-dialog"
                          aria-label={ru ? `Подробнее о тарифе «${item.tierLabel}»` : `More about the ${item.tierLabel} package`}
                          onClick={(event) => {
                            detailsTriggerRef.current = event.currentTarget;
                            setExpandedOffer(item.offerId);
                          }}
                        >
                          <span>{ru ? "Подробнее о тарифе" : "Package details"}</span>
                          <span aria-hidden="true">↗</span>
                        </button>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
                <dialog
                  ref={detailsDialogRef}
                  id="cp-tier-details-dialog"
                  className="cp-tier-details-dialog"
                  aria-labelledby="cp-tier-details-title"
                  onClose={() => {
                    setExpandedOffer("");
                    if (detailsTriggerRef.current?.isConnected) detailsTriggerRef.current.focus();
                  }}
                >
                  {detailsOffer ? (
                    <div className="cp-tier-details-dialog-inner">
                      <header className="cp-tier-details-dialog-header">
                        <div>
                          <p>{ru ? "Условия тарифа" : "Package terms"}</p>
                          <h2 id="cp-tier-details-title">{detailsOffer.tierLabel}</h2>
                          <strong>{detailsOffer.price}</strong>
                          <p className="cp-tier-details-dialog-description">{detailsOffer.description}</p>
                        </div>
                        <button type="button" onClick={() => detailsDialogRef.current?.close()} aria-label={ru ? "Закрыть условия тарифа" : "Close package terms"}>×</button>
                      </header>
                      <div className="cp-tier-details-dialog-grid">
                        <div>
                          <dl className="cp-tier-card-facts">
                            <div><dt>{ru ? "Срок" : "Timing"}</dt><dd>{detailsOffer.duration}</dd></div>
                            <div><dt>{ru ? "Объём" : "Scope"}</dt><dd>{detailsOffer.limit}</dd></div>
                          </dl>
                          <section>
                            <h3>{ru ? "Что получите" : "What you receive"}</h3>
                            <p>{detailsOffer.mainResult}</p>
                            <ul>{detailsOffer.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
                          </section>
                        </div>
                        <section>
                          <h3>{ru ? "Что не входит" : "What is not included"}</h3>
                          <ul>{detailsOffer.exclusions.map((exclusion) => <li key={exclusion}>{exclusion}</li>)}</ul>
                        </section>
                      </div>
                      {selected === detailsOffer.offerId ? (
                        <Link className="cp-tier-card-brief" href={`/brief?offer=${encodeURIComponent(detailsOffer.offerId)}`}>
                          {ru ? "Перейти к брифу" : "Continue to brief"}<span aria-hidden="true">↗</span>
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </dialog>
          </div>
        </div>
      </section>
    </>
  );
}

function defaultOfferId(category: PricingCategory): string {
  return category.packages.find((item) => item.featured)?.offerId ?? category.packages[0]?.offerId ?? "";
}

function splitPackagePrice(price: string): { amount: string; note: string } {
  const rubleIndex = price.indexOf(" ₽");
  if (rubleIndex < 0) return { amount: price, note: "" };
  const amountEnd = rubleIndex + 2;
  return { amount: price.slice(0, amountEnd), note: price.slice(amountEnd).trim() };
}
