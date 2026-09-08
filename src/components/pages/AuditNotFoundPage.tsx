import Link from "next/link";

import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";
import { Logo } from "../brand/Logo";
import { ThemeToggle } from "../layout/ThemeToggle";

export function AuditNotFoundPage({ locale }: { locale: Locale }) {
  const ru = locale === "ru";

  return (
    <main id="main-content" className="audit-result-shell">
      <header className="audit-result-header">
        <div className="audit-result-logo"><Logo locale={locale}/></div>
        <div className="audit-result-header__actions"><ThemeToggle locale={locale}/></div>
      </header>
      <section className="audit-failed">
        <span aria-hidden="true">!</span>
        <p className="eyebrow light">ERROR · 404</p>
        <h1>{ru ? "Проверка не найдена" : "Audit not found"}</h1>
        <p>{ru
          ? "Ссылка неверна или срок хранения результата закончился. Можно вернуться на главную или запустить новую проверку."
          : "The link is invalid or the result has expired. Return home or start a new check."}</p>
        <div className="audit-error-actions">
          <Link className="button button-light" href={localizedPath(locale)}>{ru ? "На главную" : "Home"}</Link>
          <Link className="button button-secondary" href={localizedPath(locale, "free-audit")}>{ru ? "Новая проверка" : "New check"}</Link>
        </div>
      </section>
    </main>
  );
}
