"use client";

import { useEffect, useState } from "react";

import type { Locale } from "../../config/site";

export function FreeAuditUsageCounter({ locale }: { locale: Locale }) {
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
    <p className="free-audit-usage" data-testid="free-audit-usage-count" aria-live="polite">
      <i className="free-audit-usage__pulse" aria-hidden="true" />
      <strong>{new Intl.NumberFormat(ru ? "ru-RU" : "en-US").format(count)}</strong>
      <span>{ru ? "сайтов уже получили результат бесплатной SEO-проверки" : "websites have received a free SEO check result"}</span>
    </p>
  );
}
