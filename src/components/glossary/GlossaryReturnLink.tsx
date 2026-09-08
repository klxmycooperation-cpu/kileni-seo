"use client";

import { useEffect, useState } from "react";

import type { Locale } from "../../config/site";
import { sanitizeGlossaryReturnTarget } from "../../lib/glossary/linking";

export function GlossaryReturnLink({ locale }: { locale: Locale }) {
  const [returnTarget, setReturnTarget] = useState<string | null>(null);

  useEffect(() => {
    const requestedTarget = new URLSearchParams(window.location.search).get("from");
    setReturnTarget(sanitizeGlossaryReturnTarget(requestedTarget));
  }, []);

  if (!returnTarget) return null;
  return (
    <a className="glossary-return-link" href={returnTarget} rel="nofollow">
      <span aria-hidden="true">←</span>
      {locale === "ru" ? "Вернуться к месту в тексте" : "Return to where you were reading"}
    </a>
  );
}
