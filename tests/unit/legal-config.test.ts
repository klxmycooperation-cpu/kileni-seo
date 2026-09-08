import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

const names = [
  "LEGAL_NAME",
  "LEGAL_ADDRESS",
  "LEGAL_EMAIL",
  "LEGAL_EMAIL_VERIFIED",
  "LEGAL_INN",
  "LEGAL_OGRNIP",
  "LEGAL_POLICY_VERSION",
  "LEGAL_POLICY_URL",
  "LEGAL_CONSENT_URL",
] as const;
const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));

afterEach(() => {
  for (const name of names) {
    const value = previous[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  vi.resetModules();
});

describe("legal document configuration", () => {
  it("uses the verified company card when deployment overrides are absent", async () => {
    for (const name of names) process.env[name] = "";
    vi.resetModules();
    const site = await import("../../src/config/site");

    expect(site.legalDocumentsAreComplete()).toBe(true);
    expect(site.legalOperatorSummary("ru")).toContain("Калиновская Оксана Анатольевна");
    expect(site.legalOperatorSummary("ru")).toContain("ОГРНИП 323508100254983");
    expect(site.siteConfig.legal.email).toBe("");
    expect(site.legalOperatorSummary("ru")).not.toContain("@");
  });

  it("builds a central operator summary only from complete configured data", async () => {
    Object.assign(process.env, {
      LEGAL_NAME: "ИП Тест",
      LEGAL_ADDRESS: "Москва",
      LEGAL_EMAIL: "legal@example.com",
      LEGAL_EMAIL_VERIFIED: "true",
      LEGAL_INN: "123456789012",
      LEGAL_OGRNIP: "323500000000001",
      LEGAL_POLICY_VERSION: "2026-08-16",
      LEGAL_POLICY_URL: "https://example.com/privacy",
      LEGAL_CONSENT_URL: "https://example.com/consent",
    });
    vi.resetModules();
    const site = await import("../../src/config/site");

    expect(site.legalDocumentsAreComplete()).toBe(true);
    expect(site.legalOperatorSummary("ru")).toBe("ИП Тест · ИНН 123456789012 · ОГРНИП 323500000000001 · Москва · legal@example.com");
  });

  it("does not publish a configured legal inbox before it is verified", async () => {
    process.env.LEGAL_EMAIL = "support@kileni-seo.ru";
    process.env.LEGAL_EMAIL_VERIFIED = "false";
    vi.resetModules();
    const site = await import("../../src/config/site");

    expect(site.siteConfig.legal.email).toBe("");
    expect(site.legalDocumentsAreComplete()).toBe(true);
    expect(site.legalOperatorSummary("ru")).not.toContain("support@kileni-seo.ru");
  });

  it("removes the forbidden public placeholder from the legal page", () => {
    const source = readFileSync(new URL("../../src/components/pages/StaticPages.tsx", import.meta.url), "utf8");
    expect(source).not.toContain("Оператор будет указан до публичного запуска");
    expect(source).not.toContain("Operator details will be provided before public launch");
  });

  it("keeps forbidden legacy contacts out of the safe environment template", () => {
    const template = readFileSync(new URL("../../.env.example", import.meta.url), "utf8");
    expect(template).not.toContain("K-TRANS-DIR@MAIL.RU");
    expect(template).not.toMatch(/^PUBLIC_EMAIL=/mu);
    expect(template).not.toMatch(/^PUBLIC_TELEGRAM=/mu);
  });
});
