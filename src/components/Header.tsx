"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { navigation } from "@/src/content/site";

export function Header() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isPastIntro, setIsPastIntro] = useState(pathname !== "/");
  const [isOpen, setIsOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const updateHeader = () => {
      setIsScrolled(window.scrollY > 28);
      if (pathname !== "/") {
        setIsPastIntro(true);
        return;
      }

      const intro = document.querySelector<HTMLElement>(".intro-reveal");
      const revealAt = intro
        ? intro.offsetTop + intro.offsetHeight - window.innerHeight * 0.62
        : window.innerHeight;
      setIsPastIntro(window.scrollY >= revealAt);
    };
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    window.addEventListener("resize", updateHeader);
    return () => {
      window.removeEventListener("scroll", updateHeader);
      window.removeEventListener("resize", updateHeader);
    };
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.documentElement.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.documentElement.style.overflow = "";
    };
  }, [isOpen]);

  const solid = isScrolled || pathname !== "/" || isOpen;
  const hiddenByIntro = pathname === "/" && !isPastIntro && !isOpen;

  return (
    <header className={`site-header ${solid ? "site-header--solid" : ""} ${hiddenByIntro ? "site-header--intro-hidden" : ""}`}>
      <Link className="site-header__logo" href="/" aria-label="KILENI — главная">
        KILENI
      </Link>

      <nav className="site-header__nav" aria-label="Основная навигация">
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={pathname === item.href ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <Link className="site-header__choose" href="/#collection">
        Выбрать аромат <span aria-hidden="true">↘</span>
      </Link>

      <button
        ref={menuButtonRef}
        className="site-header__menu-button"
        type="button"
        aria-label={isOpen ? "Закрыть меню" : "Открыть меню"}
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>{isOpen ? "Закрыть" : "Меню"}</span>
        <span className="site-header__menu-mark" aria-hidden="true">
          {isOpen ? "×" : "+"}
        </span>
      </button>

      <nav
        id="mobile-navigation"
        className={`mobile-nav ${isOpen ? "mobile-nav--open" : ""}`}
        aria-label="Мобильная навигация"
        aria-hidden={!isOpen}
      >
        <p className="eyebrow">KILENI / КАТАЛОГ АРОМАТОВ</p>
        <div className="mobile-nav__links">
          {navigation.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              tabIndex={isOpen ? 0 : -1}
              onClick={() => setIsOpen(false)}
            >
              <span>0{index + 1}</span>
              {item.label}
            </Link>
          ))}
        </div>
        <Link
          className="text-link mobile-nav__cta"
          href="/#collection"
          tabIndex={isOpen ? 0 : -1}
          onClick={() => setIsOpen(false)}
        >
          Выбрать аромат <span aria-hidden="true">↗</span>
        </Link>
      </nav>
    </header>
  );
}
