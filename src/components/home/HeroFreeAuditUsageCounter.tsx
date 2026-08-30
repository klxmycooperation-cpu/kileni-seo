"use client";

import { useEffect, useState } from "react";

import type { Locale } from "../../config/site";
import { FREE_AUDIT_PAGE_BASELINE, freeAuditUsageLabel } from "../../config/public-audit";

export function HeroFreeAuditUsageCounter({ locale }: { locale: Locale }) {
  const [count, setCount] = useState<number>(FREE_AUDIT_PAGE_BASELINE);
  const ru = locale === "ru";

  useEffect(() => {
    let current = true;
    fetch("/api/public-metrics/free-audits", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<{ count?: unknown }> : null)
      .then((payload) => {
        const value = Number(payload?.count);
        if (current && Number.isSafeInteger(value) && value >= FREE_AUDIT_PAGE_BASELINE) setCount(value);
      })
      .catch(() => undefined);
    return () => { current = false; };
  }, []);

  return (
    <p className="hero-free-audit-usage" aria-live="polite" aria-label={`${count} ${freeAuditUsageLabel(locale, count)}`}>
      <span className="hero-free-audit-usage__dot" aria-hidden="true" />
      <strong>{new Intl.NumberFormat(ru ? "ru-RU" : "en-US").format(count)}</strong>
      <span>{freeAuditUsageLabel(locale, count)}</span>
    </p>
  );
}
