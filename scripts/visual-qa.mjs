import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.KILENI_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = path.join(process.cwd(), "docs", "redesign-screenshots", "after");
const matrixDir = path.join(outputDir, "matrix");
const reportPath = path.join(outputDir, "visual-qa.json");
await mkdir(outputDir, { recursive: true });
await mkdir(matrixDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const issues = [];
const checks = [];

function record(name, passed, details = "") {
  checks.push({ name, passed, details });
  if (!passed) issues.push(`${name}${details ? ` — ${details}` : ""}`);
}

function monitor(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      issues.push(`${label}: console ${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => issues.push(`${label}: pageerror: ${error.message}`));
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "unknown failure";
    if (!/ERR_ABORTED|favicon/iu.test(failure + request.url())) {
      issues.push(`${label}: request failed: ${request.url()} — ${failure}`);
    }
  });
}

async function open(page, route, label, wait = 220) {
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "load" });
  record(`${label}: HTTP 200`, response?.status() === 200, String(response?.status()));
  await page.waitForTimeout(wait);
  await page.evaluate(() => document.fonts.ready);
  const h1Count = await page.locator("h1").count();
  record(`${label}: one H1`, h1Count === 1, String(h1Count));
  record(
    `${label}: no horizontal overflow`,
    await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    await page.evaluate(() => `${document.documentElement.scrollWidth}/${document.documentElement.clientWidth}`),
  );
}

async function stableDocumentHeight(page, label) {
  const before = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(260);
  const after = await page.evaluate(() => document.documentElement.scrollHeight);
  record(`${label}: finite document height`, after <= before + Math.max(96, Math.ceil(before * 0.03)), `${before}→${after}`);
  record(`${label}: footer reachable`, await page.locator(".site-footer").isVisible());
}

const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await desktop.addInitScript(() => {
  window.sessionStorage.setItem("kileni:intro:v4", "1");
  window.localStorage.setItem("kileni-cookie-preferences", JSON.stringify({ essential: true, analytics: false, marketing: false }));
});
const desktopPage = await desktop.newPage();
monitor(desktopPage, "desktop");

await open(desktopPage, "/", "desktop home", 420);
record("desktop home: audit form visible", await desktopPage.locator(".audit-form").isVisible());
record("desktop home: scan visual visible", await desktopPage.locator(".hero-audit-visual").isVisible());
await desktopPage.screenshot({ path: path.join(outputDir, "home-desktop.png"), fullPage: true });
await desktopPage.locator(".signal-hero").screenshot({ path: path.join(outputDir, "hero-desktop.png") });
await desktopPage.getByRole("button", { name: "Услуги", exact: true }).click();
await desktopPage.screenshot({ path: path.join(outputDir, "menu-desktop.png") });

const captures = [
  ["/free-audit", "free-audit.png"],
  ["/pricing", "pricing-desktop.png"],
  ["/cases", "cases-desktop.png"],
  ["/cases/eco-santeh", "case-eco-santeh.png"],
  ["/cases/zasorservice", "case-zasorservice.png"],
  ["/blog", "blog-desktop.png"],
  ["/blog/seo-audit-when-you-need-it", "article-desktop.png"],
  ["/brief", "brief-desktop.png"],
  ["/about", "about-desktop.png"],
  ["/en", "home-en.png"],
];

for (const [route, file] of captures) {
  await open(desktopPage, route, `capture ${route}`, 260);
  await desktopPage.screenshot({ path: path.join(outputDir, file), fullPage: true });
}

if (process.env.DATABASE_PATH) {
  const { createQueuedFixtureAudit, completeFixtureAudit } = await import("../tests/e2e/audit-fixture.ts");
  const audit = createQueuedFixtureAudit();
  await open(desktopPage, `/audit/${audit.publicToken}`, "audit progress", 350);
  await desktopPage.screenshot({ path: path.join(outputDir, "audit-progress.png"), fullPage: true });
  await completeFixtureAudit(audit, 0);
  await desktopPage.reload({ waitUntil: "domcontentloaded" });
  await desktopPage.waitForTimeout(350);
  await desktopPage.screenshot({ path: path.join(outputDir, "audit-result.png"), fullPage: true });
}

await desktopPage.close();
await desktop.close();

const viewports = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 430, height: 932 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
  { width: 320, height: 568 },
];
const routes = ["/", "/seo", "/seo-audit", "/pricing", "/cases", "/blog", "/about", "/brief", "/glossary"];

for (const viewport of viewports) {
  const label = `${viewport.width}x${viewport.height}`;
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: viewport.width <= 768 });
  await context.addInitScript(() => {
    window.sessionStorage.setItem("kileni:intro:v4", "1");
    window.localStorage.setItem("kileni-cookie-preferences", JSON.stringify({ essential: true, analytics: false, marketing: false }));
  });
  const page = await context.newPage();
  monitor(page, label);

  for (const route of routes) {
    await open(page, route, `${label} ${route}`, 140);
    await stableDocumentHeight(page, `${label} ${route}`);
  }

  await open(page, "/", `${label} mobile controls`, 180);
  if (viewport.width <= 1080) {
    const menu = page.getByRole("button", { name: /Открыть меню/u });
    record(`${label}: mobile menu button visible`, await menu.isVisible());
    if (await menu.isVisible()) {
      await menu.click();
      record(`${label}: mobile menu opens`, await page.locator(".mobile-menu").isVisible());
      await page.keyboard.press("Escape");
      record(`${label}: mobile menu closes`, await page.locator(".mobile-menu").isHidden());
    }
  }

  if (viewport.width === 390) {
    await page.screenshot({ path: path.join(outputDir, "home-mobile.png"), fullPage: true });
    await open(page, "/brief", "390x844 brief capture", 200);
    await page.screenshot({ path: path.join(outputDir, "brief-mobile.png"), fullPage: true });
  }

  await page.close();
  await context.close();
}

const matrixViewports = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 320, height: 568 },
];
const themes = ["dark", "signal", "light"];

for (const theme of themes) {
  for (const viewport of matrixViewports) {
    const label = `${theme}-${viewport.width}x${viewport.height}`;
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: viewport.width <= 768 });
    await context.addInitScript(({ selectedTheme }) => {
      window.sessionStorage.setItem("kileni:intro:v4", "1");
      window.localStorage.setItem("kileni:theme:v1", selectedTheme);
      window.localStorage.setItem("kileni-cookie-preferences", JSON.stringify({ essential: true, analytics: false, marketing: false }));
    }, { selectedTheme: theme });
    const page = await context.newPage();
    monitor(page, label);

    for (const route of routes) {
      const slug = route === "/" ? "home" : route.slice(1).replaceAll("/", "-");
      await open(page, route, `${label} ${route}`, 350);
      record(`${label} ${route}: expected theme`, await page.locator("html").getAttribute("data-kileni-theme") === theme);
      await page.screenshot({ path: path.join(matrixDir, `${label}-${slug}.png`) });
    }

    await page.close();
    await context.close();
  }
}

await browser.close();
await writeFile(reportPath, `${JSON.stringify({ baseUrl, checkedAt: new Date().toISOString(), checks, issues }, null, 2)}\n`);

console.log(`Visual QA: ${checks.filter((check) => check.passed).length}/${checks.length} assertions passed`);
console.log(`Report: ${reportPath}`);
if (issues.length) {
  console.error(issues.join("\n"));
  process.exitCode = 1;
}
