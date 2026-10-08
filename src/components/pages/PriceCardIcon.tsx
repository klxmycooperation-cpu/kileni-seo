type PriceCardKind = "website" | "audit" | "growth" | "listing";

const icons: Record<PriceCardKind, readonly string[]> = {
  website: [
    "M4 5h16v14H4z M4 9h16 M7 7h.01 M10 7h.01 M8 12l-2 2 2 2 M16 12l2 2-2 2",
    "M4 5h16v14H4z M4 9h16 M7 7h.01 M10 7h.01 M8 12h3v4H8z M14 12h3 M14 15h3",
    "M4 5h16v14H4z M4 9h16 M7 7h.01 M10 7h.01 M7 12h4v4H7z M14 12h3v4h-3z",
  ],
  audit: [
    "M15.5 10a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z M14 14l5 5 M8 10h4 M10 8v4",
    "M8 5H5v15h14V5h-3 M8 3h8v4H8z M8 11h8 M8 15h5",
    "M12 3l8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6z M8 12l3 3 5-6",
  ],
  growth: [
    "M4 4v16h16 M7 15l4-4 3 2 6-7 M16 6h4v4",
    "M12 3a9 9 0 1 0 9 9 M12 7a5 5 0 1 0 5 5 M12 12l8-8 M16 4h4v4",
    "M4 18V9h4v9 M10 18V6h4v12 M16 18V3h4v15 M3 21h18",
  ],
  listing: [
    "M14 10a5 5 0 1 1-10 0 5 5 0 0 1 10 0z M13 14l5 5 M7 10h4",
    "M5 3h10l4 4v14H5z M15 3v5h4 M8 12h8 M8 16h5",
    "M4 5h16v14H4z M4 16l5-6 4 4 3-3 4 5 M16 8h.01",
  ],
};

/** Decorative only: the existing title describes each offer. */
export function PriceCardIcon({ kind, index = 0 }: { kind: PriceCardKind; index?: number }) {
  return <span className="service-price-icon" aria-hidden="true">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" focusable="false">
      <path d={icons[kind][index % 3]} />
    </svg>
  </span>;
}

export function servicePriceKind(offerId: string): PriceCardKind {
  if (offerId.startsWith("development-")) return "website";
  if (offerId.startsWith("seo-audit-")) return "audit";
  if (offerId.startsWith("seo-promotion-")) return "growth";
  return "listing";
}

export function servicePriceTone(index: number) {
  return ["blue", "violet", "teal"][index % 3];
}
