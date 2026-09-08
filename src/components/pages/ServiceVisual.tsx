import type { Locale } from "../../config/site";
import type { ServiceVisual as ServiceVisualContent } from "../../content/services";

export function ServiceVisual({ visual, locale, items, outcome }: { visual: ServiceVisualContent; locale: Locale; items: string[]; outcome: string }) {
  const ru = locale === "ru";
  return (
    <aside className={`svc-visual svc-visual-${visual.kind}`} aria-label={visual.summary}>
      <div className="svc-visual-heading">
        <span>{visual.label}</span>
        <b>{visual.summary}</b>
      </div>
      <div className="svc-visual-result">
        <span>{ru ? "Что передадим" : "What we deliver"}</span>
        <strong>{outcome}</strong>
      </div>
      <ul className="svc-visual-deliverables">
        {items.map((item) => <li key={item}><span aria-hidden="true">✓</span>{item}</li>)}
      </ul>
      <p className="svc-visual-note">{ru ? "Состав фиксируется до начала работы" : "Scope is fixed before work starts"}</p>
    </aside>
  );
}
