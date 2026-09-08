import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { chromium, webkit } from "@playwright/test";

const origin = process.env.QA_ORIGIN ?? "https://kileni-preview.72-56-249-36.sslip.io";
const outputDirectory = resolve(
  process.cwd(),
  process.env.QA_OUTPUT_DIR
    ?? "docs/user-audit-evidence/kileni-full-audit-2026-09-04/contrast-final",
);
const routes = [
  { name: "home", path: "/", target: "button[aria-controls] > span" },
  { name: "services", path: "/services", target: "#services-tab-seo > span" },
  { name: "seo", path: "/seo", target: ".seo-hub__hero > .breadcrumbs" },
  { name: "pricing", path: "/pricing", target: ".cp-package-brief" },
  { name: "glossary", path: "/glossary/lighthouse", target: ".glossary-page > .breadcrumbs" },
  { name: "check", path: "/checks/http-status", target: ".glossary-page > .breadcrumbs" },
  { name: "contacts", path: "/contacts", target: "form input:not([type=hidden])" },
] ;
const themes = ["dark", "signal", "light"];
const viewports = [
  { name: "desktop-1440x900", width: 1_440, height: 900 },
  { name: "mobile-390x844", width: 390, height: 844 },
] ;
const engines = [["chromium", chromium], ["webkit", webkit]];
const results = [];

await mkdir(outputDirectory, { recursive: true });

for (const [browserName, engine] of engines) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const viewport of viewports) {
      for (const theme of themes) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          reducedMotion: "reduce",
        });
        await context.addInitScript((selectedTheme) => {
          window.localStorage.setItem("kileni:theme:v1", selectedTheme);
          window.localStorage.setItem("kileni-cookie-preferences:v2", JSON.stringify({
            essential: true,
            analytics: false,
            marketing: false,
            version: "2026-08-23.2",
          }));
          window.sessionStorage.setItem("kileni:intro:v9", "1");
        }, theme);
        const page = await context.newPage();
        for (const route of routes) {
          const response = await page.goto(new URL(route.path, origin).href, {
            waitUntil: "domcontentloaded",
            timeout: 45_000,
          });
          await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
          const candidates = page.locator(route.target);
          let target = null;
          for (let index = 0; index < await candidates.count(); index += 1) {
            if (await candidates.nth(index).isVisible()) {
              target = candidates.nth(index);
              break;
            }
          }
          const targetFound = target !== null;
          if (target) await target.scrollIntoViewIfNeeded({ timeout: 5_000 });
          const axe = await new AxeBuilder({ page }).analyze();
          const seriousOrCritical = axe.violations
            .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
            .map(compactViolation);
          const overflowX = await page.evaluate(() => (
            document.documentElement.scrollWidth - document.documentElement.clientWidth
          ));
          const screenshotName = `${route.name}-${browserName}-${theme}-${viewport.name}.png`;
          const record = {
            browser: browserName,
            viewport: viewport.name,
            theme,
            path: route.path,
            status: response?.status() ?? null,
            targetFound,
            seriousOrCritical,
            overflowX,
            screenshot: screenshotName,
          };
          results.push(record);
          await page.screenshot({
            path: resolve(outputDirectory, screenshotName),
            animations: "disabled",
          });
          console.log(`${browserName} ${viewport.name} ${theme} ${route.path}: status=${record.status} serious=${seriousOrCritical.length} overflow=${overflowX}`);
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  origin,
  scenarios: results.length,
  seriousOrCritical: results.flatMap((result) => result.seriousOrCritical.map((violation) => ({
    browser: result.browser,
    viewport: result.viewport,
    theme: result.theme,
    path: result.path,
    ...violation,
  }))),
  non200: results.filter((result) => result.status !== 200),
  horizontalOverflow: results.filter((result) => result.overflowX > 1),
  missingTargets: results.filter((result) => !result.targetFound),
  screenshots: results.map((result) => result.screenshot),
};
await writeFile(resolve(outputDirectory, "results.json"), `${JSON.stringify(results, null, 2)}\n`, "utf8");
await writeFile(resolve(outputDirectory, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
if (summary.seriousOrCritical.length > 0 || summary.non200.length > 0 || summary.horizontalOverflow.length > 0 || summary.missingTargets.length > 0) {
  process.exitCode = 1;
}

function compactViolation(violation) {
  return {
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map((node) => ({ target: node.target, failureSummary: node.failureSummary })),
  };
}
