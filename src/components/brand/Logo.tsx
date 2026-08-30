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
      <svg className="brand-logo__wordmark" viewBox="0 0 242 54" aria-hidden="true" focusable="false">
        <text className="brand-logo__name" x="0" y="42">KILENI</text>
        <text className="brand-logo__descriptor" x="118" y="42">seo</text>
      </svg>
    </Link>
  );
}
