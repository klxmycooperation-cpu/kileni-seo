const ISOLATED_PREVIEW_FLAG = "KILENI_ISOLATED_PREVIEW";

const EXTERNAL_INTEGRATION_VARIABLES = [
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "TURNSTILE_SITE_KEY",
  "TURNSTILE_SECRET_KEY",
];

export function isolatedPreviewEnvironmentFailures(environment = process.env) {
  if (!isEnabled(environment[ISOLATED_PREVIEW_FLAG])) return [];
  return EXTERNAL_INTEGRATION_VARIABLES.filter((name) => Boolean(environment[name]?.trim()));
}

export function assertIsolatedPreviewEnvironment(environment = process.env) {
  const configured = isolatedPreviewEnvironmentFailures(environment);
  if (configured.length === 0) return;
  throw new Error(
    `[KILENI] Isolated preview launch blocked. External integration variables must be empty: ${configured.join(", ")}`,
  );
}

function isEnabled(value) {
  return value === "1" || value?.trim().toLowerCase() === "true";
}
