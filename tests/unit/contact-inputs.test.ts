import { describe, expect, it } from "vitest";

import {
  auditRequestSchema,
  calculatorRequestSchema,
  detectContactType,
  leadRequestSchema,
} from "../../src/lib/security/inputs";

const validLead = {
  name: "Анна",
  contact: "anna@example.com",
  locale: "ru" as const,
  consent: true as const,
  honeypot: "",
  service: "SEO-аудит",
};

describe("contact input parsing", () => {
  it.each([
    ["anna@example.com", "email"],
    ["@kileni_team", "telegram"],
    ["kileni_team", "telegram"],
    ["+7 (999) 123-45-67", "phone"],
  ] as const)("classifies %s as %s", (value, expected) => {
    expect(detectContactType(value)).toBe(expected);
  });

  it("accepts and trims a valid contact through the request schema", () => {
    const parsed = leadRequestSchema.parse({
      ...validLead,
      contact: "  anna@example.com  ",
    });

    expect(parsed.contact).toBe("anna@example.com");
  });

  it.each(["abc", "not a contact", "@bad", "+1"])(
    "rejects an ambiguous or malformed contact: %s",
    (contact) => {
      expect(leadRequestSchema.safeParse({ ...validLead, contact }).success).toBe(false);
    },
  );

  it("accepts only allowlisted UTM fields and keeps calculator attribution", () => {
    const parsed = calculatorRequestSchema.parse({
      ...validLead,
      kind: "audit",
      answers: { pages: 50 },
      estimate: { min: 25_000, max: 35_000 },
      pageUrl: "https://kileni.ru/calculator?utm_source=yandex",
      source: "calculator",
      utm: { utm_source: "yandex", utm_campaign: "brand" },
    });

    expect(parsed.utm).toEqual({ utm_source: "yandex", utm_campaign: "brand" });
    expect(parsed.pageUrl).toContain("/calculator");
    expect(leadRequestSchema.safeParse({ ...validLead, utm: { click_id: "raw" } }).success).toBe(false);
  });
});

describe("free audit page limit", () => {
  const validAudit = {
    name: "Анна",
    contact: "anna@example.com",
    locale: "ru" as const,
    consent: true as const,
    authority: true as const,
    honeypot: "",
    url: "https://example.com",
  };

  it("assigns the server-controlled 10-page limit without asking the client", () => {
    expect(auditRequestSchema.parse(validAudit).pageLimit).toBe(10);
  });

  it.each(["1", "10", "30", "100", "1000", "not-a-number"])("ignores a legacy client page limit: %s", (pageLimit) => {
    expect(auditRequestSchema.parse({ ...validAudit, pageLimit }).pageLimit).toBe(10);
  });

  it("accepts a phone, Telegram handle or email for an audit contact", () => {
    expect(auditRequestSchema.safeParse({ ...validAudit, contact: "+7 999 123-45-67" }).success).toBe(true);
    expect(auditRequestSchema.safeParse({ ...validAudit, contact: "@kileni_team" }).success).toBe(true);
    expect(auditRequestSchema.safeParse({ ...validAudit, contact: "anna@example.com" }).success).toBe(true);
  });
});
