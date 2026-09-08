"use client";

import { useLayoutEffect } from "react";
import { THEME_CHANGE_EVENT, THEME_STORAGE_KEY, type KileniTheme } from "./theme-config";

function storedTheme(): KileniTheme {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (value === "light" || value === "signal") return value;
  } catch {
    // Keep the default theme when storage is unavailable.
  }
  return "dark";
}

function applyStoredTheme() {
  const theme = storedTheme();
  document.documentElement.dataset.kileniTheme = theme;
  document.documentElement.style.colorScheme = theme === "light" ? "light" : "dark";
}

export function ThemePreferenceSync() {
  useLayoutEffect(() => {
    applyStoredTheme();
    const syncFromStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === THEME_STORAGE_KEY) applyStoredTheme();
    };
    window.addEventListener(THEME_CHANGE_EVENT, applyStoredTheme);
    window.addEventListener("storage", syncFromStorage);
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, applyStoredTheme);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, []);

  return null;
}
