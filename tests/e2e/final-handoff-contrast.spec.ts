import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { completeAuditRecord } from "../../src/db/queries";
import { createQueuedFixtureAudit } from "./audit-fixture";
import { auditClientReportSnapshot } from "../unit/fixtures/audit-client-report-snapshot";

const evidence = resolve(process.env.QA_EVIDENCE_ROOT ?? "tmp/e2e/final-handoff", "contrast");
for (const theme of ["dark", "light"]) {
  test(`calculator consent is readable after scrolling in ${theme}`, async ({ page }, testInfo) => {
    await mkdir(evidence, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript((theme) => {
      localStorage.setItem("kileni:theme:v1", theme);
      sessionStorage.setItem("kileni:intro:v9", "1");
      localStorage.setItem("kileni-cookie-preferences:v2", JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }));
    }, theme);
    await page.goto("/calculator");
    const consent = page.locator(".estimate-panel .check-field");
    await expect(consent).toBeVisible();
    await consent.evaluate((element) => element.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(1_200);
    await page.screenshot({ path: resolve(evidence, `${testInfo.project.name}-${theme}-calculator-consent.png`) });
    const contrast = await page.locator(".estimate-panel").evaluate((panel) => {
      const span = panel.querySelector(".check-field > span")!;
      const luminance = (color: string) => {
        const [r, g, b] = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((channel) => {
          const value = channel / 255;
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
        return r * 0.2126 + g * 0.7152 + b * 0.0722;
      };
      const foreground = luminance(getComputedStyle(span).color);
      const background = luminance(getComputedStyle(panel).backgroundColor);
      return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
    });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
    const result = await new AxeBuilder({ page }).include(".estimate-panel .check-field").withRules(["color-contrast"]).analyze();
    expect(result.violations).toEqual([]);
  });
  test(`secondary public templates and admin login are accessible in ${theme}`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await mkdir(evidence, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript((theme) => {
      localStorage.setItem("kileni:theme:v1", theme);
      sessionStorage.setItem("kileni:intro:v9", "1");
      localStorage.setItem("kileni-cookie-preferences:v2", JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }));
    }, theme);
    for (const path of ["/marketplaces/wildberries", "/custom-task", "/checks", "/calculator", "/brief", "/admin/login"]) {
      await page.goto(path);
      await page.waitForTimeout(1_200);
      await page.screenshot({ path: resolve(evidence, `${testInfo.project.name}-${theme}-${path.replaceAll("/", "_")}.png`), fullPage: true });
      const result = await new AxeBuilder({ page }).analyze();
      expect.soft(result.violations.filter((v) => ["critical", "serious"].includes(v.impact ?? "")), path).toEqual([]);
    }
  });
  test(`public breadcrumbs and compact contacts remain readable in ${theme}`, async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await mkdir(evidence, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript((theme) => {
      localStorage.setItem("kileni:theme:v1", theme);
      sessionStorage.setItem("kileni:intro:v9", "1");
      localStorage.setItem("kileni-cookie-preferences:v2", JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }));
    }, theme);
    for (const [path, selector] of [["/marketplaces", ".breadcrumbs"], ["/about", ".public-contact-links--compact"]]) {
      await page.goto(path);
      const target = page.locator(`main ${selector}`).first();
      await expect(target).toBeVisible();
      await target.evaluate((element) => element.scrollIntoView({ block: "center" }));
      await page.waitForTimeout(1_200);
      await page.screenshot({ path: resolve(evidence, `${testInfo.project.name}-${theme}-${path.slice(1)}.png`) });
      const result = await new AxeBuilder({ page }).include(`main ${selector}`).withRules(["color-contrast"]).analyze();
      expect.soft(result.violations, path).toEqual([]);
    }
  });

  test(`empty findings, report headings and expanded URLs remain readable in ${theme}`, async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await mkdir(evidence, { recursive: true });
    await page.addInitScript((theme) => localStorage.setItem("kileni:theme:v1", theme), theme);
    const audit = await createQueuedFixtureAudit();
    const original = auditClientReportSnapshot();
    // Reproduce the real preview outcome: an optional improvement but no warning.
    const snapshot = { ...original, findings: original.findings.filter((f) => f.checkId !== "performance"), checks: original.checks.filter((c) => c.checkId !== "performance") };
    await completeAuditRecord(audit.id, { publicResult: snapshot, fullResult: { publicResult: snapshot }, score: null, grade: null, partial: false, pagesDiscovered: 100, pagesChecked: 10 });
    await page.goto(`/audit/${audit.publicToken}`);
    await expect(page.locator(".audit-complete--client")).toBeVisible();
    await page.waitForTimeout(1_200);
    await page.screenshot({ path: resolve(evidence, `${testInfo.project.name}-${theme}-report-first.png`) });
    const cards = page.locator(".audit-page-card");
    for (const card of await cards.all()) await card.locator(":scope > summary").click();
    const result = await new AxeBuilder({ page }).include("main").withRules(["color-contrast"]).analyze();
    await page.screenshot({ path: resolve(evidence, `${testInfo.project.name}-${theme}-report-full.png`), fullPage: true });
    expect(result.violations).toEqual([]);
  });
}
