import { notFound } from "next/navigation";
import type { Locale } from "../../config/site";
import { serviceSlugs } from "../../content/services";
import { BriefPage } from "./BriefPage";
import { CalculatorPage } from "./CalculatorPage";
import { CasePage, CasesPage } from "./CasesPage";
import { FreeAuditPage } from "./FreeAuditPage";
import { PricingPage } from "./PricingPage";
import { ServicePage } from "./ServicePage";
import { ServicesIndexPage } from "./ServicesIndexPage";
import { AboutPage, ContactsPage, LegalPage } from "./StaticPages";
import { ArticlePage, ArticlesPage } from "./ArticlesPage";
import { GlossaryPage } from "./GlossaryPage";
import { MarketplacePage } from "./MarketplacePage";

export function PublicRoute({ locale, parts }: { locale: Locale; parts: string[] }) {
  const path = parts.join("/");
  if (path === "services") return <ServicesIndexPage locale={locale}/>;
  if (serviceSlugs.includes(path)) return <ServicePage locale={locale} slug={path}/>;
  if (path === "pricing") return <PricingPage locale={locale}/>;
  if (path === "calculator") return <CalculatorPage locale={locale}/>;
  if (path === "cases") return <CasesPage locale={locale}/>;
  if (path === "cases/eco-santeh") return <CasePage locale={locale} slug="eco-santeh"/>;
  if (path === "cases/zasorservice") return <CasePage locale={locale} slug="zasorservice"/>;
  if (path === "brief") return <BriefPage locale={locale}/>;
  if (path === "blog" || path === "articles") return <ArticlesPage locale={locale}/>;
  if ((parts[0] === "blog" || parts[0] === "articles") && parts.length === 2) return <ArticlePage locale={locale} slug={parts[1]}/>;
  if (path === "marketplaces" || (parts[0] === "marketplaces" && parts.length === 2)) return <MarketplacePage locale={locale} platform={parts[1]}/>;
  if (path === "glossary") return <GlossaryPage locale={locale}/>;
  if (path === "about") return <AboutPage locale={locale}/>;
  if (path === "contacts") return <ContactsPage locale={locale}/>;
  if (path === "privacy") return <LegalPage locale={locale} kind="privacy"/>;
  if (path === "consent") return <LegalPage locale={locale} kind="consent"/>;
  if (path === "free-audit") return <FreeAuditPage locale={locale}/>;
  notFound();
}
