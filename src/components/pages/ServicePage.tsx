import "../../../app/service-pricing-brief-10.css";

import Link from "next/link";
import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";
import { getDictionary } from "../../content/dictionary";
import { getService } from "../../content/services";
import { formatOfferPrice, getOffer, localizedOffer, offerBriefHref, type Offer } from "../../config/offers";
import { LeadForm } from "../forms/LeadForm";
import { Breadcrumbs } from "../layout/Breadcrumbs";
import { PublicShell } from "../layout/PublicShell";
import { Faq } from "./Faq";
import { ServiceVisual } from "./ServiceVisual";
import { ServiceTierProvider, ServiceTierSelector } from "./ServiceTierSelection";

export function ServicePage({ locale, slug }: { locale: Locale; slug: string }) {
  const service = getService(locale, slug);
  if (!service) return null;
  const d = getDictionary(locale);
  const ru = locale === "ru";
  const heroTitle = slug === "custom-task"
    ? (ru ? "Опишите задачу — предложим формат работы" : "Describe the task — we will propose a working format")
    : service.title;
  const heroLead = slug === "custom-task"
    ? (ru
        ? "Состав, срок и стоимость определим после короткого брифа. Работу начинаем только после согласования."
        : "Scope, timing and price are confirmed after a short brief. Work starts only after approval.")
    : service.lead;
  const offers = offersForServicePage(slug);
  const tierLabels = tierLabelsForService(slug, locale);
  const tierViews = offers.map((offer, index) => {
    const item = localizedOffer(offer, locale);
    return {
      id: offer.id,
      tierLabel: tierLabels[index] ?? tierLabels[tierLabels.length - 1],
      name: item.title,
      description: item.description,
      limit: item.scope,
      duration: item.duration,
      current: formatOfferPrice(offer, locale),
      features: item.features,
      featured: offer.recommended,
      briefHref: offerBriefHref(offer.id, locale),
    };
  });
  const variantsCopy = getVariantsCopy(slug, locale);

  return (
    <PublicShell locale={locale}>
      <ServiceTierProvider>
      <article className={`service-10 service-10-${service.visual.kind} service-10-${slug}`}>
        <header className="svc-detail-hero">
          <Breadcrumbs locale={locale} items={[{ label: ru ? "Услуги" : "Services", path: "services" }, { label: service.eyebrow }]} />
          <div className="shell svc-detail-hero-grid">
            <div className="svc-detail-copy">
              <p className="svc-kicker">{service.eyebrow}</p>
              <h1>{heroTitle}</h1>
              <p>{heroLead}</p>
              <div className="svc-hero-actions">
                <Link className="button button-primary" href="#request">{d.common.order}<span aria-hidden="true">↘</span></Link>
                <Link href="#variants">{ru ? "Посмотреть варианты" : "See the options"}<span aria-hidden="true">↓</span></Link>
              </div>
            </div>
            <ServiceVisual visual={service.visual} locale={locale} items={service.deliverables.slice(0, 3)} outcome={service.outcomes[0]} />
          </div>
        </header>

        <nav className="svc-page-nav" aria-label={ru ? "Разделы этой услуги" : "Sections on this service page"}>
          <div className="shell svc-page-nav__inner">
            <Link href="#overview">{ru ? "Коротко об услуге" : "Service summary"}<span aria-hidden="true">↓</span></Link>
            <Link href="#variants">{ru ? "Варианты и цены" : "Options and prices"}<span aria-hidden="true">↓</span></Link>
            <Link href="#assurance">{ru ? "Границы работы" : "Work boundaries"}<span aria-hidden="true">↓</span></Link>
            <Link href="#request">{ru ? "Обсудить задачу" : "Discuss the task"}<span aria-hidden="true">↓</span></Link>
          </div>
        </nav>

        <section className="svc-compact-overview" id="overview" aria-labelledby="svc-overview-title">
          <div className="shell">
            <header className="svc-compact-heading">
              <p className="svc-kicker">{ru ? "Как решаем задачу" : "How the task is solved"}</p>
              <h2 id="svc-overview-title">{ru ? "Показываем, когда услуга подходит, что делаем и какой результат передаём" : "See when the service fits, what we do and what you receive"}</h2>
              <p>{service.problem}</p>
            </header>
            <div className="svc-compact-grid">
              <article>
                <span>01</span><h3>{ru ? "Когда подходит" : "When it fits"}</h3>
                <ul>{service.fit.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul>
              </article>
              <article>
                <span>02</span><h3>{ru ? "Что делаем" : "What we do"}</h3>
                <ol>{service.work.slice(0, 4).map((item, index) => <li key={item}><b>{index + 1}</b>{item}</li>)}</ol>
              </article>
              <article>
                <span>03</span><h3>{ru ? "Что получите" : "What you receive"}</h3>
                <ul>{service.deliverables.slice(0, 5).map((item) => <li key={item}>{item}</li>)}</ul>
              </article>
            </div>
          </div>
        </section>

        <section className="svc-decision-section svc-variants" id="variants" aria-labelledby="svc-variants-title">
          <div className="shell"><div className="svc-section-heading"><p className="svc-kicker">{ru ? "Варианты" : "Options"}</p><div className="svc-section-heading__copy"><h2 id="svc-variants-title">{variantsCopy.title}</h2><p>{variantsCopy.subtitle}</p></div></div>
            {slug === "custom-task"
              ? <CustomTaskPath locale={locale} />
              : <ServiceTierSelector locale={locale} tiers={tierViews} />}</div>
        </section>

        <section className="svc-assurance" id="assurance" aria-labelledby="svc-assurance-title">
          <div className="shell">
            <header><p className="svc-kicker">{ru ? "До старта и после работы" : "Before and after delivery"}</p><h2 id="svc-assurance-title">{ru ? "Границы и приёмка без мелкого шрифта" : "Clear boundaries and acceptance"}</h2><p>{service.duration}</p></header>
            <div className="svc-assurance-grid">
              <article><h3>{ru ? "Не входит" : "Not included"}</h3><ul>{service.exclusions.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul></article>
              <article><h3>{ru ? "Как принимаем" : "How we accept delivery"}</h3><ol><li><span>01</span>{ru ? "Фиксируем исходное состояние." : "Record the baseline."}</li><li><span>02</span>{ru ? "Передаём изменения и материалы." : "Hand over changes and materials."}</li><li><span>03</span>{ru ? "Повторяем согласованные проверки." : "Repeat the agreed checks."}</li></ol></article>
            </div>
            <div className="svc-assurance-footer">{service.caseLink && <Link href={localizedPath(locale, service.caseLink)}>{ru ? "Кейс с доказательствами" : "Evidence-based case"}<span aria-hidden="true">↗</span></Link>}<p>{d.common.noGuarantee}</p></div>
          </div>
        </section>

        <section className="svc-context-links" aria-label={ru ? "Связанные разделы" : "Related pages"}>
          <div className="shell">
            <Link href={localizedPath(locale, "pricing")}>{ru ? "Все цены" : "All prices"}<span aria-hidden="true">↗</span></Link>
            <Link href={localizedPath(locale, "glossary")}>{ru ? "Термины" : "Terminology"}<span aria-hidden="true">↗</span></Link>
            <Link href={`${localizedPath(locale, "brief")}?service=${encodeURIComponent(slug)}`}>{ru ? "Короткий бриф" : "Short brief"}<span aria-hidden="true">↗</span></Link>
          </div>
        </section>

        <Faq title={ru ? "Вопросы об услуге" : "Questions about the service"} items={service.faq} />
        <section id="request" className="svc-request-section">
          <div className="shell svc-request-grid">
            <div className="svc-request-intro">
              <p className="svc-kicker">{ru ? "Следующий шаг" : "Next step"}</p>
              <h2>{ru ? "Опишите задачу — предложим подходящий объём" : "Describe the task — get a suitable scope"}</h2>
              <p>{ru ? "До начала назовём состав, срок, цену и то, что не входит в работу." : "Before work starts, we state scope, timing, price and exclusions."}</p>
              <ul>
                <li>{ru ? "Ответим по указанному контакту" : "We reply using the contact you provide"}</li>
                <li>{ru ? "Уточним только необходимые входные данные" : "We ask only for the inputs we need"}</li>
                <li>{ru ? "Работу начнём после согласования" : "Work starts after your approval"}</li>
              </ul>
            </div>
            <div className="svc-request-form"><LeadForm locale={locale} service={slug} /></div>
          </div>
        </section>
      </article>
      </ServiceTierProvider>
    </PublicShell>
  );
}

function CustomTaskPath({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const steps = ru
    ? [
        ["Расскажите ситуацию", "Что происходит сейчас, какой результат нужен и что уже пробовали."],
        ["Получите вариант первого этапа", "Вернёмся с границами, входными данными, сроком и ценой — до начала работ."],
        ["Решите, продолжать ли", "Первый этап должен давать самостоятельный результат. Покупать весь проект не обязательно."],
      ]
    : [
        ["Describe the situation", "Tell us what is happening, what outcome you need and what has already been tried."],
        ["Receive a first-stage proposal", "We return with boundaries, inputs, timing and price before any work starts."],
        ["Choose whether to continue", "The first stage must produce a useful standalone result. The full project is optional."],
      ];
  return (
    <div className="svc-custom-path">
      <div className="svc-custom-path__intro">
        <span>{ru ? "Сначала уточняем задачу" : "We clarify the task first"}</span>
        <p>{ru ? "Здесь нельзя честно выбрать типовую карточку. Сначала отделим нужный результат от возможных способов решения." : "A preset card would be misleading here. We first separate the required outcome from possible solutions."}</p>
      </div>
      <ol>
        {steps.map(([title, text], index) => (
          <li key={title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{title}</h3><p>{text}</p></div></li>
        ))}
      </ol>
      <Link className="button button-primary" href={`${localizedPath(locale, "brief")}?service=custom-task`}>
        {ru ? "Описать задачу в коротком брифе" : "Describe the task in a short brief"}<span aria-hidden="true">↗</span>
      </Link>
    </div>
  );
}

const offersByServicePage: Record<string, readonly string[]> = {
  "seo-audit": ["seo-audit-free", "seo-audit-200", "seo-audit-implementation"],
  "seo-promotion": ["seo-promotion-start", "seo-promotion-growth", "seo-promotion-team"],
  "web-development": ["development-start", "development-business", "development-max"],
  "yandex-ads": ["yandex-ads-setup", "yandex-ads-support"],
  "content-materials": ["content-article"],
  "custom-task": ["custom-task-consultation"],
};

function offersForServicePage(slug: string): Offer[] {
  return (offersByServicePage[slug] ?? []).map((id) => getOffer(id)).filter((offer): offer is Offer => Boolean(offer));
}

function tierLabelsForService(slug: string, locale: Locale): string[] {
  if (slug === "seo-audit") {
    return locale === "ru"
      ? ["Предварительная оценка", "Подробный аудит", "Аудит и исправления"]
      : ["Preliminary check", "Detailed audit", "Audit and fixes"];
  }
  if (slug === "custom-task") return [locale === "ru" ? "После короткого брифа" : "After a short brief"];
  return locale === "ru" ? ["Старт", "Рекомендуем", "Расширенный"] : ["Start", "Recommended", "Advanced"];
}

function getVariantsCopy(slug: string, locale: Locale): { title: string; subtitle: string } {
  if (slug === "seo-audit") {
    return locale === "ru"
      ? {
          title: "Какую помощь хотите получить?",
          subtitle: "Выберите формат: только предварительная оценка, подробный аудит или аудит с внедрением исправлений.",
        }
      : {
          title: "What kind of help do you need?",
          subtitle: "Choose a preliminary check, a detailed audit, or an audit with implemented fixes.",
        };
  }
  if (slug === "custom-task") {
    return locale === "ru"
      ? {
          title: "Сначала — короткий бриф",
          subtitle: "Состав, срок и стоимость определим после короткого брифа. Работу начинаем только после согласования.",
        }
      : {
          title: "Start with a short brief",
          subtitle: "Scope, timing and price are confirmed after a short brief. Work starts only after approval.",
        };
  }
  return locale === "ru"
    ? { title: "Выберите подходящий формат", subtitle: "Цена, срок и границы каждого варианта показаны рядом." }
    : { title: "Choose a suitable format", subtitle: "Price, timing and boundaries are shown for every option." };
}
