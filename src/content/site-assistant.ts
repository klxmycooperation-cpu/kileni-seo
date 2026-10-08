import { formatOfferPrice, offerBriefHref, offersForService, type OfferService } from "../config/offers";
import type { MarketplaceId } from "./marketplaces";
import type { AssistantTopic } from "../lib/site-assistant";
import { getService } from "./services";
import { localizedPath, type Locale } from "../config/site";

export function buildAssistantCatalog(locale:Locale="ru"): AssistantTopic[] {
  const englishDescriptions:Record<string,string>={"seo-audit":"An audit checks page access, indexing, structure and speed. These are the published audit options:","seo-promotion":"Ongoing search work includes improving pages and reviewing results. Published monthly options:","web-development":"We help with structure, design, mobile layouts, forms and analytics. Price depends on the website format:","yandex-ads":"We set up or manage Yandex Direct campaigns. Advertising spend is separate from our work.","content-materials":"We prepare website materials using your source data and confirmed facts.","custom-task":"We clarify the task, expected result and first stage before agreeing on cost and timing."};
  const englishTitles:Record<string,string>={"seo-audit":"Website audit","seo-promotion":"SEO promotion","web-development":"Website development","yandex-ads":"Yandex Direct","content-materials":"Website content","custom-task":"Custom task"};
  const topic = (id: string, title: string, service: OfferService, description: string, platform?: MarketplaceId): AssistantTopic => ({
    id, title:locale==="en"?(englishTitles[id]??title):title, href: localizedPath(locale,platform ? `/marketplaces/${platform}` : `/${id}`), description:locale==="en"?(englishDescriptions[id]??"Card services include review, text and SEO, and visual packaging."):description,
    faq: getService(locale, service)?.faq ?? [],
    offers: offersForService(service, platform).map((offer) => ({ id: offer.id, title: offer.shortTitle[locale], price: formatOfferPrice(offer, locale), amount: offer.price, priceType: offer.priceType, billingUnit: offer.billingUnit, scope: offer.scope[locale], duration: offer.duration[locale], result: offer.result[locale], features: offer.features.map((item) => item[locale]), exclusions: offer.exclusions.map((item) => item[locale]), href: offerBriefHref(offer.id, locale), contract: offer.scopeContract })),
  });
  return [
    topic("seo-audit", "Проверить сайт", "seo-audit", "Если сайт не находят в поиске, стоит начать с аудита: проверить доступность страниц, индексацию, структуру и скорость. Вот варианты проверки:"),
    topic("seo-promotion", "Продвигать сайт", "seo-promotion", "Для регулярной работы с поиском предлагаем продвижение. Выбираем запросы, улучшаем страницы и сверяем результат. Варианты:"),
    topic("web-development", "Создать сайт", "web-development", "Поможем со структурой, дизайном, мобильной версией, формами и аналитикой. Стоимость зависит от формата сайта:"),
    topic("yandex-ads", "Настроить рекламу", "yandex-ads", "Подготовим или будем сопровождать рекламу в Яндекс Директе. Рекламный бюджет оплачивается отдельно. Варианты:"),
    topic("content-materials", "Подготовить тексты", "content-materials", "Готовим материалы для сайта на основе ваших данных и фактов. Варианты:"),
    topic("custom-task", "Обсудить другую задачу", "custom-task", "Для нестандартной задачи сначала уточним исходные данные, ожидаемый результат и состав первого этапа. Стоимость и сроки согласуем после брифа."),
    { id: "marketplaces", title:locale==="en"?"Marketplace cards":"Карточки товаров", href:localizedPath(locale,"/marketplaces"), faq: getService(locale, "marketplaces")?.faq ?? [], description:locale==="en"?"We prepare copy, SEO and card visuals for Wildberries, Ozon and Yandex Market. Choose a marketplace to see published prices per SKU.":"Готовим тексты, SEO и визуальное оформление карточек для Wildberries, Ozon и Яндекс Маркета. Напишите название площадки — покажу варианты и цены за артикул.", offers: [] },
    ...(["wildberries", "ozon", "yandex-market"] as const).map((platform) => topic(platform, platform === "wildberries" ? "Wildberries" : platform === "ozon" ? "Ozon" : "Яндекс Маркет", "marketplaces", "Для карточек есть разбор, подготовка текста и SEO, а также вариант с визуальным оформлением:", platform)),
  ];
}
