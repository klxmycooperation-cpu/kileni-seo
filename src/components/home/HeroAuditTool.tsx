"use client";

import { useState } from "react";
import type { Locale } from "../../config/site";
import { AuditForm } from "../forms/AuditForm";
import { HeroAuditVisual } from "./HeroAuditVisual";

export function HeroAuditTool({ locale }: { locale: Locale }) {
  const [auditStarted, setAuditStarted] = useState(false);
  const submitLabel = locale === "ru" ? "Проверить сайт" : "Check your website";

  return (
    <div className="hero-tool" data-audit-state={auditStarted ? "running" : "demo"}>
      <div className="hero-audit-surface">
        {!auditStarted && <HeroAuditVisual locale={locale} />}
        <div className="hero-form-wrap" id="free-check">
          <AuditForm
            locale={locale}
            submitLabel={submitLabel}
            onAuditStart={() => setAuditStarted(true)}
            onAuditError={() => setAuditStarted(false)}
          />
        </div>
      </div>
    </div>
  );
}
