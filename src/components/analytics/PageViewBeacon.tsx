"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function PageViewBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    const body = JSON.stringify({ path: pathname });
    try {
      if (navigator.sendBeacon(
        "/api/metrics/page-view",
        new Blob([body], { type: "application/json" }),
      )) return;
    } catch {
      // Fall back to fetch when the browser cannot queue a beacon.
    }
    void fetch("/api/metrics/page-view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      cache: "no-store",
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);
  return null;
}
