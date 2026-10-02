import "../../../app/service-pricing-brief-10.css";

import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";
import { localizedMarketplaceOffers } from "../../config/marketplace-offers";
import { getMarketplaceResultExample } from "../../content/marketplace-result-examples";
import { marketplaceName, marketplacePlatforms as platforms, type MarketplacePlatform as Platform } from "../../content/marketplaces";
import { Breadcrumbs } from "../layout/Breadcrumbs";
import { PublicShell } from "../layout/PublicShell";
import { CanvasText } from "../ui/canvas-text";
import { CompactPageToc } from "./CompactPageToc";
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
      <Breadcrumbs locale={locale} items={[{ label: ru ? "Маркетплейсы" : "Marketplaces", path: "marketplaces", current: true }]} />
      <section className="marketplace-hero shell">
        <p className="section-kicker">{ru ? "Маркетплейсы" : "Marketplaces"}</p>
        <h1><CanvasText text={ru ? "Карточки, которые\nпомогают выбрать товар" : "Product listings that\nhelp people choose"} lineGap={7} animationDuration={10}/></h1>
        <p>{ru ? "Работаем с полями, запросами и медиа каждой площадки отдельно. До старта показываем состав, границы и результат." : "We handle fields, search intent and media for each platform separately. Scope, boundaries and deliverables are clear before work begins."}</p>
      </section>
      <section className="marketplace-grid shell" id="platforms" aria-label={ru ? "Площадки" : "Platforms"}>
        {platforms.map((entry) => {
          const copy = ru ? entry.ru : entry.en;
          const name = marketplaceName(entry, locale);
          return (
            <Link className="marketplace-card" href={localizedPath(locale, `marketplaces/${entry.id}`)} key={entry.id}>
              <PlatformMark platform={entry} label={name} preload={entry.id === platforms[0].id} />
              <div><h2>{name}</h2><p>{copy.lead}</p></div>
              <span>{ru ? "Открыть направление" : "Open platform"} ↗</span>
            </Link>
          );
        })}
      </section>
      <nav className="marketplace-related shell" aria-label={ru ? "Полезные разделы" : "Related pages"}>
        <Link href="#platforms">{ru ? "Выбрать площадку и посмотреть цены" : "Choose a platform and see pricing"} ↓</Link>
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
  const journey = ru
    ? [
        { title: "Проверяем исходную карточку", text: joinAsSentences(copy.visibility.slice(0, 2)) },
        { title: "Сверяем данные товара", text: joinAsSentences(copy.fields.slice(0, 2)) },
        { title: "Планируем изображения", text: joinAsSentences(copy.content.slice(0, 2)) },
        { title: "Передаём готовые файлы", text: joinAsSentences(copy.result.slice(0, 2)) },
      ]
    : [
        { title: "Enter comparison", text: joinAsSentences(copy.visibility.slice(0, 2)) },
        { title: "Keep the facts", text: joinAsSentences(copy.fields.slice(0, 2)) },
        { title: "Support the choice", text: joinAsSentences(copy.content.slice(0, 2)) },
        { title: "Hand over without guesswork", text: joinAsSentences(copy.result.slice(0, 2)) },
      ];
  return (
    <PublicShell locale={locale}>
    <div className="marketplace-page page-main" data-marketplace={platform.id}>
      <Breadcrumbs locale={locale} items={[
        { label: ru ? "Маркетплейсы" : "Marketplaces", path: "marketplaces" },
        { label: name, path: `marketplaces/${platform.id}`, current: true },
      ]} />
      <section className="marketplace-detail-hero shell">
        <PlatformMark platform={platform} label={name} />
        <div><p className="section-kicker">{ru ? "Карточки товаров" : "Product cards"}</p><h1><CanvasText text={ru ? `Оформление карточек\n${name}` : `${name} product listing services`} lineGap={7} animationDuration={10}/></h1><p>{copy.lead}</p></div>
      </section>
      <nav className="marketplace-platform-switch shell" aria-label={ru ? "Выбор площадки" : "Choose a platform"}>
        {platforms.map((entry) => <Link aria-current={entry.id === platform.id ? "page" : undefined} href={localizedPath(locale, `marketplaces/${entry.id}`)} key={entry.id}>{marketplaceName(entry, locale)}</Link>)}
      </nav>
      <CompactPageToc
        label={ru ? "Разделы страницы" : "Page sections"}
        items={[
          { id: "marketplace-journey", label: ru ? "Этапы подготовки" : "Preparation steps" },
          { id: "marketplace-scope", label: ru ? "Состав карточки" : "Card scope" },
          { id: "marketplace-result", label: ru ? "Пример результата" : "Example result" },
          { id: "marketplace-offers", label: ru ? "Варианты" : "Options" },
          { id: "marketplace-docs", label: ru ? "Правила площадки" : "Platform rules" },
        ]}
      />
      <section className="marketplace-card-journey shell" id="marketplace-journey" aria-labelledby="marketplace-card-journey-title">
        <header>
          <p className="section-kicker">{ru ? "Этапы подготовки" : "Preparation steps"}</p>
          <h2 id="marketplace-card-journey-title">{ru ? "От исходной карточки до файлов для загрузки" : "From the source card to upload-ready files"}</h2>
          <p>{ru ? "На каждом этапе есть понятный результат: список замечаний, заполненные поля, план изображений и итоговый чек-лист." : "Every stage has a clear result: issue list, completed fields, image plan and final checklist."}</p>
        </header>
        <ol>
          {journey.map((step, index) => <li key={step.title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></li>)}
        </ol>
      </section>
      <section className="marketplace-detail shell" id="marketplace-scope">
        {[...sections.slice(0, 2), [ru ? "Контент и медиа" : "Content and media", copy.content] as const, ...sections.slice(2)].map(([heading, bullets], index) => (
          <article className="marketplace-detail-row" key={heading}>
            <span>0{index + 1}</span><h2>{heading}</h2><ul>{bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
          </article>
        ))}
        <article className="marketplace-detail-row">
          <span>07</span><h2>{ru ? "Доступ и границы" : "Access and boundaries"}</h2><ul><li>{copy.access}</li></ul>
        </article>
        <article className="marketplace-detail-row">
          <span>08</span><h2>{ru ? "Как принять результат" : "How delivery is accepted"}</h2><ul>{copy.acceptance.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
        </article>
      </section>
      <section className="marketplace-result-example shell" id="marketplace-result" aria-labelledby="marketplace-result-example-title">
        <header><p className="section-kicker">{ru ? "Пример результата" : "Deliverable example"}</p><h2 id="marketplace-result-example-title">{example.title}</h2><p>{example.lead}</p></header>
        <div className="marketplace-result-states">
          {[example.before, example.after].map((state, index) => <article data-after={index === 1 || undefined} key={state.label}><span>{state.label}</span><h3>{state.title}</h3><ul>{state.items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}
        </div>
        <dl className="marketplace-result-files">{example.rows.map((row) => <div key={row.key}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>
        <p className="marketplace-result-disclaimer">{example.disclaimer}</p>
      </section>
      <section className="marketplace-offers shell" id="marketplace-offers" aria-labelledby="marketplace-offers-title">
        <header><p className="section-kicker">{ru ? "Состав и цена" : "Scope and pricing"}</p><h2 id="marketplace-offers-title">{ru ? `Три варианта для ${name}` : `Three options for ${name}`}</h2><p>{ru ? "Выберите ближайший объём — площадка и вариант попадут в бриф автоматически." : "Choose the closest scope. Platform and option are carried into the brief automatically."}</p></header>
        <MarketplaceOfferSelector platform={platform.id} locale={locale} offers={offers} />
      </section>
      <section className="marketplace-docs shell" id="marketplace-docs" aria-labelledby="marketplace-docs-title">
        <div className="marketplace-docs__intro"><p className="section-kicker">{ru ? "Официальные правила" : "Official documentation"}</p><h2 id="marketplace-docs-title">{ru ? "Проверяйте требования у самой площадки" : "Verify requirements with the platform"}</h2><p>{ru ? "Сверяйте изменения требований с первоисточником перед публикацией карточек." : "Check the source before publishing when platform requirements change."}</p></div>
        <div className="marketplace-docs__links">{platform.docs.map((doc) => <a href={doc.url} target="_blank" rel="noreferrer" key={doc.url}><span>{ru ? "Официальная инструкция" : "Official guide"}</span><strong>{ru ? doc.label : doc.labelEn}</strong><i aria-hidden="true">↗</i></a>)}</div>
      </section>
      <section className="marketplace-cta shell">
        <h2>{ru ? "Покажите карточки — вернёмся с объёмом и ценой" : "Share the cards — we will return with scope and pricing"}</h2>
        <Link className="marketplace-cta__action" href="#marketplace-offers"><span>{ru ? "Выбрать вариант" : "Choose an option"}</span><i aria-hidden="true">↓</i></Link>
      </section>
      <p className="marketplace-disclaimer shell">{ru ? "Названия и знаки площадок принадлежат правообладателям. KILENI не заявляет статус официального партнёра." : "Platform names and marks belong to their respective owners. KILENI does not claim official partner status."}</p>
    </div>
    </PublicShell>
  );
}

export function PlatformMark({ platform, label, preload = false }: { platform: Platform; label: string; preload?: boolean }) {
  return <span className="platform-mark" role="img" style={{ "--platform-color": platform.color } as CSSProperties} aria-label={label}>
    <Image alt={label} src={platform.iconSrc} width={platform.iconWidth} height={platform.iconHeight} loading="eager" fetchPriority={preload ? "high" : undefined} decoding="async" unoptimized />
  </span>;
}

function joinAsSentences(items: readonly string[]): string {
  return items.map((item) => /[.!?]$/u.test(item.trim()) ? item.trim() : `${item.trim()}.`).join(" ");
}
