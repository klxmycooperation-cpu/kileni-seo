import type { Locale } from "../../config/site";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { siteConfig } from "../../config/site";
import { CookieManager } from "./CookieManager";
import { getPublicContacts } from "../../lib/public-contacts";

export function PublicShell({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const contacts = getPublicContacts(locale);
  const phone = contacts.find((contact) => contact.kind === "phone");
  const sameAs = contacts.filter((contact) => contact.kind === "telegram").map((contact) => contact.href);
  const schema = { "@context": "https://schema.org", "@graph": [{ "@type": "ProfessionalService", "@id": `${siteConfig.baseUrl}/#organization`, name: "KILENI", url: siteConfig.baseUrl, logo: `${siteConfig.baseUrl}/brand/kileni-logo-light.svg`, description: locale === "ru" ? "SEO-аудит, внедрение, продвижение, разработка и работа с маркетплейсами." : "SEO audits, implementation, growth, development and marketplace services.", ...(phone ? { telephone: phone.value, contactPoint: [{ "@type": "ContactPoint", telephone: phone.value, contactType: "customer service", availableLanguage: ["Russian", "English"] }] } : {}), ...(sameAs.length ? { sameAs } : {}) }, { "@type": "WebSite", "@id": `${siteConfig.baseUrl}/#website`, name: "KILENI", url: siteConfig.baseUrl, inLanguage: locale }] };
  return <div className="kileni-site"><SiteHeader locale={locale}/><main id="main-content">{children}</main><SiteFooter locale={locale}/><CookieManager locale={locale}/><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</gu, "\\u003c") }}/></div>;
}
