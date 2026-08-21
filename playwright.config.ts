import { defineConfig, devices } from "@playwright/test";
import bcrypt from "bcryptjs";
import { resolve } from "node:path";

const port = Number(process.env.E2E_PORT ?? 3_107);
const runId = process.env.E2E_RUN_ID ?? `${Date.now()}-${process.pid}`;
process.env.E2E_RUN_ID = runId;
process.env.E2E_PORT = String(port);
process.env.APP_BASE_URL = `http://127.0.0.1:${port}`;
process.env.DATABASE_PATH ??= resolve(process.cwd(), `tmp/e2e/kileni-${runId}.sqlite`);
process.env.PRIVATE_UPLOADS_PATH ??= resolve(process.cwd(), `tmp/e2e/uploads-${runId}`);
process.env.IP_HASH_SALT = "e2e-ip-hash-salt-at-least-thirty-two-characters";
process.env.ADMIN_LOGIN = "e2e-admin";
process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync("Kileni-e2e-password", 4);
process.env.ADMIN_SESSION_SECRET = "e2e-session-secret-at-least-thirty-two-characters";
process.env.ADMIN_PDF_FONT_PATH = "/System/Library/Fonts/Supplemental/Arial.ttf";
process.env.ADMIN_PDF_FONT_BOLD_PATH = "/System/Library/Fonts/Supplemental/Arial Bold.ttf";
process.env.TELEGRAM_BOT_TOKEN = "";
process.env.TELEGRAM_CHAT_ID = "";
process.env.SMTP_HOST = "";
process.env.TURNSTILE_SITE_KEY = "";
process.env.TURNSTILE_SECRET_KEY = "";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm exec tsx scripts/e2e-server.ts",
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
