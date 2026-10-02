import "../../../app/service-pricing-brief-10.css";

import Link from "next/link";
import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";
import { glossaryTerms } from "../../content/glossary";
import { PublicShell } from "../layout/PublicShell";
import { CanvasText } from "../ui/canvas-text";
import { GlossaryExplorer } from "./GlossaryExplorer";

export function GlossaryPage({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  return (
    <PublicShell locale={locale}>
    <div className="glossary-page page-main">
      <section className="glossary-hero shell"><p className="section-kicker">{ru ? "Словарь" : "Glossary"}</p><h1><CanvasText text={ru ? "Термины — простыми словами" : "Search and digital terms in plain language"} lineGap={7} animationDuration={10}/></h1><p>{ru ? "Короткие определения без попытки спрятать смысл за профессиональной лексикой." : "Short definitions without hiding meaning behind professional jargon."}</p></section>
      <GlossaryExplorer locale={locale} terms={glossaryTerms}/>
      <section className="glossary-cta shell"><h2>{ru ? "Нужно проверить конкретный сайт?" : "Need to review a specific website?"}</h2><Link className="button" href={localizedPath(locale, "free-audit")}>{ru ? "Запустить бесплатную проверку" : "Start the free check"} ↗</Link></section>
    </div>
    </PublicShell>
  );
}
