import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const production = process.env.NODE_ENV === "production";
const configuredForms = process.env.FORMS_ENABLED?.trim();
const formsEnabled = configuredForms ? configuredForms !== "false" : process.env.VERCEL !== "1";

if (!production) {
  process.stdout.write("[KILENI] Development configuration: launch validation is advisory.\n");
  process.exit(0);
}

if (!formsEnabled) {
  process.stdout.write("[KILENI] Launch validation passed: public forms disabled.\n");
  process.exit(0);
}

const failures = [];
const required = [
  "LEGAL_NAME",
  "LEGAL_ADDRESS",
  "LEGAL_EMAIL",
  "LEGAL_INN",
  "LEGAL_POLICY_VERSION",
  "LEGAL_POLICY_URL",
  "LEGAL_CONSENT_URL",
  "DATABASE_PATH",
  "PRIVATE_UPLOADS_PATH",
];

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

if (process.env.LEGAL_EMAIL?.trim() && !isEmail(process.env.LEGAL_EMAIL)) {
  failures.push("LEGAL_EMAIL: must be a valid email address");
}

for (const name of ["LEGAL_POLICY_URL", "LEGAL_CONSENT_URL"]) {
  const value = process.env[name]?.trim();
  if (value && !isPublicDocumentUrl(value)) failures.push(`${name}: must be an absolute HTTP(S) URL`);
}

if (!["PUBLIC_PHONE", "PUBLIC_EMAIL", "PUBLIC_TELEGRAM", "PUBLIC_MAX", "PUBLIC_WHATSAPP"].some((name) => process.env[name]?.trim())) {
  failures.push("PUBLIC_PHONE/PUBLIC_EMAIL/PUBLIC_TELEGRAM/PUBLIC_MAX/PUBLIC_WHATSAPP: at least one public contact is required");
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

function isPublicDocumentUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
