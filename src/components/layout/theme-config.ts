export const THEME_STORAGE_KEY = "kileni:theme:v1";
export const THEME_CHANGE_EVENT = "kileni:theme-change";

export const THEME_BOOTSTRAP = `(() => {
  const root = document.documentElement;
  let theme = "dark";
  try {
    const stored = window.localStorage.getItem("${THEME_STORAGE_KEY}");
    if (stored === "dark" || stored === "light" || stored === "signal") theme = stored;
  } catch {}
  root.dataset.kileniTheme = theme;
  root.style.colorScheme = theme === "light" ? "light" : "dark";
})();`;

export type KileniTheme = "light" | "dark" | "signal";
