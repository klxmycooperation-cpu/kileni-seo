export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

export type UtmAttribution = Partial<Record<(typeof UTM_KEYS)[number], string>>;

export function collectBrowserAttribution(): { pageUrl: string; utm: UtmAttribution } {
  if (typeof window === "undefined") return { pageUrl: "", utm: {} };

  const utm: UtmAttribution = {};
  const params = new URLSearchParams(window.location.search);
  for (const key of UTM_KEYS) {
    const value = params.get(key)?.trim();
    if (value) utm[key] = value.slice(0, 200);
  }

  // Never persist an arbitrary query string: it may contain contacts, restore
  // tokens or other personal data. Campaign parameters are already collected
  // separately through the strict allowlist above.
  return { pageUrl: `${window.location.origin}${window.location.pathname}`.slice(0, 2048), utm };
}
