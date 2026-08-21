import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

const names = [
  "LEGAL_NAME",
  "LEGAL_ADDRESS",
  "LEGAL_EMAIL",
  "LEGAL_INN",
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
  it("does not expose an operator summary from incomplete launch data", async () => {
    for (const name of names) process.env[name] = "";
    vi.resetModules();
    const site = await import("../../src/config/site");

    expect(site.legalDocumentsAreComplete()).toBe(false);
    expect(site.legalOperatorSummary("ru")).toBeNull();
  });

  it("builds a central operator summary only from complete configured data", async () => {
    Object.assign(process.env, {
      LEGAL_NAME: "ИП Тест",
      LEGAL_ADDRESS: "Москва",
      LEGAL_EMAIL: "legal@example.com",
      LEGAL_INN: "123456789012",
      LEGAL_POLICY_VERSION: "2026-08-16",
      LEGAL_POLICY_URL: "https://example.com/privacy",
      LEGAL_CONSENT_URL: "https://example.com/consent",
    });
    vi.resetModules();
    const site = await import("../../src/config/site");

    expect(site.legalDocumentsAreComplete()).toBe(true);
    expect(site.legalOperatorSummary("ru")).toBe("ИП Тест · ИНН 123456789012 · Москва · legal@example.com");
  });

  it("removes the forbidden public placeholder from the legal page", () => {
    const source = readFileSync(new URL("../../src/components/pages/StaticPages.tsx", import.meta.url), "utf8");
    expect(source).not.toContain("Оператор будет указан до публичного запуска");
    expect(source).not.toContain("Operator details will be provided before public launch");
  });
});
