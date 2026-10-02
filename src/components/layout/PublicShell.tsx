import type { Locale } from "../../config/site";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { siteConfig } from "../../config/site";
import { CookieManager } from "./CookieManager";
import { getPublicContacts } from "../../lib/public-contacts";
import { PageViewBeacon } from "../analytics/PageViewBeacon";
import { GlossaryLinkEnhancer } from "../glossary/GlossaryLinkEnhancer";
import { getGlossaryLinkEntries } from "../../lib/glossary/linking";
import { SiteTracingBeam } from "./SiteTracingBeam";

export function buildPublicShellSchema(locale: Locale): { "@context": string; "@graph": Array<Record<string, unknown>> } {
  const contacts = getPublicContacts(locale);
  const phone = contacts.find((contact) => contact.kind === "phone");
  const sameAs = contacts.filter((contact) => contact.kind === "max").map((contact) => contact.href);
  return { "@context": "https://schema.org", "@graph": [{ "@type": "Organization", "@id": `${siteConfig.baseUrl}/#organization`, name: "KILENI", url: siteConfig.baseUrl, logo: `${siteConfig.baseUrl}/brand/kileni-logo-current.svg`, image: `${siteConfig.baseUrl}/brand/kileni-og.png`, description: locale === "ru" ? "SEO-аудит, внедрение, продвижение, разработка и работа с маркетплейсами." : "SEO audits, implementation, growth, development and marketplace services.", ...(phone ? { telephone: phone.value, contactPoint: [{ "@type": "ContactPoint", telephone: phone.value, contactType: "customer service", availableLanguage: ["Russian"] }] } : {}), ...(sameAs.length ? { sameAs } : {}) }, { "@type": "WebSite", "@id": `${siteConfig.baseUrl}/#website`, name: "KILENI", url: siteConfig.baseUrl, inLanguage: ["ru"] }] };
}

export function PublicShell({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const schema = buildPublicShellSchema(locale);
  const glossaryLinkEntries = getGlossaryLinkEntries(locale);
  return (
    <div className="kileni-site">
      <div className="kileni-visual-backdrop" aria-hidden="true">
        <span className="kileni-visual-backdrop__grid" />
        <span className="kileni-visual-backdrop__glow" />
      </div>
      <PageViewBeacon />
      <SiteHeader locale={locale} />
      <SiteTracingBeam>
        <main id="main-content" tabIndex={-1}>{children}</main>
        <GlossaryLinkEnhancer locale={locale} entries={glossaryLinkEntries} />
        <SiteFooter locale={locale} />
      </SiteTracingBeam>
      <CookieManager locale={locale} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</gu, "\\u003c") }} />
    </div>
  );
}
