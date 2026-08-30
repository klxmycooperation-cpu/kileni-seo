import nextEnv from "@next/env";
import { readFileSync } from "node:fs";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const legalDefaults = JSON.parse(readFileSync(new URL("../src/config/legal-defaults.json", import.meta.url), "utf8"));

const production = process.env.NODE_ENV === "production";
const configuredForms = process.env.FORMS_ENABLED?.trim();
const legal = {
  name: process.env.LEGAL_NAME?.trim() || legalDefaults.name,
  address: process.env.LEGAL_ADDRESS?.trim() || legalDefaults.address,
  email: process.env.LEGAL_EMAIL?.trim() || legalDefaults.email,
  inn: process.env.LEGAL_INN?.trim() || legalDefaults.inn,
  ogrnip: process.env.LEGAL_OGRNIP?.trim() || legalDefaults.ogrnip,
  version: process.env.LEGAL_POLICY_VERSION?.trim() || legalDefaults.version,
  policyUrl: process.env.LEGAL_POLICY_URL?.trim() || legalDefaults.policyUrl,
  consentUrl: process.env.LEGAL_CONSENT_URL?.trim() || legalDefaults.consentUrl,
};
const legalEnvironmentIsComplete = Object.values(legal).every((value) => Boolean(value?.trim()));
const formsEnabled = process.env.VERCEL === "1" && !legalEnvironmentIsComplete
  ? false
  : configuredForms ? configuredForms !== "false" : process.env.VERCEL !== "1";

if (!production) {
  process.stdout.write("[KILENI] Development configuration: launch validation is advisory.\n");
  process.exit(0);
}

if (!formsEnabled) {
  process.stdout.write("[KILENI] Launch validation passed: public forms disabled.\n");
  process.exit(0);
}

const failures = [];
const required = ["APP_BASE_URL", "IP_HASH_SALT"];

if (process.env.VERCEL === "1") {
  required.push("TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN");
} else {
  required.push("DATABASE_PATH", "PRIVATE_UPLOADS_PATH");
}

for (const name of required) {
  if (!process.env[name]?.trim()) failures.push(`${name}: required`);
}

const restoreSecret = process.env.AUDIT_RESTORE_SECRET ?? "";
if (process.env.VERCEL === "1" && (
  Buffer.byteLength(restoreSecret, "utf8") < 32 ||
  restoreSecret.trim() === "replace-with-at-least-32-random-characters"
)) {
  failures.push("AUDIT_RESTORE_SECRET: required on Vercel and must contain at least 32 bytes");
}

const ipHashSalt = process.env.IP_HASH_SALT ?? "";
if (Buffer.byteLength(ipHashSalt, "utf8") < 32 || ipHashSalt.includes("replace-with") || ipHashSalt === "development-only-change-before-production") {
  failures.push("IP_HASH_SALT: must contain at least 32 non-placeholder bytes");
}

if (!isEmail(legal.email)) {
  failures.push("LEGAL_EMAIL: must be a valid email address");
}

for (const [name, value] of [["LEGAL_POLICY_URL", legal.policyUrl], ["LEGAL_CONSENT_URL", legal.consentUrl]]) {
  if (!isPublicDocumentUrl(value, process.env.APP_BASE_URL)) failures.push(`${name}: must resolve to an HTTP(S) URL`);
}

if (!legalEnvironmentIsComplete) failures.push("LEGAL_*: operator details are incomplete");

if (process.env.APP_BASE_URL && !isProductionBaseUrl(process.env.APP_BASE_URL)) {
  failures.push("APP_BASE_URL: must be a public HTTPS origin");
}

const publicContact = ["PUBLIC_PHONE", "PUBLIC_EMAIL", "PUBLIC_TELEGRAM", "PUBLIC_MAX", "PUBLIC_WHATSAPP"]
  .map((name) => process.env[name]?.trim())
  .find(Boolean) || "+79295900900";
if (!publicContact) failures.push("PUBLIC_PHONE/PUBLIC_EMAIL/PUBLIC_TELEGRAM/PUBLIC_MAX/PUBLIC_WHATSAPP: at least one public contact is required");

if (process.env.AUDIT_ENABLED !== "false") {
  const siteKey = process.env.TURNSTILE_SITE_KEY?.trim();
  const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!siteKey || !secretKey) failures.push("TURNSTILE_SITE_KEY/TURNSTILE_SECRET_KEY: both are required while the public audit is enabled");
}

const retentionDays = Number(process.env.AUDIT_RESULT_RETENTION_DAYS);
if (!Number.isInteger(retentionDays) || retentionDays < 90 || retentionDays > 3_650) {
  failures.push("AUDIT_RESULT_RETENTION_DAYS: must be an integer from 90 to 3650");
}

if (failures.length) {
  process.stderr.write("[KILENI] Production launch blocked. Complete the following configuration:\n");
  process.stderr.write(failures.map((failure) => `- ${failure}`).join("\n") + "\n");
  process.exit(1);
}

process.stdout.write("[KILENI] Production launch configuration is complete.\n");

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value.trim());
}

function isPublicDocumentUrl(value, base) {
  try {
    const url = new URL(value, base);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isProductionBaseUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname);
  } catch {
    return false;
  }
}
