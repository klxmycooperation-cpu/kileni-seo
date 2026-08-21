"use client";

import { useEffect, useState } from "react";

import type { Locale } from "../../config/site";

export function HeroFreeAuditUsageCounter({ locale }: { locale: Locale }) {
  const [count, setCount] = useState<number | null>(null);
  const ru = locale === "ru";

  useEffect(() => {
    let current = true;
    fetch("/api/public-metrics/free-audits", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<{ count?: unknown }> : null)
      .then((payload) => {
        const value = Number(payload?.count);
        if (current && Number.isSafeInteger(value) && value > 0) setCount(value);
      })
      .catch(() => undefined);
    return () => { current = false; };
  }, []);

  if (!count) return null;

  return (
    <p className="hero-free-audit-usage" aria-live="polite">
      <i aria-hidden="true" />
      <strong>{new Intl.NumberFormat(ru ? "ru-RU" : "en-US").format(count)}</strong>
      <span>
        {ru
          ? "сайтов уже получили предварительную SEO-оценку KILENI"
          : "websites have already received a preliminary KILENI SEO assessment"}
      </span>
    </p>
  );
}
