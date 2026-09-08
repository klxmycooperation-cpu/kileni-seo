import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.KILENI_BASE_URL ?? "http://127.0.0.1:3000";
const outputRoot = path.resolve(
  process.env.KILENI_QA_OUTPUT_DIR ?? path.join("output", "kileni-fix-qa-2026-08-30"),
);
const screenshotDir = path.join(outputRoot, "screenshots");
const reportPath = path.join(outputRoot, "qa-report.json");
await mkdir(screenshotDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const checks = [];
const issues = [];

function record(name, passed, details = "") {
  checks.push({ name, passed, details });
  if (!passed) issues.push(`${name}${details ? ` — ${details}` : ""}`);
}

async function createPage({ theme = "dark", width = 1440, height = 900, introSeen = true } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: width <= 768 });
  await context.addInitScript(({ selectedTheme, skipIntro }) => {
    window.localStorage.setItem("kileni:theme:v1", selectedTheme);
    window.localStorage.setItem("kileni-cookie-preferences:v2", JSON.stringify({
      essential: true,
      analytics: false,
      marketing: false,
      version: "2026-08-23.2",
    }));
    if (skipIntro) window.sessionStorage.setItem("kileni:intro:v9", "1");
    else window.sessionStorage.removeItem("kileni:intro:v9");
  }, { selectedTheme: theme, skipIntro: introSeen });
  const page = await context.newPage();
  const label = `${theme}-${width}x${height}`;
  page.on("console", (message) => {
    if (message.type() === "error") issues.push(`${label}: console error: ${message.text()}`);
  });
  page.on("pageerror", (error) => issues.push(`${label}: page error: ${error.message}`));
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "unknown failure";
    if (!/ERR_ABORTED|favicon/iu.test(`${failure} ${request.url()}`)) {
      issues.push(`${label}: request failed: ${request.url()} — ${failure}`);
    }
  });
  return { context, page, label };
}

async function open(page, route, label, wait = 250) {
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(wait);
  record(`${label}: HTTP 200`, response?.status() === 200, String(response?.status()));
  record(`${label}: one H1`, await page.locator("h1").count() === 1, String(await page.locator("h1").count()));
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  record(`${label}: no horizontal overflow`, dimensions.scrollWidth <= dimensions.clientWidth, `${dimensions.scrollWidth}/${dimensions.clientWidth}`);
}

async function capturePage({ route, file, theme = "dark", width = 1440, height = 900, prepare }) {
  const { context, page, label } = await createPage({ theme, width, height });
  const captureLabel = `${label} ${route}`;
  await open(page, route, captureLabel);
  if (prepare) await prepare(page);
  await page.screenshot({ path: path.join(screenshotDir, file), fullPage: true });
  await context.close();
}

for (const theme of ["dark", "signal", "light"]) {
  await capturePage({
    route: "/services",
    file: `services-${theme}-desktop.png`,
    theme,
  });
}

await capturePage({ route: "/services", file: "services-dark-390.png", width: 390, height: 844 });
await capturePage({ route: "/services", file: "services-dark-320.png", width: 320, height: 720 });
await capturePage({ route: "/free-audit", file: "free-audit-320.png", width: 320, height: 720 });
await capturePage({
  route: "/",
  file: "header-320-menu-open.png",
  width: 320,
  height: 720,
  prepare: async (page) => {
    await page.getByRole("button", { name: /Открыть меню/u }).click();
    record("header 320: menu visible", await page.locator("#mobile-menu").isVisible());
  },
});
await capturePage({
  route: "/pricing",
  file: "pricing-seo-audit-200.png",
  prepare: async (page) => {
    const offer = page.locator('[data-offer-id="seo-audit-200"]');
    if (await offer.getAttribute("data-selected") !== "true") {
      await offer.getByRole("button", { name: "Выбрать", exact: true }).click();
    }
    record("pricing: seo-audit-200 selected", await offer.getAttribute("data-selected") === "true");
  },
});
await capturePage({ route: "/brief?offer=seo-audit-200", file: "brief-seo-audit-200.png" });
await capturePage({ route: "/custom-task", file: "custom-task-heading.png" });

{
  const { context, page } = await createPage({ width: 1440, height: 900, introSeen: false });
  await page.goto(`${baseUrl}/?intro=1`, { waitUntil: "domcontentloaded" });
  await page.locator(".brand-intro-v9").waitFor({ state: "visible" });
  await page.waitForTimeout(520);
  record("intro first frame: KILENI letters visible", await page.locator(".brand-intro-v9__kil").isVisible() && await page.locator(".brand-intro-v9__e").isVisible());
  await page.screenshot({ path: path.join(screenshotDir, "intro-first-frame.png") });
  await page.waitForTimeout(2_850);
  record("intro final frame: SEO letters visible", await page.locator(".brand-intro-v9__s").isVisible() && await page.locator(".brand-intro-v9__o").isVisible());
  await page.screenshot({ path: path.join(screenshotDir, "intro-final-frame.png") });
  await context.close();
}

await browser.close();
await writeFile(reportPath, `${JSON.stringify({ baseUrl, checkedAt: new Date().toISOString(), checks, issues }, null, 2)}\n`);

console.log(`Fix QA: ${checks.filter((check) => check.passed).length}/${checks.length} assertions passed`);
console.log(`Screenshots: ${screenshotDir}`);
console.log(`Report: ${reportPath}`);
if (issues.length) {
  console.error(issues.join("\n"));
  process.exitCode = 1;
}
