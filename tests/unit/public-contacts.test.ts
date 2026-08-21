import { describe, expect, it } from "vitest";
import { siteConfig } from "../../src/config/site";
import { getPublicContacts } from "../../src/lib/public-contacts";

describe("public contacts", () => {
  it("publishes the approved phone, Telegram and MAX contacts", () => {
    const contacts = getPublicContacts("ru", true);

    expect(contacts.map((contact) => contact.kind)).toEqual(["phone", "telegram", "max"]);
    expect(contacts.find((contact) => contact.kind === "phone")).toMatchObject({
      value: "+7 925 225-60-20",
      href: "tel:+79252256020",
      iconSrc: "/contact-icons/phone.svg",
    });
    expect(contacts.find((contact) => contact.kind === "telegram")).toMatchObject({
      value: "@kmdozz",
      href: "https://t.me/kmdozz",
      iconSrc: "/contact-icons/telegram.svg",
    });
    expect(contacts.find((contact) => contact.kind === "max")).toMatchObject({
      value: "+7 925 225-60-20",
      href: "https://web.max.ru/",
      iconSrc: "/contact-icons/max.svg",
      note: "Найти в MAX по номеру",
    });
  });

  it("keeps the same channels and helpful labels in English", () => {
    const contacts = getPublicContacts("en", true);
    expect(contacts.map((contact) => contact.kind)).toEqual(["phone", "telegram", "max"]);
    expect(contacts.find((contact) => contact.kind === "max")?.note).toBe("Find in MAX by phone");
    expect(siteConfig.publicContacts.maxUrl).toBe("https://web.max.ru/");
  });
});
