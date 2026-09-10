import Link from "next/link";

import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";
import { PublicShell } from "../layout/PublicShell";

export function NotFoundPage({ locale }: { locale: Locale }) {
  const ru = locale === "ru";

  return (
    <PublicShell locale={locale}>
      <section className="error-page" aria-labelledby="not-found-title">
        <div className="error-page__content">
          <p className="error-page__code">404</p>
          <h1 id="not-found-title">{ru ? "Страница не найдена" : "Page not found"}</h1>
          <p>{ru ? "Проверьте адрес или выберите нужный раздел сайта." : "Check the address or choose the section you need."}</p>
          <div className="error-page__actions">
            <Link className="button button-primary" href={localizedPath(locale, "")}>{ru ? "На главную" : "Home"}</Link>
            <Link className="button button-secondary" href={localizedPath(locale, "services")}>{ru ? "Посмотреть услуги" : "View services"}</Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
