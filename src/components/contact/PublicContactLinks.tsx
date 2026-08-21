import Image from "next/image";
import type { Locale } from "../../config/site";
import { getPublicContacts } from "../../lib/public-contacts";

export function PublicContactLinks({
  locale,
  variant = "cards",
  primaryOnly = false,
}: {
  locale: Locale;
  variant?: "cards" | "compact" | "footer";
  primaryOnly?: boolean;
}) {
  const contacts = getPublicContacts(locale, primaryOnly);

  return (
    <div className={`public-contact-links public-contact-links--${variant}`}>
      {contacts.map((contact) => (
        <a
          className="public-contact-link"
          data-contact-kind={contact.kind}
          href={contact.href}
          key={contact.kind}
          aria-label={contact.ariaLabel}
          {...(contact.external ? { target: "_blank", rel: "noreferrer" } : {})}
        >
          <span className="public-contact-icon" aria-hidden="true">
            <Image src={contact.iconSrc} alt="" width={40} height={40} unoptimized />
          </span>
          <span className="public-contact-copy">
            <span className="public-contact-label">{contact.label}</span>
            <strong>{contact.value}</strong>
            {contact.note ? <small>{contact.note}</small> : null}
          </span>
        </a>
      ))}
    </div>
  );
}
