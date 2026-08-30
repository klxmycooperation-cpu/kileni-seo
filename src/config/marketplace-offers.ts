import type { MarketplaceId } from "../content/marketplaces";
import { formatOfferPrice, localizedOffer, offersForService } from "./offers";
import type { Locale } from "./site";

const marketplaceIds: readonly MarketplaceId[] = ["wildberries", "ozon", "yandex-market", "megamarket"];

/** @deprecated Prefer offersForService("marketplaces", platform). */
export const marketplaceOffers = Object.fromEntries(
  marketplaceIds.map((platform) => [
    platform,
    offersForService("marketplaces", platform).map((offer) => ({ ...offer, featured: offer.recommended })),
  ]),
) as Record<MarketplaceId, Array<ReturnType<typeof offersForService>[number] & { featured: boolean }>>;

/**
 * Compatibility view for marketplace pages. The unified offer catalogue is
 * the only source of IDs, prices, units, scope, duration and deliverables.
 */
export function localizedMarketplaceOffers(platform: MarketplaceId, locale: Locale) {
  return offersForService("marketplaces", platform).map((offer) => {
    const item = localizedOffer(offer, locale);
    return {
      id: offer.id,
      name: item.title,
      description: item.description,
      current: formatOfferPrice(offer, locale),
      limit: item.scope,
      duration: item.duration,
      mainResult: item.result,
      features: item.features,
      featured: offer.recommended,
    };
  });
}
