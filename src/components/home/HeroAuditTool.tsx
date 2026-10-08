"use client";

import { useState } from "react";
import type { Locale } from "../../config/site";
import { AuditForm } from "../forms/AuditForm";
import { HeroAuditVisual } from "./HeroAuditVisual";
import { HeroHighlight } from "../ui/hero-highlight";

export function HeroAuditTool({ locale }: { locale: Locale }) {
  const [auditStarted, setAuditStarted] = useState(false);
  const submitLabel = locale === "ru" ? "Узнать, что мешает сайту" : "See what is holding the website back";

  return (
    <div className="hero-tool" data-audit-state={auditStarted ? "running" : "demo"} data-home-dashboard="premium">
      <HeroHighlight containerClassName="hero-audit-highlight">
        <div className="hero-audit-surface">
          <div className="hero-dashboard-chrome" aria-hidden="true">
            <span><i /><i /><i /></span>
            <b>{locale === "ru" ? "Обзор сайта" : "Website overview"}</b>
            <em>{locale === "ru" ? "Демонстрация интерфейса" : "Interface preview"}</em>
          </div>
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
      </HeroHighlight>
    </div>
  );
}
