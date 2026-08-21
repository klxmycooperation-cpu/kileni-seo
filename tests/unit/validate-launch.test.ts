import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const script = new URL("../../scripts/validate-launch.mjs", import.meta.url);

describe("validate:launch", () => {
  it("fails a production forms-enabled launch when legal data is incomplete", () => {
    const result = run({
      NODE_ENV: "production",
      FORMS_ENABLED: "true",
      LEGAL_NAME: "",
      LEGAL_EMAIL: "",
      LEGAL_POLICY_VERSION: "",
      LEGAL_POLICY_URL: "",
      LEGAL_CONSENT_URL: "",
      PUBLIC_EMAIL: "",
      AUDIT_RESULT_RETENTION_DAYS: "",
    });

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/LEGAL_NAME/u);
    expect(`${result.stdout}${result.stderr}`).toMatch(/LEGAL_POLICY_URL/u);
  });

  it("allows a production preview with every public form explicitly disabled", () => {
    const result = run({ NODE_ENV: "production", FORMS_ENABLED: "false" });

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/forms disabled/iu);
  });

  it("defaults a Vercel deployment without an explicit form setting to safe prelaunch mode", () => {
    const result = run({ NODE_ENV: "production", VERCEL: "1" });

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/forms disabled/iu);
  });

  it("accepts a complete production forms configuration", () => {
    const result = run({
      NODE_ENV: "production",
      FORMS_ENABLED: "true",
      LEGAL_NAME: "ИП Тест",
      LEGAL_ADDRESS: "Москва",
      LEGAL_EMAIL: "legal@example.com",
      LEGAL_INN: "123456789012",
      LEGAL_POLICY_VERSION: "2026-08-16",
      LEGAL_POLICY_URL: "https://example.com/privacy",
      LEGAL_CONSENT_URL: "https://example.com/consent",
      PUBLIC_EMAIL: "hello@example.com",
      DATABASE_PATH: "./data/kileni.sqlite",
      PRIVATE_UPLOADS_PATH: "./data/uploads",
      AUDIT_RESULT_RETENTION_DAYS: "90",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/launch configuration is complete/iu);
  });

  it("requires a dedicated restore signing secret for a Vercel forms launch", () => {
    const base: NodeJS.ProcessEnv = {
      NODE_ENV: "production",
      VERCEL: "1",
      FORMS_ENABLED: "true",
      LEGAL_NAME: "ИП Тест",
      LEGAL_ADDRESS: "Москва",
      LEGAL_EMAIL: "legal@example.com",
      LEGAL_INN: "123456789012",
      LEGAL_POLICY_VERSION: "2026-08-16",
      LEGAL_POLICY_URL: "https://example.com/privacy",
      LEGAL_CONSENT_URL: "https://example.com/consent",
      PUBLIC_EMAIL: "hello@example.com",
      DATABASE_PATH: "/tmp/kileni.sqlite",
      PRIVATE_UPLOADS_PATH: "/tmp/uploads",
      AUDIT_RESULT_RETENTION_DAYS: "90",
    };

    const missing = run({ ...base, AUDIT_RESTORE_SECRET: "" });
    expect(missing.status).not.toBe(0);
    expect(`${missing.stdout}${missing.stderr}`).toMatch(/AUDIT_RESTORE_SECRET/u);

    const placeholder = run({ ...base, AUDIT_RESTORE_SECRET: "replace-with-at-least-32-random-characters" });
    expect(placeholder.status).not.toBe(0);
    expect(`${placeholder.stdout}${placeholder.stderr}`).toMatch(/AUDIT_RESTORE_SECRET/u);

    const configured = run({ ...base, AUDIT_RESTORE_SECRET: "r".repeat(32) });
    expect(configured.status).toBe(0);
  });
});

function run(overrides: NodeJS.ProcessEnv) {
  const cleared = {
    LEGAL_NAME: "",
    LEGAL_ADDRESS: "",
    LEGAL_EMAIL: "",
    LEGAL_INN: "",
    LEGAL_POLICY_VERSION: "",
    LEGAL_POLICY_URL: "",
    LEGAL_CONSENT_URL: "",
    PUBLIC_PHONE: "",
    PUBLIC_EMAIL: "",
    PUBLIC_TELEGRAM: "",
    PUBLIC_MAX: "",
    PUBLIC_MAX_URL: "",
    PUBLIC_WHATSAPP: "",
    DATABASE_PATH: "",
    PRIVATE_UPLOADS_PATH: "",
    AUDIT_RESULT_RETENTION_DAYS: "",
    AUDIT_RESTORE_SECRET: "",
    VERCEL: "",
  };
  return spawnSync(process.execPath, [script.pathname], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, ...cleared, ...overrides },
  });
}
