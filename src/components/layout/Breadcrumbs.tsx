import Link from "next/link";
import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";

export function Breadcrumbs({ locale, items }: { locale: Locale; items: Array<{ label: string; path?: string }> }) {
  const schema = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: locale === "ru" ? "Главная" : "Home", item: localizedPath(locale) }, ...items.map((item, index) => ({ "@type": "ListItem", position: index + 2, name: item.label, ...(item.path ? { item: localizedPath(locale, item.path) } : {}) }))] };
  return <><nav className="breadcrumbs shell" aria-label={locale === "ru" ? "Хлебные крошки" : "Breadcrumbs"}><ol><li><Link href={localizedPath(locale)}>{locale === "ru" ? "Главная" : "Home"}</Link></li>{items.map((item) => <li key={item.label}>{item.path ? <Link href={localizedPath(locale, item.path)}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}</li>)}</ol></nav><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</gu, "\\u003c") }}/></>;
}
