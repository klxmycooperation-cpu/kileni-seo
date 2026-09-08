import { siteConfig, type Locale } from "../config/site";

export type PublicContactKind = "phone" | "max";

export type PublicContact = {
  kind: PublicContactKind;
  label: string;
  value: string;
  href: string;
  iconSrc: string;
  external?: boolean;
  note?: string;
  ariaLabel: string;
};

export function getPublicContacts(locale: Locale, primaryOnly = false): PublicContact[] {
  // The argument remains part of the shared contact API. With only the two
  // approved public channels, both compact and full variants are identical.
  void primaryOnly;
  const ru = locale === "ru";
  const contacts: Array<PublicContact | null> = [
    siteConfig.publicContacts.phone
      ? {
          kind: "phone",
          label: ru ? "Телефон" : "Phone",
          value: siteConfig.publicContacts.phone,
          href: `tel:${normalizePhone(siteConfig.publicContacts.phone)}`,
          iconSrc: "/contact-icons/phone.svg",
          ariaLabel: `${ru ? "Позвонить" : "Call"} ${siteConfig.publicContacts.phone}`,
        }
      : null,
    siteConfig.publicContacts.maxPhone && siteConfig.publicContacts.maxUrl
      ? {
          kind: "max",
          label: "MAX",
          value: siteConfig.publicContacts.maxPhone,
          href: siteConfig.publicContacts.maxUrl,
          iconSrc: "/contact-icons/max.svg",
          external: true,
          note: ru ? "Найти в MAX по номеру" : "Find in MAX by phone",
          ariaLabel: `${ru ? "Открыть MAX и найти контакт по номеру" : "Open MAX and find the contact by phone"} ${siteConfig.publicContacts.maxPhone}`,
        }
      : null,
  ];

  return contacts.filter((contact): contact is PublicContact => contact !== null);
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/gu, "");
  return digits ? `+${digits}` : "";
}
