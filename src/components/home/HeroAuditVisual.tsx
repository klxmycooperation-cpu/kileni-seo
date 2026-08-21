"use client";

import type { Locale } from "../../config/site";
import { HeroSearchVisibilityVisual } from "../analytics/AnalyticsVisuals";

export function HeroAuditVisual({ locale }: { locale: Locale }) {
  return <HeroSearchVisibilityVisual locale={locale} />;
}
