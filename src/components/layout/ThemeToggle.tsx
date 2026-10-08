"use client";

import { useEffect, useState } from "react";
import type { Locale } from "../../config/site";
import { THEME_CHANGE_EVENT, type KileniTheme } from "./theme-config";

function currentTheme(): KileniTheme {
  const value = document.documentElement.dataset.kileniTheme;
  return value === "dark" ? value : "light";
}

export function ThemeToggle({ locale, mobile = false }: { locale: Locale; mobile?: boolean }) {
  const [theme, setTheme] = useState<KileniTheme>("light");

  useEffect(() => {
    setTheme(currentTheme());
    const sync = () => setTheme(currentTheme());
    window.addEventListener(THEME_CHANGE_EVENT, sync);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, sync);
  }, []);

  const labels = locale === "ru"
    ? { light: "Светлая", dark: "Тёмная" }
    : { light: "Light", dark: "Dark" };
  const nextTheme: Record<KileniTheme, KileniTheme> = { light: "dark", dark: "light" };
  const next = nextTheme[theme];
  const currentLabel = labels[theme];
  const actionLabels: Record<KileniTheme, string> = locale === "ru"
    ? { light: "Включить светлую тему", dark: "Включить тёмную тему" }
    : { light: "Switch to light theme", dark: "Switch to dark theme" };
  const actionLabel = actionLabels[next];

  const toggle = () => {
    const next = nextTheme[theme];
    document.documentElement.dataset.kileniTheme = next;
    document.documentElement.style.colorScheme = next === "light" ? "light" : "dark";
    setTheme(next);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  return (
    <button
      className={`theme-toggle${mobile ? " theme-toggle--mobile" : ""}`}
      type="button"
      data-theme-toggle
      data-theme={theme}
      aria-pressed={theme === "light"}
      aria-label={actionLabel}
      title={actionLabel}
      onClick={toggle}
    >
      <span className="theme-toggle__eclipse" aria-hidden="true"><span className="theme-toggle__sun">☀</span><span className="theme-toggle__moon">☾</span><i /></span>
      <span className="theme-toggle__label">{currentLabel}</span>
    </button>
  );
}
