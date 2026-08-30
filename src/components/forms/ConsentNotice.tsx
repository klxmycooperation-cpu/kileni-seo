import Link from "next/link";
import type { Locale } from "../../config/site";
import { localizedPath } from "../../config/site";

export function ConsentNotice({
  locale,
  purpose = "general",
}: {
  locale: Locale;
  purpose?: "general" | "audit-report";
}) {
  if (purpose === "audit-report") {
    return locale === "ru" ? (
      <span>
        Даю <Link href={localizedPath(locale, "consent")} target="_blank">согласие на обработку email для подготовки и однократной отправки отчёта</Link>{" "}
        и ознакомился с <Link href={localizedPath(locale, "privacy")} target="_blank">Политикой обработки персональных данных</Link>
      </span>
    ) : (
      <span>
        I give <Link href={localizedPath(locale, "consent")} target="_blank">consent to process my email to prepare and send the requested report once</Link>{" "}
        and have read the <Link href={localizedPath(locale, "privacy")} target="_blank">Privacy policy</Link>
      </span>
    );
  }

  return locale === "ru" ? (
    <span>
      Даю <Link href={localizedPath(locale, "consent")} target="_blank">согласие на обработку персональных данных</Link>{" "}
      и ознакомился с <Link href={localizedPath(locale, "privacy")} target="_blank">Политикой</Link>
    </span>
  ) : (
    <span>
      I give <Link href={localizedPath(locale, "consent")} target="_blank">consent to personal data processing</Link>{" "}
      and have read the <Link href={localizedPath(locale, "privacy")} target="_blank">Privacy policy</Link>
    </span>
  );
}
