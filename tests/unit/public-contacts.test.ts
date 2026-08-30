import { describe, expect, it } from "vitest";
import { siteConfig } from "../../src/config/site";
import { getPublicContacts } from "../../src/lib/public-contacts";

describe("public contacts", () => {
  it("publishes the approved phone, Telegram and MAX contacts", () => {
    const contacts = getPublicContacts("ru", true);

    expect(contacts.map((contact) => contact.kind)).toEqual(["phone", "telegram", "max"]);
    expect(contacts.find((contact) => contact.kind === "phone")).toMatchObject({
      value: "+7 929 590-09-00",
      href: "tel:+79295900900",
      iconSrc: "/contact-icons/phone.svg",
    });
    expect(contacts.find((contact) => contact.kind === "telegram")).toMatchObject({
      value: "@kmdozz",
      href: "https://t.me/kmdozz",
      iconSrc: "/contact-icons/telegram.svg",
    });
    expect(contacts.find((contact) => contact.kind === "max")).toMatchObject({
      value: "+7 929 590-09-00",
      href: "https://web.max.ru/",
    });
  });

  it("keeps the same confirmed channels in English", () => {
    const contacts = getPublicContacts("en", true);
    expect(contacts.map((contact) => contact.kind)).toEqual(["phone", "telegram", "max"]);
    expect(siteConfig.publicContacts.maxUrl).toBe("https://web.max.ru/");
  });
});
