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
  ] as const)("classifies %s as %s", (value, expected) => {
    expect(detectContactType(value)).toBe(expected);
  });

  it.each(["+7 925 225-60-20", "8 (925) 225-60-20"])("rejects phone contacts before storage: %s", (contact) => {
    expect(leadRequestSchema.safeParse({ ...validLead, contact }).success).toBe(false);
  });

  it("accepts and trims a valid contact through the request schema", () => {
    const parsed = leadRequestSchema.parse({
      ...validLead,
      contact: "  anna@example.com  ",
    });

    expect(parsed.contact).toBe("anna@example.com");
  });

  it.each(["abc", "not a contact", "@bad", "@kileni_team", "kileni_team", "+1"])(
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
    locale: "ru" as const,
    authority: true as const,
    honeypot: "",
    url: "https://example.com",
  };

  it("assigns the server-controlled 10-page limit without asking the client", () => {
    expect(auditRequestSchema.parse(validAudit).pageLimit).toBe(10);
    expect(auditRequestSchema.parse(validAudit).forceFresh).toBe(false);
  });

  it("accepts only an explicit boolean request to bypass a reusable result", () => {
    expect(auditRequestSchema.parse({ ...validAudit, forceFresh: true }).forceFresh).toBe(true);
    expect(auditRequestSchema.safeParse({ ...validAudit, forceFresh: "true" }).success).toBe(false);
  });

  it("accepts at most three optional priority URLs", () => {
    expect(auditRequestSchema.parse({
      ...validAudit,
      priorityUrls: [
        "https://example.com/services/seo",
        "https://example.com/pricing",
      ],
    }).priorityUrls).toEqual([
      "https://example.com/services/seo",
      "https://example.com/pricing",
    ]);
    expect(auditRequestSchema.safeParse({
      ...validAudit,
      priorityUrls: ["/one", "/two", "/three", "/four"],
    }).success).toBe(false);
  });

  it.each(["1", "10", "30", "100", "1000", "not-a-number"])("ignores a legacy client page limit: %s", (pageLimit) => {
    expect(auditRequestSchema.parse({ ...validAudit, pageLimit }).pageLimit).toBe(10);
  });

  it("accepts an audit without an email or personal-data consent", () => {
    expect(auditRequestSchema.parse(validAudit)).toMatchObject({ email: "", consent: false });
    expect(auditRequestSchema.parse({ ...validAudit, email: "" })).toMatchObject({ email: "", consent: false });
  });

  it("validates a supplied email and requires consent only for that email", () => {
    expect(auditRequestSchema.parse({
      ...validAudit,
      email: "  anna@example.com  ",
      consent: true,
    }).email).toBe("anna@example.com");
    expect(auditRequestSchema.safeParse({ ...validAudit, email: "anna@example.com" }).success).toBe(false);
    expect(auditRequestSchema.safeParse({ ...validAudit, email: "@kileni_team", consent: true }).success).toBe(false);
    expect(auditRequestSchema.safeParse({ ...validAudit, email: "+7 999 123-45-67", consent: true }).success).toBe(false);
  });

  it("rejects the legacy audit name/contact payload", () => {
    expect(auditRequestSchema.safeParse({
      ...validAudit,
      name: "Анна",
      contact: "anna@example.com",
    }).success).toBe(false);
  });
});
