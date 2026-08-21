"use client";

import { useState } from "react";
import type { Locale } from "../../config/site";
import { AuditForm } from "../forms/AuditForm";
import { HeroAuditVisual } from "./HeroAuditVisual";

export function HeroAuditTool({ locale }: { locale: Locale }) {
  const [auditStarted, setAuditStarted] = useState(false);

  return (
    <div className="hero-tool" id="free-check" data-audit-state={auditStarted ? "running" : "demo"}>
      {!auditStarted && <HeroAuditVisual locale={locale} />}
      <div className="hero-form-wrap">
        <AuditForm
          locale={locale}
          onAuditStart={() => setAuditStarted(true)}
          onAuditError={() => setAuditStarted(false)}
        />
      </div>
    </div>
  );
}
