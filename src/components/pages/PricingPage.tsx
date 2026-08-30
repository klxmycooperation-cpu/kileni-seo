import "../../../app/cases-pricing-redesign.css";
import "../../../app/service-pricing-brief-10.css";

import type { Locale } from "../../config/site";
import { formatOfferPrice, localizedOffer, offersForService, type OfferService } from "../../config/offers";
import { getService, serviceSlugs } from "../../content/services";
import { LeadForm } from "../forms/LeadForm";
import { Breadcrumbs } from "../layout/Breadcrumbs";
import { PublicShell } from "../layout/PublicShell";
import { PricingCategorySelector, type PricingCategory } from "./PricingCategorySelector";

export function PricingPage({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const numericPrices = ru;
  const categories: PricingCategory[] = serviceSlugs.map((slug) => {
    const service = getService(locale, slug)!;
    let offers = offersForService(slug as OfferService);
    if (slug === "seo-audit") offers = offers.filter((offer) => /^seo-audit-(?:50|200|500)$/u.test(offer.id));
    return {
      slug,
      label: service.eyebrow,
      lead: service.lead,
      packages: offers.map((offer, index) => {
        const item = localizedOffer(offer, locale);
        return {
          offerId: offer.id,
          tierLabel: slug === "seo-audit" ? item.shortTitle : ru ? `Вариант ${String(index + 1).padStart(2, "0")}` : `Option ${String(index + 1).padStart(2, "0")}`,
          name: item.title,
          description: item.description,
          price: formatOfferPrice(offer, locale),
          limit: item.scope,
          duration: item.duration,
          mainResult: item.result,
          features: item.features,
          featured: offer.recommended,
        };
      }),
    };
  });

  return (
    <PublicShell locale={locale}>
      <div className="pricing-redesign pricing-10">
        <header className="cp-hero">
          <Breadcrumbs locale={locale} items={[{ label: ru ? "Цены" : "Pricing" }]} />
          <div className="shell cp-hero-grid">
            <div>
              <p className="cp-kicker">{ru ? "Стоимость SEO-аудита" : "SEO audit pricing"}</p>
              <h1>{ru ? "Сколько страниц нужно проверить?" : "How many pages should we check?"}</h1>
            </div>
            <div className="cp-hero-note">
              <strong>{ru ? "Объём определяет глубину проверки" : numericPrices ? "Scope defines the depth of review" : "Scope before a quote"}</strong>
              <p>{ru ? "Чем больше сайт, тем больше страниц, шаблонов и повторяющихся проблем входит в проверку." : numericPrices ? "A larger website means more pages, templates and repeated issues are included in the review." : "Choose a category to see the package limits. Currency and exact price are confirmed before work begins."}</p>
            </div>
          </div>
        </header>

        <section className="cp-pricing-section" aria-labelledby="pricing-list-title">
          <div className="shell">
            <div className="cp-section-intro">
              <p className="cp-kicker">{ru ? "Сравнение вариантов" : "Compare options"}</p>
              <h2 id="pricing-list-title">{ru ? "Выберите подходящий объём" : "Choose the right scope"}</h2>
              <p>{ru ? "Внешние расходы и работа сверх указанного объёма согласуются до начала." : numericPrices ? "External spend and work beyond the package limit are agreed separately." : "No automatic exchange-rate conversion is used. We prepare an individual estimate in the agreed currency."}</p>
            </div>
            <PricingCategorySelector categories={categories} locale={locale} />
          </div>
        </section>

        <section className="cp-extras-section">
          <div className="shell cp-extras-grid">
            <div><p className="cp-kicker">{ru ? "Отдельная смета" : "Quoted separately"}</p><h2>{ru ? "Что не прячем в тариф" : "What is not hidden in a package"}</h2></div>
            <ul>
              <li>{ru ? "Рекламный бюджет и платные размещения" : "Media spend and paid placements"}</li>
              <li>{ru ? "Работы сверх видимого предела тарифа" : "Work beyond the visible package limit"}</li>
              <li>{ru ? "Хостинг, лицензии и сторонние сервисы" : "Hosting, licences and third-party services"}</li>
              <li>{ru ? "Нестандартные интеграции и сложная серверная разработка" : "Custom integrations and complex server-side work"}</li>
            </ul>
          </div>
        </section>

        <section className="cp-request-section" id="request">
          <div className="shell cp-request-grid">
            <div><p className="cp-kicker">{ru ? "Не уверены в варианте?" : "Not sure which option fits?"}</p><h2>{ru ? "Опишите задачу — назовём состав и цену" : "Describe the task and get a scoped estimate"}</h2></div>
            <LeadForm locale={locale} service="pricing" title={ru ? "Получить расчёт" : "Get an estimate"} />
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
