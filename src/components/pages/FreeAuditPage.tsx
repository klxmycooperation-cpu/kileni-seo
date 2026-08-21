import type { Locale } from "../../config/site";
import { AuditForm } from "../forms/AuditForm";
import { Breadcrumbs } from "../layout/Breadcrumbs";
import { PublicShell } from "../layout/PublicShell";

export function FreeAuditPage({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const checks = ru
    ? ["Открываются ли страницы и правильно ли работают переадресации", "Какие страницы разрешено показывать в поиске", "Заполнены ли названия, описания и основные заголовки", "Есть ли неработающие внутренние ссылки", "Заполнены ли данные изображений и страниц", "Передаются ли поисковым системам дополнительные сведения", "Как загружается мобильная версия, если доступен лабораторный тест", "Настроены ли базовые защитные заголовки"]
    : ["Whether pages open and redirects work correctly", "Which pages are allowed to appear in search", "Whether titles, descriptions and main headings are present", "Broken internal links", "Page and image information", "Additional data for search engines", "Mobile loading when a laboratory test is available", "Basic public security headers"];

  return <PublicShell locale={locale}><div className="page-dark-top audit-top"><Breadcrumbs locale={locale} items={[{ label: ru ? "Бесплатная проверка" : "Free check" }]}/><section className="page-hero shell"><p className="eyebrow light">{ru ? "Автоматически — до 10 страниц" : "Automatic — up to 10 pages"}</p><h1>{ru ? "Бесплатный SEO-аудит сайта" : "Free SEO audit for your website"}</h1><p>{ru ? "Проверим до 10 доступных публичных страниц, покажем основные зоны риска и отправим ссылку на результат на e-mail." : "We check up to 10 accessible public pages, highlight the main risk areas and email a link to the result."}</p></section></div><section className="section"><div className="shell audit-page-grid"><div><AuditForm locale={locale} compact/></div><aside><p className="eyebrow">{ru ? "Что проверяем" : "What we check"}</p><ol>{checks.map((item, index) => <li key={item}><span className="mono">{String(index + 1).padStart(2, "0")}</span>{item}</li>)}</ol><div className="caveat">{ru ? "Проверка соблюдает правила сайта, не отправляет формы, не входит в закрытые разделы и не ищет уязвимости активными методами." : "The check follows the website’s rules, submits no forms, enters no private areas and performs no active vulnerability testing."}</div></aside></div></section></PublicShell>;
}
