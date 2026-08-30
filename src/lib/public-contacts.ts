import { siteConfig, type Locale } from "../config/site";

export type PublicContactKind = "phone" | "telegram" | "max" | "email" | "whatsapp";

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
    siteConfig.publicContacts.telegram
      ? {
          kind: "telegram",
          label: "Telegram",
          value: normalizeTelegramHandle(siteConfig.publicContacts.telegram),
          href: `https://t.me/${normalizeTelegramHandle(siteConfig.publicContacts.telegram).slice(1)}`,
          iconSrc: "/contact-icons/telegram.svg",
          external: true,
          ariaLabel: `${ru ? "Написать в Telegram" : "Message on Telegram"} ${normalizeTelegramHandle(siteConfig.publicContacts.telegram)}`,
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
    !primaryOnly && siteConfig.publicContacts.email
      ? {
          kind: "email",
          label: "E-mail",
          value: siteConfig.publicContacts.email,
          href: `mailto:${siteConfig.publicContacts.email}`,
          iconSrc: "/contact-icons/email.svg",
          ariaLabel: `${ru ? "Написать на почту" : "Send email to"} ${siteConfig.publicContacts.email}`,
        }
      : null,
    !primaryOnly && siteConfig.publicContacts.whatsapp
      ? {
          kind: "whatsapp",
          label: "WhatsApp",
          value: siteConfig.publicContacts.whatsapp,
          href: `https://wa.me/${siteConfig.publicContacts.whatsapp.replace(/\D/gu, "")}`,
          iconSrc: "/contact-icons/whatsapp.svg",
          external: true,
          ariaLabel: `${ru ? "Написать в WhatsApp" : "Message on WhatsApp"} ${siteConfig.publicContacts.whatsapp}`,
        }
      : null,
  ];

  return contacts.filter((contact): contact is PublicContact => contact !== null);
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/gu, "");
  return digits ? `+${digits}` : "";
}

function normalizeTelegramHandle(value: string): string {
  return `@${value.trim().replace(/^@/u, "")}`;
}
