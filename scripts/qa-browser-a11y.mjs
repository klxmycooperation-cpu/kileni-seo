import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { chromium, webkit } from "@playwright/test";

const origin = process.env.QA_ORIGIN ?? "https://kileni-seo.ru";
const outputDir = resolve(
  process.cwd(),
  process.env.QA_OUTPUT_DIR
    ?? "docs/user-audit-evidence/kileni-full-audit-2026-09-04/accessibility",
);
const routes = [
  "/",
  "/services",
  "/seo",
  "/pricing",
  "/free-audit",
  "/brief",
  "/cases/eco-santeh",
  "/blog/seo-audit-when-you-need-it",
  "/glossary/lighthouse",
  "/checks/http-status",
  "/about",
  "/contacts",
  "/marketplaces",
];
const engines = [["chromium", chromium], ["webkit", webkit]];
const results = [];

await mkdir(outputDir, { recursive: true });

for (const [browserName, engine] of engines) {
  const browser = await engine.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1_440, height: 900 }, reducedMotion: "no-preference" });
    await context.addInitScript(() => {
      window.localStorage.setItem("kileni:theme:v1", "dark");
      window.localStorage.setItem("kileni-cookie-preferences:v2", JSON.stringify({
        essential: true,
        analytics: false,
        marketing: false,
        version: "2026-08-23.2",
      }));
      window.sessionStorage.setItem("kileni:intro:v9", "1");
    });
    const page = await context.newPage();
    for (const path of routes) {
      const consoleErrors = [];
      const pageErrors = [];
      const onConsole = (message) => { if (message.type() === "error") consoleErrors.push(message.text()); };
      const onPageError = (error) => pageErrors.push(error.message);
      page.on("console", onConsole);
      page.on("pageerror", onPageError);
      const response = await page.goto(new URL(path, origin).href, { waitUntil: "networkidle", timeout: 45_000 });
      const axe = await new AxeBuilder({ page }).analyze();
      const layout = await page.evaluate(() => ({
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        duplicateIds: [...document.querySelectorAll("[id]")]
          .map((element) => element.id)
          .filter((id, index, ids) => id && ids.indexOf(id) !== index),
        unnamedInteractive: [...document.querySelectorAll("a[href],button,input,select,textarea,[role=button]")]
          .filter((element) => {
            const html = element;
            if (html instanceof HTMLInputElement && html.type === "hidden") return false;
            const style = getComputedStyle(html);
            if (style.display === "none" || style.visibility === "hidden") return false;
            const label = html.getAttribute("aria-label")
              || html.getAttribute("title")
              || html.getAttribute("alt")
              || html.textContent?.trim()
              || ("value" in html ? String(html.value ?? "").trim() : "");
            return !label;
          })
          .map((element) => `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${element.className ? `.${String(element.className).trim().replace(/\s+/gu, ".")}` : ""}`),
      }));
      const record = {
        browser: browserName,
        viewport: "1440x900",
        path,
        status: response?.status() ?? null,
        finalUrl: page.url(),
        title: await page.title(),
        axeViolations: axe.violations.map(compactViolation),
        seriousOrCritical: axe.violations.filter((item) => item.impact === "serious" || item.impact === "critical").map(compactViolation),
        layout,
        consoleErrors,
        pageErrors,
      };
      results.push(record);
      console.log(`${browserName} ${path}: ${record.status}, axe=${record.axeViolations.length}, serious=${record.seriousOrCritical.length}, overflow=${layout.overflowX}`);
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
    }
    await page.screenshot({ path: resolve(outputDir, `${browserName}-desktop-last-route.png`), fullPage: false, animations: "disabled" });
    await context.close();

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    await mobile.addInitScript(() => {
      window.localStorage.setItem("kileni:theme:v1", "signal");
      window.localStorage.setItem("kileni-cookie-preferences:v2", JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }));
      window.sessionStorage.setItem("kileni:intro:v9", "1");
    });
    const mobilePage = await mobile.newPage();
    for (const path of ["/", "/services", "/pricing", "/free-audit", "/brief"]) {
      const response = await mobilePage.goto(new URL(path, origin).href, { waitUntil: "networkidle", timeout: 45_000 });
      const axe = await new AxeBuilder({ page: mobilePage }).analyze();
      const layout = await mobilePage.evaluate(() => ({
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      }));
      results.push({
        browser: browserName,
        viewport: "390x844",
        path,
        status: response?.status() ?? null,
        finalUrl: mobilePage.url(),
        axeViolations: axe.violations.map(compactViolation),
        seriousOrCritical: axe.violations.filter((item) => item.impact === "serious" || item.impact === "critical").map(compactViolation),
        layout,
        consoleErrors: [],
        pageErrors: [],
      });
      console.log(`${browserName} mobile ${path}: ${response?.status() ?? "n/a"}, serious=${axe.violations.filter((item) => item.impact === "serious" || item.impact === "critical").length}, overflow=${layout.overflowX}`);
    }
    await mobilePage.goto(new URL("/", origin).href, { waitUntil: "networkidle" });
    const menu = mobilePage.getByRole("button", { name: "Открыть меню" });
    await menu.focus();
    await menu.press("Enter");
    await mobilePage.screenshot({ path: resolve(outputDir, `${browserName}-mobile-drawer-signal-390x844.png`), animations: "disabled" });
    const drawerState = {
      visible: await mobilePage.locator("#mobile-menu").isVisible(),
      focusedInside: await mobilePage.evaluate(() => Boolean(document.activeElement?.closest("#mobile-menu"))),
      overflowX: await mobilePage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    };
    await mobilePage.keyboard.press("Escape");
    drawerState.focusReturned = await menu.evaluate((element) => element === document.activeElement);
    await mobilePage.goto(new URL("/free-audit", origin).href, { waitUntil: "networkidle" });
    const urlField = mobilePage.getByLabel(/адрес сайта/iu).first();
    await urlField.fill("не адрес");
    const submit = mobilePage.getByRole("button", { name: /провер|запустить/iu }).first();
    await submit.click();
    const formErrorState = {
      focusedField: await urlField.evaluate((element) => element === document.activeElement),
      visibleError: await mobilePage.locator('[role="alert"], .form-error, [aria-live="assertive"]').filter({ hasText: /адрес|ссылк|url|сайт/iu }).first().isVisible().catch(() => false),
      valuePreserved: await urlField.inputValue(),
    };
    await mobilePage.screenshot({ path: resolve(outputDir, `${browserName}-free-audit-invalid-mobile.png`), animations: "disabled" });
    await writeFile(resolve(outputDir, `${browserName}-interaction-states.json`), `${JSON.stringify({ drawerState, formErrorState }, null, 2)}\n`, "utf8");
    await mobile.close();
  } finally {
    await browser.close();
  }
}

await writeFile(resolve(outputDir, "axe-results.json"), `${JSON.stringify(results, null, 2)}\n`, "utf8");
await writeFile(resolve(outputDir, "summary.json"), `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  origin,
  scenarios: results.length,
  non200: results.filter((item) => item.status !== 200).map((item) => ({ browser: item.browser, path: item.path, status: item.status })),
  seriousOrCritical: results.flatMap((item) => item.seriousOrCritical.map((violation) => ({ browser: item.browser, path: item.path, ...violation }))),
  horizontalOverflow: results.filter((item) => item.layout.overflowX > 1).map((item) => ({ browser: item.browser, path: item.path, viewport: item.viewport, overflow: item.layout.overflowX })),
  consoleErrors: results.flatMap((item) => item.consoleErrors.map((error) => ({ browser: item.browser, path: item.path, error }))),
  pageErrors: results.flatMap((item) => item.pageErrors.map((error) => ({ browser: item.browser, path: item.path, error }))),
}, null, 2)}\n`, "utf8");

function compactViolation(item) {
  return {
    id: item.id,
    impact: item.impact,
    help: item.help,
    helpUrl: item.helpUrl,
    nodes: item.nodes.map((node) => ({ target: node.target, failureSummary: node.failureSummary })),
  };
}
