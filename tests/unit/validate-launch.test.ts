import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const script = new URL("../../scripts/validate-launch.mjs", import.meta.url);

describe("validate:launch", () => {
  it("uses verified legal defaults but blocks a launch without security configuration", () => {
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
    expect(`${result.stdout}${result.stderr}`).toMatch(/APP_BASE_URL/u);
    expect(`${result.stdout}${result.stderr}`).toMatch(/IP_HASH_SALT/u);
  });

  it("allows a production preview with every public form explicitly disabled", () => {
    const result = run({ ...completeCoreEnvironment(), FORMS_ENABLED: "false", AUDIT_ENABLED: "false" });

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/forms (?:are )?disabled/iu);
  });

  it("defaults a Vercel deployment without an explicit form setting to safe prelaunch mode", () => {
    const result = run({
      ...completeCoreEnvironment(),
      VERCEL: "1",
      DATABASE_PATH: "",
      PRIVATE_UPLOADS_PATH: "",
      TURSO_DATABASE_URL: "libsql://example.turso.io",
      TURSO_AUTH_TOKEN: "token",
      AUDIT_ENABLED: "false",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/forms (?:are )?disabled/iu);
  });

  it("blocks production without admin credentials even when public forms are disabled", () => {
    const result = run({
      ...completeCoreEnvironment(),
      FORMS_ENABLED: "false",
      AUDIT_ENABLED: "false",
      ADMIN_LOGIN: "",
      ADMIN_PASSWORD_HASH: "",
      ADMIN_SESSION_SECRET: "",
      ADMIN_SESSION_HOURS: "",
    });

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/ADMIN_LOGIN/u);
    expect(`${result.stdout}${result.stderr}`).toMatch(/ADMIN_PASSWORD_HASH/u);
    expect(`${result.stdout}${result.stderr}`).toMatch(/ADMIN_SESSION_SECRET/u);
  });

  it("accepts a complete production forms configuration", () => {
    const result = run({
      NODE_ENV: "production",
      FORMS_ENABLED: "true",
      APP_BASE_URL: "https://example.com",
      IP_HASH_SALT: "i".repeat(32),
      LEGAL_NAME: "ИП Тест",
      LEGAL_ADDRESS: "Москва",
      LEGAL_EMAIL: "",
      LEGAL_INN: "123456789012",
      LEGAL_POLICY_VERSION: "2026-08-16",
      LEGAL_POLICY_URL: "https://example.com/privacy",
      LEGAL_CONSENT_URL: "https://example.com/consent",
      DATABASE_PATH: "./data/kileni.sqlite",
      PRIVATE_UPLOADS_PATH: "./data/uploads",
      AUDIT_RESULT_RETENTION_DAYS: "90",
      TURNSTILE_SITE_KEY: "site-key",
      TURNSTILE_SECRET_KEY: "secret-key",
      ...adminEnvironment(),
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/launch configuration is complete/iu);
  });

  it("blocks a configured legal email until the inbox is explicitly verified", () => {
    const base = completeFormsEnvironment();

    const unverified = run({ ...base, LEGAL_EMAIL: "support@kileni-seo.ru", LEGAL_EMAIL_VERIFIED: "false" });
    expect(unverified.status).not.toBe(0);
    expect(`${unverified.stdout}${unverified.stderr}`).toMatch(/LEGAL_EMAIL_VERIFIED/u);

    const forbidden = run({ ...base, LEGAL_EMAIL: "K-TRANS-DIR@MAIL.RU", LEGAL_EMAIL_VERIFIED: "true" });
    expect(forbidden.status).not.toBe(0);
    expect(`${forbidden.stdout}${forbidden.stderr}`).toMatch(/LEGAL_EMAIL/u);

    const verified = run({ ...base, LEGAL_EMAIL: "legal@example.com", LEGAL_EMAIL_VERIFIED: "true" });
    expect(verified.status).toBe(0);
  });

  it("requires a dedicated restore signing secret for a Vercel forms launch", () => {
    const base: NodeJS.ProcessEnv = {
      NODE_ENV: "production",
      VERCEL: "1",
      FORMS_ENABLED: "true",
      APP_BASE_URL: "https://example.com",
      IP_HASH_SALT: "i".repeat(32),
      LEGAL_NAME: "ИП Тест",
      LEGAL_ADDRESS: "Москва",
      LEGAL_EMAIL: "legal@example.com",
      LEGAL_EMAIL_VERIFIED: "true",
      LEGAL_INN: "123456789012",
      LEGAL_POLICY_VERSION: "2026-08-16",
      LEGAL_POLICY_URL: "https://example.com/privacy",
      LEGAL_CONSENT_URL: "https://example.com/consent",
      PUBLIC_EMAIL: "hello@example.com",
      TURSO_DATABASE_URL: "libsql://example.turso.io",
      TURSO_AUTH_TOKEN: "token",
      AUDIT_RESULT_RETENTION_DAYS: "90",
      TURNSTILE_SITE_KEY: "site-key",
      TURNSTILE_SECRET_KEY: "secret-key",
      ...adminEnvironment(),
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

  it.each([
    ["Turso", { TURSO_DATABASE_URL: "libsql://production.example", TURSO_AUTH_TOKEN: "secret-token" }],
    ["SMTP", { SMTP_HOST: "smtp.example.com", SMTP_USER: "mailer", SMTP_PASSWORD: "secret", SMTP_FROM: "hello@example.com" }],
    ["Telegram", { TELEGRAM_BOT_TOKEN: "secret-token", TELEGRAM_CHAT_ID: "123" }],
    ["Turnstile", { TURNSTILE_SITE_KEY: "site-key", TURNSTILE_SECRET_KEY: "secret-key" }],
  ])("blocks %s configuration in an explicitly isolated preview", (_label, integration) => {
    const result = run({
      ...completeCoreEnvironment(),
      KILENI_ISOLATED_PREVIEW: "true",
      FORMS_ENABLED: "false",
      AUDIT_ENABLED: "false",
      ...integration,
    });

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/isolated preview/iu);
    expect(`${result.stdout}${result.stderr}`).not.toContain("secret-token");
  });

  it("allows an isolated preview when external integrations are empty", () => {
    const result = run({
      ...completeCoreEnvironment(),
      KILENI_ISOLATED_PREVIEW: "true",
      FORMS_ENABLED: "false",
      AUDIT_ENABLED: "false",
    });

    expect(result.status).toBe(0);
  });
});

function run(overrides: NodeJS.ProcessEnv) {
  const cleared = {
    LEGAL_NAME: "",
    LEGAL_ADDRESS: "",
    LEGAL_EMAIL: "",
    LEGAL_EMAIL_VERIFIED: "",
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
    APP_BASE_URL: "",
    IP_HASH_SALT: "",
    LEGAL_OGRNIP: "",
    TURNSTILE_SITE_KEY: "",
    TURNSTILE_SECRET_KEY: "",
    TURSO_DATABASE_URL: "",
    TURSO_AUTH_TOKEN: "",
    VERCEL: "",
    ADMIN_LOGIN: "",
    ADMIN_PASSWORD_HASH: "",
    ADMIN_SESSION_SECRET: "",
    ADMIN_SESSION_HOURS: "",
    AUDIT_ENABLED: "",
    KILENI_ISOLATED_PREVIEW: "",
    SMTP_HOST: "",
    SMTP_PORT: "",
    SMTP_SECURE: "",
    SMTP_USER: "",
    SMTP_PASSWORD: "",
    SMTP_FROM: "",
    TELEGRAM_BOT_TOKEN: "",
    TELEGRAM_CHAT_ID: "",
  };
  return spawnSync(process.execPath, [fileURLToPath(script)], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, ...cleared, ...overrides },
  });
}

