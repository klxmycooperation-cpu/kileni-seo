import { describe, expect, it } from "vitest";
import { siteConfig } from "../../src/config/site";
import { getPublicContacts } from "../../src/lib/public-contacts";

describe("public contacts", () => {
  it("publishes only the approved phone and direct MAX contact", () => {
    const contacts = getPublicContacts("ru", true);

    expect(contacts.map((contact) => contact.kind)).toEqual(["phone", "max"]);
    expect(contacts.find((contact) => contact.kind === "phone")).toMatchObject({
      value: "+7 925 225-60-20",
      href: "tel:+79252256020",
      iconSrc: "/contact-icons/phone.svg",
    });
    expect(contacts.find((contact) => contact.kind === "max")).toMatchObject({
      value: "+7 925 225-60-20",
      href: "https://max.ru/u/f9LHodD0cOIfT31Quztlpr8xf0bVdj-qQCiQRjSIDPYk9DG40xt2pmMbtcg",
    });
  });

  it("keeps the same confirmed channels in English", () => {
    const contacts = getPublicContacts("en");
    expect(contacts.map((contact) => contact.kind)).toEqual(["phone", "max"]);
    expect(siteConfig.publicContacts.maxUrl).toBe("https://max.ru/u/f9LHodD0cOIfT31Quztlpr8xf0bVdj-qQCiQRjSIDPYk9DG40xt2pmMbtcg");
  });
});
