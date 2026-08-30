import Link from "next/link";
import type { Locale } from "../../config/site";
import { localizedPath, siteConfig } from "../../config/site";
import { Logo } from "../brand/Logo";
import { PublicContactLinks } from "../contact/PublicContactLinks";
import { CookieSettingsButton } from "./CookieManager";

export function SiteFooter({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div className="footer-brand"><Logo locale={locale} inverted /><p>{ru ? "Проверяем и исправляем сайты, настраиваем продвижение, рекламу и карточки товаров." : "Website checks and fixes, SEO, advertising and product listings."}</p></div>
        <nav aria-label={ru ? "Услуги в подвале" : "Footer services"}>
          <p className="footer-label">{ru ? "Направления" : "Services"}</p>
          <Link href={localizedPath(locale, "seo-audit")}>{ru ? "SEO-аудит" : "SEO audit"}</Link>
          <Link href={localizedPath(locale, "seo-promotion")}>{ru ? "Продвижение" : "SEO support"}</Link>
          <Link href={localizedPath(locale, "marketplaces")}>{ru ? "Маркетплейсы" : "Marketplaces"}</Link>
          <Link href={localizedPath(locale, "web-development")}>{ru ? "Разработка" : "Development"}</Link>
        </nav>
        <nav aria-label={ru ? "Информация в подвале" : "Footer information"}>
          <p className="footer-label">{ru ? "Информация" : "Information"}</p>
          <Link href={localizedPath(locale, "about")}>{ru ? "О компании" : "About"}</Link>
          <Link href={localizedPath(locale, "contacts")}>{ru ? "Контакты" : "Contact"}</Link>
          <Link href={localizedPath(locale, "calculator")}>{ru ? "Калькулятор стоимости" : "Cost calculator"}</Link>
          <Link href={localizedPath(locale, "blog")}>{ru ? "Блог" : "Blog"}</Link>
          <Link href={localizedPath(locale, "glossary")}>{ru ? "SEO простыми словами" : "SEO glossary"}</Link>
          <Link href={localizedPath(locale, "privacy")}>{ru ? "Политика данных" : "Privacy"}</Link>
          <Link href={localizedPath(locale, "consent")}>{ru ? "Согласие" : "Consent"}</Link>
          <CookieSettingsButton locale={locale}/>
        </nav>
        <div className="footer-contacts">
          <p className="footer-label">{ru ? "Связаться" : "Contact"}</p>
          <PublicContactLinks locale={locale} variant="footer" />
        </div>
      </div>
      <div className="shell footer-legal-identity">
        <span>{siteConfig.legal.shortName}</span>
        <span>{ru ? `ИНН ${siteConfig.legal.inn}` : `Tax ID ${siteConfig.legal.inn}`}</span>
        <span>{ru ? `ОГРНИП ${siteConfig.legal.ogrnip}` : `Registration ${siteConfig.legal.ogrnip}`}</span>
        <span>{siteConfig.legal.address}</span>
        <span>{siteConfig.legal.registrationAuthority}</span>
      </div>
      <div className="shell footer-bottom"><span>© {new Date().getFullYear()} KILENI</span><span>{ru ? "Состав и цена согласуются до начала работ" : "Scope and price are agreed before work starts"}</span></div>
    </footer>
  );
}
