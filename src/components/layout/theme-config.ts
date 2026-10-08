export const THEME_STORAGE_KEY = "kileni:theme:v1";
export const THEME_CHANGE_EVENT = "kileni:theme-change";
export const KILENI_THEMES = ["light", "dark"] as const;
export type KileniTheme = (typeof KILENI_THEMES)[number];

export const THEME_BOOTSTRAP = `(() => {
  const root = document.documentElement;
  root.dataset.kileniTheme = "light";
  root.style.colorScheme = "light";
})();`;
