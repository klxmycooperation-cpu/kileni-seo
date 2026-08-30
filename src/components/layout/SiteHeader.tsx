"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import type { Locale } from "../../config/site";
import { localizedPath, siteConfig } from "../../config/site";
import { getDictionary } from "../../content/dictionary";
import { Logo } from "../brand/Logo";
import { ThemeToggle } from "./ThemeToggle";

const serviceItems = [
  { id: "seo", path: "services", ru: "SEO", en: "SEO" },
  { id: "development", path: "web-development", ru: "Разработка сайтов", en: "Website development" },
  { id: "marketplaces", path: "marketplaces", ru: "Маркетплейсы", en: "Marketplaces" },
  { id: "custom", path: "custom-task", ru: "Нестандартные задачи", en: "Custom projects" },
] as const;

type DesktopMenu = "services" | null;
type MobileMenu = "services" | null;

export function SiteHeader({ locale }: { locale: Locale }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<MobileMenu>(null);
  const [desktopMenu, setDesktopMenu] = useState<DesktopMenu>(null);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const hoverOpenedMenu = useRef<DesktopMenu>(null);
  const servicesTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const d = getDictionary(locale);
  const home = pathname === "/" || pathname === "/en";
  const phone = siteConfig.publicContacts.phone;
  const phoneHref = `tel:${phone.replace(/[^\d+]/gu, "")}`;

  const mainNavigation = [
    { label: d.nav.cases, path: "cases" },
    { label: d.nav.pricing, path: "pricing" },
    { label: locale === "ru" ? "Блог" : "Blog", path: "blog" },
    { label: locale === "ru" ? "О компании" : "About company", path: "about" },
    { label: d.nav.brief, path: "brief" },
  ] as const;

  const isActive = (path: string) => {
    const href = localizedPath(locale, path);
    return pathname === href || pathname.startsWith(`${href}/`);
  };
  const switched = locale === "ru"
    ? (pathname === "/" ? "/en" : `/en${pathname}`)
    : (pathname.replace(/^\/en(?=\/|$)/u, "") || "/");

  const cancelClose = () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setDesktopMenu(null), 260);
  };
  const openMenu = (menu: Exclude<DesktopMenu, null>) => {
    cancelClose();
    setDesktopMenu(menu);
  };
  const closeMobile = () => {
    setMobileOpen(false);
    setMobileSection(null);
  };

  const restoreDesktopFocus = () => {
    servicesTriggerRef.current?.focus();
  };

  const focusMenuItem = (menu: Exclude<DesktopMenu, null>, edge: "first" | "last" = "first") => {
    window.requestAnimationFrame(() => {
      const items = Array.from(document.querySelectorAll<HTMLElement>(`#desktop-${menu}-menu [role="menuitem"]`));
      items[edge === "first" ? 0 : items.length - 1]?.focus();
    });
  };

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[role=menuitem]"));
    const current = items.indexOf(document.activeElement as HTMLElement);
    let next = current;
    if (event.key === "ArrowDown") next = (current + 1) % items.length;
    else if (event.key === "ArrowUp") next = (current - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else if (event.key === "Escape") {
      event.preventDefault();
      setDesktopMenu(null);
      restoreDesktopFocus();
      return;
    } else return;
    event.preventDefault();
    items[next]?.focus();
  };

  useEffect(() => {
    setDesktopMenu(null);
    closeMobile();
  }, [pathname]);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (desktopMenu) {
        setDesktopMenu(null);
        servicesTriggerRef.current?.focus();
      }
      if (mobileOpen) {
        setMobileOpen(false);
        setMobileSection(null);
        mobileMenuButtonRef.current?.focus();
      }
    };
    const handlePointer = (event: PointerEvent) => {
      if (!(event.target as Element | null)?.closest("[data-header-disclosure]")) setDesktopMenu(null);
    };
    document.addEventListener("pointerdown", handlePointer);
    window.addEventListener("keydown", handleEscape);
    return () => {
      cancelClose();
      document.removeEventListener("pointerdown", handlePointer);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [desktopMenu, mobileOpen]);

  useEffect(() => {
    const closeDesktopLayout = () => {
      if (window.innerWidth <= 1080) setDesktopMenu(null);
      else {
        setMobileOpen(false);
        setMobileSection(null);
      }
    };
    closeDesktopLayout();
    window.addEventListener("resize", closeDesktopLayout, { passive: true });
    return () => window.removeEventListener("resize", closeDesktopLayout);
  }, []);

  const switchLocale = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    event.currentTarget.href = `${switched}${window.location.search}${window.location.hash}`;
    closeMobile();
    setDesktopMenu(null);
  };

  const desktopDisclosure = (
    menu: Exclude<DesktopMenu, null>,
    label: string,
    items: readonly { id: string; path: string; ru: string; en: string }[],
  ) => (
    <div
      className="services-dropdown"
      data-header-disclosure={menu}
      onMouseEnter={() => {
        hoverOpenedMenu.current = menu;
        openMenu(menu);
      }}
      onMouseLeave={() => {
        hoverOpenedMenu.current = null;
        scheduleClose();
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) scheduleClose();
      }}
    >
      <button
        ref={servicesTriggerRef}
        className={`desktop-nav-link services-trigger${items.some((item) => isActive(item.path)) ? " is-active" : ""}`}
        type="button"
        aria-expanded={desktopMenu === menu}
        aria-controls={`desktop-${menu}-menu`}
        onClick={(event) => {
          if (event.detail > 0 && hoverOpenedMenu.current === menu) {
            hoverOpenedMenu.current = null;
            openMenu(menu);
            return;
          }
          setDesktopMenu((current) => current === menu ? null : menu);
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          event.preventDefault();
          openMenu(menu);
          focusMenuItem(menu, event.key === "ArrowDown" ? "first" : "last");
        }}
      >
        {label}<span className="services-chevron" aria-hidden="true"/>
      </button>
      <div
        id={`desktop-${menu}-menu`}
        className="services-menu"
        role="menu"
        aria-label={label}
        hidden={desktopMenu !== menu}
        onKeyDown={handleMenuKeyDown}
      >
        {items.map((item) => (
          <Link key={item.id} role="menuitem" href={localizedPath(locale, item.path)} aria-current={isActive(item.path) ? "page" : undefined}>
            {item[locale]}
          </Link>
        ))}
      </div>
    </div>
  );

  const mobileDisclosure = (
    menu: Exclude<MobileMenu, null>,
    label: string,
    items: readonly { id: string; path: string; ru: string; en: string }[],
  ) => (
    <>
      <button
        className="mobile-services-trigger"
        type="button"
        aria-expanded={mobileSection === menu}
        aria-controls={`mobile-${menu}-list`}
        onClick={() => setMobileSection((current) => current === menu ? null : menu)}
      >
        {label}<span className="services-chevron" aria-hidden="true"/>
      </button>
      <div id={`mobile-${menu}-list`} className="mobile-services-list" hidden={mobileSection !== menu}>
        {items.map((item) => (
          <Link key={item.id} href={localizedPath(locale, item.path)} aria-current={isActive(item.path) ? "page" : undefined} onClick={closeMobile}>
            {item[locale]}
          </Link>
        ))}
      </div>
    </>
  );

  return (
    <header className={`site-header${home ? " site-header--home" : ""}`} data-scrolled={scrolled ? "true" : "false"}>
      <div className="shell header-inner">
        <Logo locale={locale}/>
        <nav className="desktop-nav" aria-label={locale === "ru" ? "Основная навигация" : "Primary navigation"}>
          {desktopDisclosure("services", d.nav.services, serviceItems)}
          {mainNavigation.map((item) => (
            <Link key={item.path} href={localizedPath(locale, item.path)} aria-current={isActive(item.path) ? "page" : undefined}>{item.label}</Link>
          ))}
        </nav>
        <div className="header-actions">
          <a className="header-phone header-phone--desktop" href={phoneHref} aria-label={locale === "ru" ? `Позвонить: ${phone}` : `Call: ${phone}`}>
            <Image src="/contact-icons/phone.svg" width={16} height={16} alt="" aria-hidden="true" />
            <span>{phone}</span>
          </a>
          <ThemeToggle locale={locale}/>
          <a className="language-link" href={switched} hrefLang={locale === "ru" ? "en" : "ru"} onClick={switchLocale} onAuxClick={switchLocale}>{locale === "ru" ? "EN" : "RU"}</a>
          <Link className="button button-small button-primary header-cta" href={localizedPath(locale, "free-audit")}>{d.nav.cta}</Link>
          <button ref={mobileMenuButtonRef} className="menu-button" type="button" aria-expanded={mobileOpen} aria-controls="mobile-menu" aria-label={mobileOpen ? (locale === "ru" ? "Закрыть меню" : "Close menu") : (locale === "ru" ? "Открыть меню" : "Open menu")} onClick={() => mobileOpen ? closeMobile() : setMobileOpen(true)}><span/><span/></button>
        </div>
      </div>
      <div id="mobile-menu" className={`mobile-menu${mobileOpen ? " is-open" : ""}`} hidden={!mobileOpen}>
        <nav aria-label={locale === "ru" ? "Мобильная навигация" : "Mobile navigation"}>
          <Link className="button button-small button-primary mobile-menu-cta" href={localizedPath(locale, "free-audit")} onClick={closeMobile}>{d.nav.cta}</Link>
          {mobileDisclosure("services", d.nav.services, serviceItems)}
          {mainNavigation.map((item) => <Link key={item.path} href={localizedPath(locale, item.path)} aria-current={isActive(item.path) ? "page" : undefined} onClick={closeMobile}>{item.label}</Link>)}
          <a className="header-phone header-phone--mobile" href={phoneHref} onClick={closeMobile}>
            <Image src="/contact-icons/phone.svg" width={18} height={18} alt="" aria-hidden="true" />
            <span>{phone}</span>
          </a>
          <ThemeToggle locale={locale} mobile/>
          <a className="mobile-language-link" href={switched} hrefLang={locale === "ru" ? "en" : "ru"} onClick={switchLocale} onAuxClick={switchLocale}><span aria-hidden="true">{locale === "ru" ? "EN" : "RU"}</span>{locale === "ru" ? "English" : "Русский"}</a>
        </nav>
      </div>
    </header>
  );
}
