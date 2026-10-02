"use client";

import type { Locale } from "../../config/site";
import { useEffect, useState } from "react";
import { HeroSearchVisibilityVisual } from "../analytics/AnalyticsVisuals";

function useCosmosPreviewEnabled() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setEnabled(root.dataset.kileniTheme === "cosmos");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-kileni-theme"] });
    return () => observer.disconnect();
  }, []);

  return enabled;
}

export function HeroAuditVisual({ locale }: { locale: Locale }) {
  const cosmosPreviewEnabled = useCosmosPreviewEnabled();
  return (
    <div className="hero-audit-visual-stack" id="hero-preview">
      {cosmosPreviewEnabled ? (
        <video
          data-prompt-3d-object
          className="hero-reference-visual"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          src="/visuals/kileni-3d-object.mp4"
        />
      ) : (
        <HeroSearchVisibilityVisual locale={locale} />
      )}
    </div>
  );
}
