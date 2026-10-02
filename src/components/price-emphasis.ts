const priceTones = ["blue", "violet", "green"] as const;

export type PriceTone = (typeof priceTones)[number];

export function priceToneAt(index: number): PriceTone {
  return priceTones[index % priceTones.length] ?? "blue";
}

export function priceToneClass(index: number): `price-emphasis--${PriceTone}` {
  return `price-emphasis--${priceToneAt(index)}`;
}
