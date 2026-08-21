import "../../../app/service-pricing-brief-10.css";

import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";
import { localizedMarketplaceOffers } from "../../config/marketplace-offers";
import { getMarketplaceResultExample } from "../../content/marketplace-result-examples";
import { marketplaceName, marketplacePlatforms as platforms, type MarketplacePlatform as Platform } from "../../content/marketplaces";
import { PublicShell } from "../layout/PublicShell";
import { MarketplaceOfferSelector } from "./MarketplaceOfferSelector";

export function MarketplacePage({ locale, platform }: { locale: Locale; platform?: string }) {
  const item = platform ? platforms.find((entry) => entry.id === platform) : undefined;
  if (!platform || !item) return <MarketplaceOverview locale={locale} />;
  return <MarketplaceDetail locale={locale} platform={item} />;
}

function MarketplaceOverview({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  return (
    <PublicShell locale={locale}>
    <div className="marketplace-page page-main">
      <section className="marketplace-hero shell">
        <p className="section-kicker">{ru ? "Маркетплейсы" : "Marketplaces"}</p>
        <h1>{ru ? "Карточка, которую легко сравнить и выбрать" : "A product card built to be compared and chosen"}</h1>
        <p>{ru ? "Работаем с полями, запросами и медиа каждой площадки отдельно. До старта показываем состав, границы и результат." : "We handle fields, search intent and media for each platform separately. Scope, boundaries and deliverables are clear before work begins."}</p>
      </section>
      <section className="marketplace-grid shell" aria-label={ru ? "Площадки" : "Platforms"}>
        {platforms.map((entry) => {
          const copy = ru ? entry.ru : entry.en;
          const name = marketplaceName(entry, locale);
          return (
            <Link className="marketplace-card" href={localizedPath(locale, `marketplaces/${entry.id}`)} key={entry.id}>
              <PlatformMark platform={entry} label={name} />
              <div><h2>{name}</h2><p>{copy.lead}</p></div>
              <span>{ru ? "Открыть направление" : "Open platform"} ↗</span>
            </Link>
          );
        })}
      </section>
      <nav className="marketplace-related shell" aria-label={ru ? "Полезные разделы" : "Related pages"}>
        <Link href={localizedPath(locale, "pricing")}>{ru ? "Сравнить варианты и цены" : "Compare scopes and pricing"} ↗</Link>
        <Link href={localizedPath(locale, "glossary")}>{ru ? "Разобраться в терминах" : "Understand the terminology"} ↗</Link>
        <Link href={localizedPath(locale, "brief")}>{ru ? "Описать ассортимент" : "Describe the catalogue"} ↗</Link>
      </nav>
      <p className="marketplace-disclaimer shell">{ru ? "Названия и знаки площадок принадлежат правообладателям. KILENI не заявляет статус официального партнёра площадок." : "Platform names and marks belong to their respective owners. KILENI does not claim official partner status."}</p>
    </div>
    </PublicShell>
  );
}

function MarketplaceDetail({ locale, platform }: { locale: Locale; platform: Platform }) {
  const ru = locale === "ru";
  const copy = ru ? platform.ru : platform.en;
  const name = marketplaceName(platform, locale);
  const offers = localizedMarketplaceOffers(platform.id, locale);
  const example = getMarketplaceResultExample(platform.id, locale);
  const sections = [
    [ru ? "Что влияет на видимость" : "What affects visibility", copy.visibility],
    [ru ? "Какие поля важны" : "Important fields", copy.fields],
    [ru ? "Как проходит работа" : "How the work runs", copy.work],
    [ru ? "Что вы получите" : "What you receive", copy.result],
    [ru ? "Что можно добавить" : "Optional additions", copy.extra],
  ] as const;
  return (
    <PublicShell locale={locale}>
    <div className="marketplace-page page-main">
      <section className="marketplace-detail-hero shell">
        <PlatformMark platform={platform} label={name} />
        <div><p className="section-kicker">{ru ? "Карточки товаров" : "Product cards"}</p><h1>{name}</h1><p>{copy.lead}</p></div>
      </section>
      <nav className="marketplace-platform-switch shell" aria-label={ru ? "Выбор площадки" : "Choose a platform"}>
        {platforms.map((entry) => <Link aria-current={entry.id === platform.id ? "page" : undefined} href={localizedPath(locale, `marketplaces/${entry.id}`)} key={entry.id}>{marketplaceName(entry, locale)}</Link>)}
      </nav>
      <section className="marketplace-detail shell">
        {[...sections.slice(0, 2), [ru ? "Контент и медиа" : "Content and media", copy.content] as const, ...sections.slice(2)].map(([heading, bullets], index) => (
          <article className="marketplace-detail-row" key={heading}>
            <span>0{index + 1}</span><h2>{heading}</h2><ul>{bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
          </article>
        ))}
        <article className="marketplace-detail-row marketplace-commercial-row">
          <span>08</span><h2>{ru ? "Доступ и границы" : "Access and boundaries"}</h2><div><p>{copy.access}</p></div>
        </article>
        <article className="marketplace-detail-row">
          <span>09</span><h2>{ru ? "Как принять результат" : "How delivery is accepted"}</h2><ul>{copy.acceptance.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
        </article>
      </section>
      <section className="marketplace-result-example shell" aria-labelledby="marketplace-result-example-title">
        <header><p className="section-kicker">{ru ? "Пример результата" : "Deliverable example"}</p><h2 id="marketplace-result-example-title">{example.title}</h2><p>{example.lead}</p></header>
        <div className="marketplace-result-states">
          {[example.before, example.after].map((state, index) => <article data-after={index === 1 || undefined} key={state.label}><span>{state.label}</span><h3>{state.title}</h3><ul>{state.items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}
        </div>
        <dl className="marketplace-result-files">{example.rows.map((row) => <div key={row.key}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>
        <p className="marketplace-result-disclaimer">{example.disclaimer}</p>
      </section>
      <section className="marketplace-offers shell" aria-labelledby="marketplace-offers-title">
        <header><p className="section-kicker">{ru ? "Состав и цена" : "Scope and pricing"}</p><h2 id="marketplace-offers-title">{ru ? `Три варианта для ${name}` : `Three options for ${name}`}</h2><p>{ru ? "Выберите ближайший объём — площадка и вариант попадут в бриф автоматически." : "Choose the closest scope. Platform and option are carried into the brief automatically."}</p></header>
        <MarketplaceOfferSelector platform={platform.id} locale={locale} offers={offers} />
      </section>
      <section className="marketplace-docs shell">
        <div><p className="section-kicker">{ru ? "Официальные правила" : "Official documentation"}</p><h2>{ru ? "Проверяйте требования у самой площадки" : "Verify requirements with the platform"}</h2></div>
        <div>{platform.docs.map((doc) => <a href={doc.url} target="_blank" rel="noreferrer" key={doc.url}>{ru ? doc.label : doc.labelEn} ↗</a>)}</div>
      </section>
      <section className="marketplace-cta shell">
        <h2>{ru ? "Покажите карточки — вернёмся с объёмом и ценой" : "Share the cards — we will return with scope and pricing"}</h2>
        <Link className="button" href={`${localizedPath(locale, "brief")}?service=marketplaces&platform=${encodeURIComponent(platform.id)}`}>{ru ? "Заполнить короткий бриф" : "Complete the short brief"} ↗</Link>
      </section>
      <p className="marketplace-disclaimer shell">{ru ? "Названия и знаки площадок принадлежат правообладателям. KILENI не заявляет статус официального партнёра." : "Platform names and marks belong to their respective owners. KILENI does not claim official partner status."}</p>
    </div>
    </PublicShell>
  );
}

function PlatformMark({ platform, label }: { platform: Platform; label: string }) {
  return <span className="platform-mark" style={{ "--platform-color": platform.color } as CSSProperties} aria-label={label}><Image alt="" aria-hidden="true" src={platform.iconSrc} width={64} height={64} unoptimized /></span>;
}
