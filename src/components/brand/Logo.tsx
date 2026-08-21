import Link from "next/link";
import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";

export function Logo({ locale, inverted = false }: { locale: Locale; inverted?: boolean }) {
  return (
    <Link
      className={`brand-logo${inverted ? " brand-logo--inverted" : ""}`}
      href={localizedPath(locale)}
      aria-label={locale === "ru" ? "KILENI SEO — главная" : "KILENI SEO — home"}
    >
      <span className="brand-logo__wordmark" aria-hidden="true">
        <span className="brand-logo__name">KILENI</span><span className="brand-logo__descriptor">seo</span>
      </span>
    </Link>
  );
}
