"use client";

import { useEffect, useState } from "react";
import type { Locale } from "../../config/site";
import { THEME_CHANGE_EVENT, THEME_STORAGE_KEY, type KileniTheme } from "./theme-config";

function currentTheme(): KileniTheme {
  const value = document.documentElement.dataset.kileniTheme;
  return value === "light" || value === "signal" ? value : "dark";
}

export function ThemeToggle({ locale, mobile = false }: { locale: Locale; mobile?: boolean }) {
  const [theme, setTheme] = useState<KileniTheme>("dark");

  useEffect(() => {
    setTheme(currentTheme());
    const sync = () => setTheme(currentTheme());
    window.addEventListener(THEME_CHANGE_EVENT, sync);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, sync);
  }, []);

  const labels = locale === "ru"
    ? { light: "Светлая", dark: "Тёмная", signal: "Сигнальная" }
    : { light: "Light", dark: "Dark", signal: "Signal" };
  const nextTheme: Record<KileniTheme, KileniTheme> = { light: "dark", dark: "signal", signal: "light" };
  const next = nextTheme[theme];
  const currentLabel = labels[theme];
  const actionLabels: Record<KileniTheme, string> = locale === "ru"
    ? { light: "Включить светлую тему", dark: "Включить тёмную тему", signal: "Включить сигнальную тему" }
    : { light: "Switch to light theme", dark: "Switch to dark theme", signal: "Switch to signal theme" };
  const actionLabel = actionLabels[next];

  const toggle = () => {
    const next = nextTheme[theme];
    document.documentElement.dataset.kileniTheme = next;
    document.documentElement.style.colorScheme = next === "light" ? "light" : "dark";
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // The visual preference still applies for this page when storage is unavailable.
    }
    setTheme(next);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  return (
    <button
      className={`theme-toggle${mobile ? " theme-toggle--mobile" : ""}`}
      type="button"
      data-theme-toggle
      data-theme={theme}
      aria-label={actionLabel}
      title={actionLabel}
      onClick={toggle}
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        <span />
      </span>
      <span className="theme-toggle__label">{currentLabel}</span>
    </button>
  );
}
