import Link from "next/link";
import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";
import { AuditForm } from "../forms/AuditForm";
import { Breadcrumbs } from "../layout/Breadcrumbs";
import { PublicShell } from "../layout/PublicShell";
import { CanvasText } from "../ui/canvas-text";

export function FreeAuditPage({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const checks = ru
    ? ["Открываются ли страницы и правильно ли работают переадресации", "Какие страницы разрешено показывать в поиске", "Заполнены ли названия, описания и основные заголовки", "Есть ли неработающие внутренние ссылки", "Заполнены ли данные изображений и страниц", "Передаются ли поисковым системам дополнительные сведения", "Как загружается мобильная версия, если доступен автоматический тест скорости", "Настроены ли базовые параметры защиты сайта"]
    : ["Whether pages open and redirects work correctly", "Which pages are allowed to appear in search", "Whether titles, descriptions and main headings are present", "Broken internal links", "Page and image information", "Additional data for search engines", "Mobile loading when a laboratory test is available", "Basic public security headers"];

  const title = ru ? "Бесплатная экспресс-проверка до 10 репрезентативных страниц сайта" : "Free express check of up to 10 representative website pages";
  return <PublicShell locale={locale}><div className="page-dark-top audit-top"><Breadcrumbs locale={locale} items={[{ label: ru ? "Бесплатная проверка" : "Free check" }]}/><section className="page-hero shell"><h1><CanvasText text={title} lineGap={7} animationDuration={10}/></h1><p>{ru ? "Проверим до 10 доступных страниц и сразу откроем результат в браузере. Непроверенные адреса не оцениваются. Данные из внешних кабинетов — позиции, показы, CTR и заявки — в экспресс-проверку не входят." : "We check up to 10 accessible pages and open the result in your browser. Unchecked addresses are not assessed. External account data — rankings, impressions, CTR and enquiries — is not included in the express check."}</p></section></div><section className="section"><div className="shell audit-page-grid"><div><AuditForm locale={locale} compact/></div><aside><p className="eyebrow">{ru ? "Что проверяем" : "What we check"}</p><ol>{checks.map((item, index) => <li key={item}><span className="mono">{String(index + 1).padStart(2, "0")}</span>{item}</li>)}</ol><Link className="text-link" href={localizedPath(locale, "checks")}>{ru ? "Открыть методику всех 30 проверок" : "Open all 30 check definitions"} ↗</Link><div className="caveat">{ru ? "Проверка соблюдает правила сайта, не отправляет формы, не входит в закрытые разделы и не ищет уязвимости активными методами." : "The check follows the website’s rules, submits no forms, enters no private areas and performs no active vulnerability testing."}</div></aside></div></section></PublicShell>;
}
