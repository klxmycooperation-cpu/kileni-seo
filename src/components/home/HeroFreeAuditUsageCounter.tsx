import type { Locale } from "../../config/site";

export function HeroFreeAuditUsageCounter({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const copy = ru
    ? "успешных SEO-продвижений"
    : "completed SEO engagements";
  const label = ru ? `Более 50 ${copy}` : `More than 50 ${copy}`;

  return (
    <p className="hero-free-audit-usage" aria-label={label}>
      <span className="hero-free-audit-usage__dot" aria-hidden="true" />
      <strong>{ru ? "50+" : "50+"}</strong>
      <span>{copy}</span>
    </p>
  );
}
