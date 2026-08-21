import "../../../app/cases-pricing-redesign.css";
import "../../../app/service-pricing-brief-10.css";

import type { Locale } from "../../config/site";
import { priceLabel } from "../../config/price-labels";
import { selectPricingTiers } from "../../config/pricing-tiers";
import { getService, serviceSlugs } from "../../content/services";
import { LeadForm } from "../forms/LeadForm";
import { Breadcrumbs } from "../layout/Breadcrumbs";
import { PublicShell } from "../layout/PublicShell";
import { PricingCategorySelector, type PricingCategory } from "./PricingCategorySelector";

export function PricingPage({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const numericPrices = ru;
  const tierLabels = ru ? ["Базовый", "Расширенный", "Под ключ"] : ["Basic", "Advanced", "Turnkey"];
  const categories: PricingCategory[] = serviceSlugs.map((slug) => {
    const service = getService(locale, slug)!;
    return {
      slug,
      label: service.eyebrow,
      lead: service.lead,
      packages: selectPricingTiers(service.packages).map((item, index) => {
        const price = priceLabel(item.priceKey, locale);
        return {
          tierLabel: tierLabels[index] ?? tierLabels[tierLabels.length - 1],
          name: item.name,
          description: item.description,
          price: price.current,
          note: price.note,
          limit: item.limit,
          duration: item.duration ?? (ru ? "После уточнения задачи" : "Confirmed after scope review"),
          mainResult: item.features[0] ?? service.outcomes[0] ?? service.lead,
          features: item.features,
          featured: Boolean(item.featured),
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
              <p className="cp-kicker">{ru ? "Цена после выбора задачи" : "Pricing by task"}</p>
              <h1>{ru ? "Сначала направление. Затем подходящий объём." : "Choose the direction, then the right scope."}</h1>
            </div>
            <div className="cp-hero-note">
              <strong>{ru ? "Цена и предел — рядом" : numericPrices ? "Price and limits together" : "Scope before a quote"}</strong>
              <p>{ru ? "Не нужно читать все тарифы подряд. Выберите категорию — покажем только относящиеся к ней варианты." : numericPrices ? "Choose a category to see only the relevant packages and limits." : "Choose a category to see the package limits. Currency and exact price are confirmed before work begins."}</p>
            </div>
          </div>
        </header>

        <section className="cp-pricing-section" aria-labelledby="pricing-list-title">
          <div className="shell">
            <div className="cp-section-intro">
              <p className="cp-kicker">{ru ? "Шесть категорий" : "Six categories"}</p>
              <h2 id="pricing-list-title">{ru ? "Что нужно сделать?" : "What needs to be done?"}</h2>
              <p>{ru ? "Числа в рублях сохранены без пересчёта. Внешние расходы и всё сверх предела согласуются отдельно." : numericPrices ? "External spend and work beyond the package limit are agreed separately." : "No automatic exchange-rate conversion is used. We prepare an individual estimate in the agreed currency."}</p>
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
