import "../../../app/cases-pricing-redesign.css";
import "../../../app/service-pricing-brief-10.css";

import type { Locale } from "../../config/site";
import { formatOfferPrice, localizedOffer, offersForService, scopeContractDetails, type OfferService } from "../../config/offers";
import { getService } from "../../content/services";
import { LeadForm } from "../forms/LeadForm";
import { Breadcrumbs } from "../layout/Breadcrumbs";
import { PublicShell } from "../layout/PublicShell";
import { PricingCategorySelector, type PricingCategory } from "./PricingCategorySelector";

export function PricingPage({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const categoryCopy = pricingCategoryCopy(locale);
  const categorySlugs: OfferService[] = ["seo-audit", "seo-promotion", "web-development", "marketplaces", "yandex-ads", "content-materials", "custom-task"];
  const categories: PricingCategory[] = categorySlugs.map((slug) => {
    const service = getService(locale, slug)!;
    let offers = offersForService(slug);
    if (slug === "seo-audit") offers = offers.filter((offer) => /^seo-audit-(?:50|200|500)$/u.test(offer.id));
    if (slug === "marketplaces") offers = offers.filter((offer) => !offer.platform);
    return {
      slug,
      label: service.eyebrow,
      lead: service.lead,
      ...categoryCopy[slug],
      packages: offers.map((offer) => {
        const item = localizedOffer(offer, locale);
        return {
          offerId: offer.id,
          category: offer.category,
          priceType: offer.priceType,
          tierLabel: item.shortTitle,
          name: item.title,
          description: item.description,
          price: formatOfferPrice(offer, locale),
          limit: item.scope,
          duration: item.duration,
          mainResult: item.result,
          features: item.features,
          scopeDetails: scopeContractDetails(offer, locale),
          exclusions: item.exclusions,
          featured: offer.recommended,
        };
      }),
    };
  });

  return (
    <PublicShell locale={locale}>
      <div className="pricing-redesign pricing-10">
        <PricingCategorySelector
          breadcrumbs={<Breadcrumbs locale={locale} items={[{ label: ru ? "Цены" : "Pricing" }]} />}
          categories={categories}
          locale={locale}
        />

        <section className="cp-extras-section">
          <div className="shell cp-extras-grid">
            <div><p className="cp-kicker">{ru ? "Отдельная смета" : "Quoted separately"}</p><h2>{ru ? "Что не прячем в тариф" : "What is not hidden in a package"}</h2></div>
            <div className="cp-extras-list">
              <ul>
                <li>{ru ? "Рекламный бюджет и платные размещения" : "Media spend and paid placements"}</li>
                <li>{ru ? "Работы сверх указанного объёма тарифа" : "Work beyond the stated package scope"}</li>
                <li>{ru ? "Хостинг, лицензии и сторонние сервисы" : "Hosting, licences and third-party services"}</li>
                <li>{ru ? "Нестандартные интеграции и сложная серверная разработка" : "Custom integrations and complex server-side work"}</li>
              </ul>
              <p className="cp-extras-note">{ru ? "Внешние расходы и работа сверх указанного объёма согласуются до начала." : "External spend and work beyond the package limit are agreed before work begins."}</p>
            </div>
          </div>
        </section>

        <section className="cp-request-section" id="request">
          <div className="shell cp-request-grid">
            <div>
              <p className="cp-kicker">{ru ? "Не уверены в варианте?" : "Not sure which option fits?"}</p>
              <h2>{ru ? <><span className="cp-request-title__line">Опишите задачу</span><span className="cp-request-title__line">Назовём состав и цену</span></> : "Describe the task and get a scoped estimate"}</h2>
            </div>
            <LeadForm locale={locale} service="pricing" title={ru ? "Получить расчёт" : "Get an estimate"} />
          </div>
        </section>
      </div>
    </PublicShell>
  );
}

function pricingCategoryCopy(locale: Locale): Record<OfferService, Pick<PricingCategory, "eyebrow" | "heading" | "explanation" | "comparisonHeading">> {
  if (locale === "en") {
    return {
      "seo-audit": { eyebrow: "SEO audit pricing", heading: "What outcome do you need from the audit?", explanation: "Choose between a key-page review, a technical task list and an audit with a three-month plan. Page limits are shown for each option.", comparisonHeading: "Compare audit outcomes" },
      "seo-promotion": { eyebrow: "Ongoing SEO", heading: "How much SEO work is needed each month?", explanation: "Choose by the number of priority pages, content items and implementation hours included each month.", comparisonHeading: "Choose a monthly scope" },
      "web-development": { eyebrow: "Website development", heading: "What kind of website do you need?", explanation: "The catalogue price covers product pages, a cart and order enquiries. If you need a shop with online payment, delivery or integrations, we quote that work separately.", comparisonHeading: "Choose a website format" },
      marketplaces: { eyebrow: "Marketplace content", heading: "How many product cards should we prepare?", explanation: "The visible package covers ten SKUs in one product category; platform-specific work can be scoped separately.", comparisonHeading: "Choose a product-card scope" },
      "yandex-ads": { eyebrow: "Yandex Ads", heading: "Set up or manage the campaigns?", explanation: "Setup prepares launch-ready campaigns. Management covers regular review after launch. Media spend is separate.", comparisonHeading: "Choose the required stage" },
      "content-materials": { eyebrow: "Content", heading: "What content item should we prepare?", explanation: "The package covers one publication-ready website content item and one revision round.", comparisonHeading: "Choose a content format" },
      "custom-task": { eyebrow: "Custom task", heading: "What needs to be scoped first?", explanation: "No price is invented before the goal, inputs, dependencies and first useful result are clear.", comparisonHeading: "Start with a short brief" },
    };
  }
  return {
    "seo-audit": { eyebrow: "Стоимость SEO-аудита", heading: "Какой результат нужен после проверки?", explanation: "Можно проверить ключевые страницы, получить задачи для разработчика или план продвижения на три месяца. Лимит страниц указан в каждом варианте.", comparisonHeading: "Сравните результаты аудита" },
    "seo-promotion": { eyebrow: "SEO-продвижение", heading: "Улучшаем сайт,\nчтобы клиенты\nнаходили его в поиске", explanation: "Сравните количество приоритетных страниц, новых материалов и часов исправлений в месяц.", comparisonHeading: "Выберите ежемесячный объём" },
    "web-development": { eyebrow: "Разработка сайта", heading: "Какой сайт нужно сделать?", explanation: "В цену каталога входят карточки товаров, корзина и заказ через заявку. Для магазина с онлайн-оплатой, доставкой и интеграциями составим отдельную смету.", comparisonHeading: "Выберите формат сайта" },
    marketplaces: { eyebrow: "Карточки товаров", heading: "Сколько карточек нужно подготовить?", explanation: "Пакет на этой странице рассчитан на десять артикулов одной категории. Работу под конкретную площадку можно согласовать отдельно.", comparisonHeading: "Выберите объём карточек" },
    "yandex-ads": { eyebrow: "Яндекс Реклама", heading: "Настроить рекламу или вести её после запуска?", explanation: "Настройка готовит кампании к запуску. Ведение — это регулярная проверка после запуска. Рекламный бюджет считается отдельно.", comparisonHeading: "Выберите нужный этап" },
    "content-materials": { eyebrow: "Тексты и материалы", heading: "Какой материал нужно подготовить?", explanation: "В тариф входит один готовый к публикации материал для сайта и один раунд правок.", comparisonHeading: "Выберите формат материала" },
    "custom-task": { eyebrow: "Нестандартная задача", heading: "Что нужно сначала разобрать?", explanation: "Не называем цену, пока не понятны цель, исходные данные, зависимости и первый полезный результат.", comparisonHeading: "Начните с короткого брифа" },
  };
}
