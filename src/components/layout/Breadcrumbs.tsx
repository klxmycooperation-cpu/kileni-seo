import Link from "next/link";
import type { Locale } from "../../config/site";
import { localizedPath, siteConfig } from "../../config/site";

type BreadcrumbItem = { label: string; path?: string; current?: boolean };

export function buildBreadcrumbSchema(locale: Locale, items: BreadcrumbItem[]) {
  const absolute = (path = "") => new URL(localizedPath(locale, path), siteConfig.baseUrl).toString();

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: locale === "ru" ? "Главная" : "Home",
        item: absolute(),
      },
      ...items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 2,
        name: item.label,
        ...(item.path ? { item: absolute(item.path) } : {}),
      })),
    ],
  };
}

export function Breadcrumbs({ locale, items }: { locale: Locale; items: BreadcrumbItem[] }) {
  const schema = buildBreadcrumbSchema(locale, items);
  return <><nav className="breadcrumbs shell" aria-label={locale === "ru" ? "Хлебные крошки" : "Breadcrumbs"}><ol><li><Link href={localizedPath(locale)}>{locale === "ru" ? "Главная" : "Home"}</Link></li>{items.map((item) => <li key={item.label}>{item.path && !item.current ? <Link href={localizedPath(locale, item.path)}>{item.label}</Link> : <span aria-current={item.current || !item.path ? "page" : undefined}>{item.label}</span>}</li>)}</ol></nav><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</gu, "\\u003c") }}/></>;
}
