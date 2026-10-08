"use client";

import { useLayoutEffect } from "react";
import { THEME_CHANGE_EVENT, type KileniTheme } from "./theme-config";

function currentTheme(): KileniTheme {
  return document.documentElement.dataset.kileniTheme === "dark" ? "dark" : "light";
}

function applyCurrentTheme() {
  const theme = currentTheme();
  document.documentElement.dataset.kileniTheme = theme;
  document.documentElement.style.colorScheme = theme === "light" ? "light" : "dark";
}

export function ThemePreferenceSync() {
  useLayoutEffect(() => {
    applyCurrentTheme();
    window.addEventListener(THEME_CHANGE_EVENT, applyCurrentTheme);
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, applyCurrentTheme);
    };
  }, []);

  return null;
}
