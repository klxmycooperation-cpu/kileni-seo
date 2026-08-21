import { fragrances } from "@/src/content/fragrances";

export function getFragrance(slug: string) {
  return fragrances.find((fragrance) => fragrance.slug === slug);
}

export function getNextFragrance(slug: string) {
  const index = fragrances.findIndex((fragrance) => fragrance.slug === slug);
  return fragrances[(index + 1 + fragrances.length) % fragrances.length];
}