function completeFormsEnvironment(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    FORMS_ENABLED: "true",
    APP_BASE_URL: "https://example.com",
    IP_HASH_SALT: "i".repeat(32),
    LEGAL_NAME: "ИП Тест",
    LEGAL_ADDRESS: "Москва",
    LEGAL_INN: "123456789012",
    LEGAL_POLICY_VERSION: "2026-08-16",
    LEGAL_POLICY_URL: "https://example.com/privacy",
    LEGAL_CONSENT_URL: "https://example.com/consent",
    DATABASE_PATH: "./data/kileni.sqlite",
    PRIVATE_UPLOADS_PATH: "./data/uploads",
    AUDIT_RESULT_RETENTION_DAYS: "90",
    TURNSTILE_SITE_KEY: "site-key",
    TURNSTILE_SECRET_KEY: "secret-key",
    ...adminEnvironment(),
  };
}

function completeCoreEnvironment(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    APP_BASE_URL: "https://example.com",
    IP_HASH_SALT: "i".repeat(32),
    DATABASE_PATH: "./data/kileni.sqlite",
    PRIVATE_UPLOADS_PATH: "./data/uploads",
    ...adminEnvironment(),
  };
}

function adminEnvironment(): Record<string, string> {
  return {
    ADMIN_LOGIN: "owner",
    ADMIN_PASSWORD_HASH: `$2b$12$${"a".repeat(53)}`,
    ADMIN_SESSION_SECRET: "s".repeat(32),
    ADMIN_SESSION_HOURS: "8",
  };
}
