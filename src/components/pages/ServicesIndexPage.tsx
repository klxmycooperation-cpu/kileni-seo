import "../../../app/services-hub.css";

import Link from "next/link";

import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";
import { getServiceDirections } from "../../content/service-directions";
import { PublicShell } from "../layout/PublicShell";
import { ServicesExplorer, ServicesHeroJourney } from "./ServicesExplorer";
import { CanvasText } from "../ui/canvas-text";

export function ServicesIndexPage({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const directions = getServiceDirections(locale);

  return (
    <PublicShell locale={locale}>
      <div className="services-10 services-hub">
        <header className="services-hub__hero">
          <div className="shell services-hub__hero-layout">
            <div className="services-hub__hero-copy">
              <p className="services-hub__eyebrow">{ru ? "Услуги KILENI" : "KILENI services"}</p>
              <h1>
                <CanvasText text={ru ? "От проблемы — к понятному результату" : "From a problem to a clear result"} lineGap={7} animationDuration={10}>
                  <span>{ru ? <>От проблемы&nbsp;— к</> : <>From a problem to</>}</span>{" "}<span>{ru ? "понятному результату" : "a clear result"}</span>
                </CanvasText>
              </h1>
              <p className="services-hub__hero-lead">
                {ru
                  ? "Выберите задачу. Сразу покажем, что сделаем, сколько это занимает, сколько стоит и что останется у вас после работы."
                  : "Choose the task. See what we will do, how long it takes, what it costs and what you keep after the work is done."}
              </p>
              <div className="services-hub__hero-actions">
                <Link className="services-hub__button services-hub__button--primary" href="#services-directions">{ru ? "Выбрать направление" : "Choose a direction"}<span aria-hidden="true">↓</span></Link>
                <Link className="services-hub__text-link" href={localizedPath(locale, "free-audit")}>{ru ? "Проверить сайт бесплатно" : "Check a website for free"}<span aria-hidden="true">↗</span></Link>
              </div>
            </div>
            <ServicesHeroJourney locale={locale} />
          </div>
        </header>

        <ServicesExplorer directions={directions} locale={locale} />
      </div>
    </PublicShell>
  );
}
