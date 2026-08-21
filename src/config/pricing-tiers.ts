export type PricingTierCandidate = {
  readonly name: string;
  readonly featured?: boolean;
};

/** Keeps the entry, recommended and largest real package without inventing prices. */
export function selectPricingTiers<T extends PricingTierCandidate>(packages: readonly T[]): T[] {
  if (packages.length <= 3) return [...packages];
  const recommended = packages.find((item) => item.featured) ?? packages[Math.floor(packages.length / 2)];
  return [packages[0], recommended, packages[packages.length - 1]].filter(
    (item, index, selected) => selected.findIndex((candidate) => candidate.name === item.name) === index,
  );
}
