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
  { id: "seo", path: "seo", ru: "SEO", en: "SEO" },
  { id: "development", path: "web-development", ru: "Разработка сайтов", en: "Website development" },
  { id: "marketplaces", path: "marketplaces", ru: "Маркетплейсы", en: "Marketplaces" },
  { id: "custom", path: "custom-task", ru: "Нестандартные задачи", en: "Custom projects" },
] as const;

type DesktopMenu = "services" | null;
type MobileMenu = "services" | null;
let restoreMobileFocusAfterNavigation = false;

const MOBILE_FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");
const COMPACT_HEADER_TEXT_SIZE_PX = 24;

function getMobileFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(MOBILE_FOCUSABLE_SELECTOR)).filter((element) => (
    element.getAttribute("aria-hidden") !== "true" && element.getClientRects().length > 0
  ));
}

export function SiteHeader({ locale }: { locale: Locale }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<MobileMenu>(null);
  const [desktopMenu, setDesktopMenu] = useState<DesktopMenu>(null);
  const [scrolled, setScrolled] = useState(false);
  const [textScaleCompact, setTextScaleCompact] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const hoverOpenedMenu = useRef<DesktopMenu>(null);
  const servicesTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const d = getDictionary(locale);
  const home = pathname === "/" || pathname === "/en";
  const phone = siteConfig.publicContacts.phone;
  const phoneHref = `tel:${phone.replace(/[^\d+]/gu, "")}`;

  const mainNavigation = [
    { label: d.nav.cases, path: "cases" },
    { label: d.nav.pricing, path: "pricing" },
    { label: locale === "ru" ? "Блог" : "Blog", path: "blog" },
    { label: locale === "ru" ? "Термины" : "Terms", path: "glossary" },
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

  const restoreMobileFocus = () => {
    window.requestAnimationFrame(() => mobileMenuButtonRef.current?.focus({ preventScroll: true }));
  };

  const closeMobileAndRestoreFocus = () => {
    closeMobile();
    restoreMobileFocus();
  };

  const closeMobileForNavigation = () => {
    restoreMobileFocusAfterNavigation = true;
    closeMobile();
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
    if (restoreMobileFocusAfterNavigation) {
      restoreMobileFocusAfterNavigation = false;
      window.requestAnimationFrame(() => restoreMobileFocus());
    }
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    const menu = mobileMenuRef.current;
    if (!menu) return;

    const lockedPathname = pathname;
    const scrollY = window.scrollY;
    const body = document.body;
    const originalBodyStyle = {
      position: body.style.position,
      top: body.style.top,
      right: body.style.right,
      left: body.style.left,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    const backgroundElements = [
      document.querySelector<HTMLElement>(".skip-link"),
      ...document.querySelectorAll<HTMLElement>(".kileni-site > :not(.site-header)"),
      ...document.querySelectorAll<HTMLElement>(".site-header .header-inner > :not(.header-actions)"),
      ...document.querySelectorAll<HTMLElement>(".site-header .header-actions > :not(.menu-button)"),
    ].filter((element): element is HTMLElement => element instanceof HTMLElement).map((element) => ({
      element,
      hadInert: element.hasAttribute("inert"),
      ariaHidden: element.getAttribute("aria-hidden"),
    }));

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.right = "0";
    body.style.left = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    for (const { element } of backgroundElements) {
      element.setAttribute("inert", "");
      element.setAttribute("aria-hidden", "true");
    }

    const focusFrame = window.requestAnimationFrame(() => {
      getMobileFocusableElements(menu)[0]?.focus({ preventScroll: true });
    });
    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusableElements = getMobileFocusableElements(menu);
      if (focusableElements.length === 0) {
        event.preventDefault();
        mobileMenuButtonRef.current?.focus({ preventScroll: true });
        return;
      }

      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const activeIndex = active ? focusableElements.indexOf(active) : -1;
      const first = focusableElements[0];
      const last = focusableElements.at(-1);
      if (event.shiftKey && activeIndex <= 0) {
        event.preventDefault();
        last?.focus({ preventScroll: true });
      } else if (!event.shiftKey && (activeIndex === -1 || activeIndex === focusableElements.length - 1)) {
        event.preventDefault();
        first?.focus({ preventScroll: true });
      }
    };

    document.addEventListener("keydown", handleTab, true);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleTab, true);
      for (const { element, hadInert, ariaHidden } of backgroundElements) {
        if (!hadInert) element.removeAttribute("inert");
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      }
      body.style.position = originalBodyStyle.position;
      body.style.top = originalBodyStyle.top;
      body.style.right = originalBodyStyle.right;
      body.style.left = originalBodyStyle.left;
      body.style.width = originalBodyStyle.width;
      body.style.overflow = originalBodyStyle.overflow;
      if (window.location.pathname === lockedPathname) window.scrollTo({ top: scrollY, left: 0, behavior: "auto" });
    };
  }, [mobileOpen, pathname]);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const update = () => {
      const rootFontSize = Number.parseFloat(window.getComputedStyle(root).fontSize);
      setTextScaleCompact(Number.isFinite(rootFontSize) && rootFontSize >= COMPACT_HEADER_TEXT_SIZE_PX);
    };
    const resizeObserver = new ResizeObserver(update);
    const mutationObserver = new MutationObserver(update);
    update();
    resizeObserver.observe(root);
    mutationObserver.observe(root, { attributes: true, attributeFilter: ["class", "style"] });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", update);
    };
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
        mobileMenuButtonRef.current?.focus({ preventScroll: true });
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
      if (window.innerWidth <= 1080 || textScaleCompact) setDesktopMenu(null);
      else {
        setMobileOpen(false);
        setMobileSection(null);
      }
    };
    closeDesktopLayout();
    window.addEventListener("resize", closeDesktopLayout, { passive: true });
    return () => window.removeEventListener("resize", closeDesktopLayout);
  }, [textScaleCompact]);

  const switchLocale = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    event.currentTarget.href = `${switched}${window.location.search}${window.location.hash}`;
    if (mobileOpen) closeMobileForNavigation();
    else closeMobile();
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
          <Link key={item.id} href={localizedPath(locale, item.path)} aria-current={isActive(item.path) ? "page" : undefined} onClick={closeMobileForNavigation}>
            {item[locale]}
          </Link>
        ))}
      </div>
    </>
  );

  return (
    <header
      className={`site-header${home ? " site-header--home" : ""}`}
      data-scrolled={scrolled ? "true" : "false"}
      data-text-scale-compact={textScaleCompact ? "true" : undefined}
    >
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
      <button
        className="mobile-menu-backdrop"
        type="button"
        tabIndex={-1}
        aria-label={locale === "ru" ? "Закрыть мобильное меню" : "Close mobile menu"}
        data-mobile-menu-backdrop
        hidden={!mobileOpen}
        onClick={closeMobileAndRestoreFocus}
      />
      <div ref={mobileMenuRef} id="mobile-menu" className={`mobile-menu${mobileOpen ? " is-open" : ""}`} role="dialog" aria-modal="true" aria-label={locale === "ru" ? "Мобильное меню" : "Mobile menu"} hidden={!mobileOpen}>
        <nav aria-label={locale === "ru" ? "Мобильная навигация" : "Mobile navigation"}>
          <Link className="button button-small button-primary mobile-menu-cta" href={localizedPath(locale, "free-audit")} onClick={closeMobileForNavigation}>{d.nav.cta}</Link>
          {mobileDisclosure("services", d.nav.services, serviceItems)}
          {mainNavigation.map((item) => <Link key={item.path} href={localizedPath(locale, item.path)} aria-current={isActive(item.path) ? "page" : undefined} onClick={closeMobileForNavigation}>{item.label}</Link>)}
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
