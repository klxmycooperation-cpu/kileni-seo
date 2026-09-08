import "../../../app/services-hub.css";
import "../../../app/seo-hub.css";

import Link from "next/link";

import { formatOfferPrice, getOffer, localizedOffer } from "../../config/offers";
import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";
import { Breadcrumbs } from "../layout/Breadcrumbs";
import { PublicShell } from "../layout/PublicShell";

export function SeoHubPage({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const audit = localizedRequiredOffer("seo-audit-200", locale);
  const promotion = localizedRequiredOffer("seo-promotion-growth", locale);
  const steps = [
    {
      label: ru ? "Бесплатная проверка" : "Free check",
      detail: ru ? "До 10 открытых страниц и примеры найденных проблем" : "Up to 10 public pages and examples of the issues found",
      href: localizedPath(locale, "free-audit"),
    },
    {
      label: ru ? "SEO-аудит" : "SEO audit",
      detail: audit.result,
      href: localizedPath(locale, "seo-audit"),
    },
    {
      label: ru ? "Аудит и исправления" : "Audit and implementation",
      detail: ru ? "Согласованные правки и повторная проверка" : "Agreed fixes and a repeat check",
      href: `${localizedPath(locale, "pricing")}?category=seo-audit&offer=seo-audit-implementation`,
    },
    {
      label: ru ? "Регулярное продвижение" : "Ongoing growth",
      detail: promotion.result,
      href: localizedPath(locale, "seo-promotion"),
    },
  ];

  return (
    <PublicShell locale={locale}>
      <div className="services-10 services-hub seo-hub">
        <header className="seo-hub__hero">
          <Breadcrumbs locale={locale} items={[{ label: "SEO", path: "seo", current: true }]} />
          <div className="shell seo-hub__hero-grid">
            <div>
              <p className="services-hub__eyebrow">{ru ? "Два формата SEO" : "Two SEO formats"}</p>
              <h1>{ru ? "SEO-аудит или продвижение — выберите нужный следующий шаг" : "SEO audit or ongoing growth — choose the right next step"}</h1>
            </div>
            <p className="seo-hub__lead">
              {ru
                ? "Аудит отвечает, что мешает сайту и что исправить. Продвижение — это регулярные исправления и новые страницы после проверки."
                : "An audit explains what blocks the website and what to fix. Ongoing growth covers regular fixes and new pages after the review."}
            </p>
          </div>
        </header>

        <div className="seo-hub__main">
          <section className="shell seo-hub__directions" aria-labelledby="seo-directions-title">
            <header className="seo-hub__section-heading">
              <p>{ru ? "С чего начать" : "Where to start"}</p>
              <h2 id="seo-directions-title">{ru ? "Выберите по задаче, а не по названию услуги" : "Choose by task, not by service name"}</h2>
            </header>
            <div className="seo-hub__direction-grid">
              <article className="seo-hub__direction">
                <span>01 · {ru ? "Разовая проверка" : "One-time review"}</span>
                <h2>{ru ? "SEO-аудит" : "SEO audit"}</h2>
                <p>{audit.description}</p>
                <dl>
                  <div><dt>{ru ? "Результат" : "Result"}</dt><dd>{audit.result}</dd></div>
                  <div><dt>{ru ? "Стоимость" : "Price"}</dt><dd>{formatOfferPrice(getRequiredOffer("seo-audit-200"), locale)}</dd></div>
                </dl>
                <Link className="services-hub__button services-hub__button--primary" href={localizedPath(locale, "seo-audit")}>
                  {ru ? "Посмотреть SEO-аудит" : "View SEO audit"}<span aria-hidden="true">↗</span>
                </Link>
              </article>
              <article className="seo-hub__direction">
                <span>02 · {ru ? "Регулярная работа" : "Ongoing work"}</span>
                <h2>{ru ? "SEO-продвижение" : "SEO growth"}</h2>
                <p>{promotion.description}</p>
                <dl>
                  <div><dt>{ru ? "Результат" : "Result"}</dt><dd>{promotion.result}</dd></div>
                  <div><dt>{ru ? "Стоимость" : "Price"}</dt><dd>{formatOfferPrice(getRequiredOffer("seo-promotion-growth"), locale)}</dd></div>
                </dl>
                <Link className="services-hub__button services-hub__button--primary" href={localizedPath(locale, "seo-promotion")}>
                  {ru ? "Посмотреть SEO-продвижение" : "View ongoing SEO"}<span aria-hidden="true">↗</span>
                </Link>
              </article>
            </div>
          </section>

          <section className="shell seo-hub__ladder" aria-labelledby="seo-ladder-title">
            <header className="seo-hub__section-heading">
              <p>{ru ? "Этапы работы" : "Work stages"}</p>
              <h2 id="seo-ladder-title">{ru ? "Можно остановиться на любом этапе" : "Stop at the stage you need"}</h2>
            </header>
            <ol>
              {steps.map((step, index) => (
                <li data-seo-step key={step.label}>
                  <Link className="seo-hub__ladder-link" href={step.href} aria-label={`${step.label}: ${ru ? "подробнее" : "learn more"}`}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div><h3>{step.label}</h3><p>{step.detail}</p></div>
                    <b aria-hidden="true">↗</b>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </PublicShell>
  );
}

function getRequiredOffer(id: string) {
  const offer = getOffer(id);
  if (!offer) throw new Error(`SEO hub offer is missing: ${id}`);
  return offer;
}

function localizedRequiredOffer(id: string, locale: Locale) {
  return localizedOffer(getRequiredOffer(id), locale);
}
