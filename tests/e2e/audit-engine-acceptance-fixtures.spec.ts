import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

import { completeAuditRecord, createAuditRecord } from "../../src/db/queries";
import { buildAuditClientPresentation } from "../../src/lib/audit/client-presentation";
import { finalizeAuditResultV4 } from "../../src/lib/audit/finalize-v4";
import { runPublicAudit } from "../../src/lib/audit/public-pipeline";
import { auditPipelineSiteFixtures } from "../fixtures/audit-pipeline-sites";
import { createFixtureFetcher } from "../fixtures/audit-sites";

const evidenceRoot = resolve(
  process.cwd(),
  process.env.QA_EVIDENCE_ROOT ? `${process.env.QA_EVIDENCE_ROOT}/fixtures` : "docs/user-audit-evidence/kileni-full-audit-2026-09-04/fixtures",
);

const fixtures = [
  ["A-landing", "acceptanceLanding"],
  ["B-store", "acceptanceStore"],
  ["C-multilingual", "acceptanceMultilingual"],
] as const;

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1_440, height: 900 });
  await page.addInitScript(() => {
    window.localStorage.setItem("kileni:theme:v1", "dark");
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
    window.sessionStorage.setItem("kileni:intro:v9", "1");
  });
});

test("renders controlled A/B/C fixture reports with API, PDF and admin parity", async ({ page, browserName }) => {
  test.setTimeout(120_000);
  await mkdir(evidenceRoot, { recursive: true });

  const audits: Array<{ label: string; id: string; token: string; expected: Awaited<ReturnType<typeof createCompletedFixture>>["publicResult"] }> = [];
  for (const [label, fixtureName] of fixtures) {
    const completed = await createCompletedFixture(fixtureName);
    audits.push({ label, id: completed.audit.id, token: completed.audit.publicToken, expected: completed.publicResult });

    const apiResponse = await page.request.get(`/api/audits/${completed.audit.publicToken}`);
    expect(apiResponse.ok()).toBe(true);
    const api = await apiResponse.json() as { status: string; result: Record<string, unknown> };
    expect(api.status).toBe("completed");
    const apiResult = api.result as unknown as typeof completed.publicResult;
    expect(apiResult.inventorySummary).toEqual(completed.publicResult.inventorySummary);
    expect(apiResult.selectedPages.map((item) => [item.url, item.pageType, item.selectionReason]))
      .toEqual(completed.publicResult.selectedPages.map((item) => [item.url, item.pageType, item.selectionReason]));
    expect(buildAuditClientPresentation(api.result, "ru"))
      .toEqual(buildAuditClientPresentation(completed.publicResult, "ru"));
    await writeFile(resolve(evidenceRoot, `${label}-${browserName}-api.json`), `${JSON.stringify(api, null, 2)}\n`, "utf8");

    await page.goto(`/audit/${completed.audit.publicToken}`);
    await expect(page.locator(".audit-complete--client")).toBeVisible();
    await expect(page.getByText(`${completed.publicResult.inventorySummary.checked}`, { exact: true }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: resolve(evidenceRoot, `${label}-${browserName}-web.png`), fullPage: true, animations: "disabled" });

    const pdfResponse = await page.request.get(`/api/audits/${completed.audit.publicToken}/report.pdf`);
    expect(pdfResponse.ok()).toBe(true);
    expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");
    await writeFile(resolve(evidenceRoot, `${label}-${browserName}.pdf`), await pdfResponse.body());
  }

  await page.goto("/admin/login");
  await page.getByLabel("Логин").fill("e2e-admin");
  await page.getByLabel("Пароль").fill("Kileni-e2e-password");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page).toHaveURL(/\/admin$/u);

  for (const audit of audits) {
    await page.goto(`/admin/audits/${audit.id}`);
    await expect(page.locator('section[aria-labelledby="audit-client-summary-heading"]')).toBeVisible();
    await expect(page.locator("body")).toContainText(String(audit.expected.inventorySummary.checked));
    await page.screenshot({ path: resolve(evidenceRoot, `${audit.label}-${browserName}-admin.png`), fullPage: true, animations: "disabled" });
  }
});

async function createCompletedFixture(
  name: "acceptanceLanding" | "acceptanceStore" | "acceptanceMultilingual",
) {
  const fixture = auditPipelineSiteFixtures[name];
  const audit = await createAuditRecord({
    originalUrl: fixture.target,
    normalizedDomain: new URL(fixture.target).hostname,
    locale: "ru",
    name: `QA fixture ${name}`,
    contact: "fixture@example.test",
    contactType: "email",
    ipHash: `qa-fixture-${name}`,
    userAgentHash: "qa-fixture-browser",
    source: "playwright-controlled-fixture",
    consentVersion: "2026-08-15",
    qaLabel: `controlled-${name}`,
  });
  const run = await runPublicAudit(fixture.target, {
    fetcher: createFixtureFetcher(fixture),
    maxPages: 10,
    now: () => new Date("2026-09-04T12:00:00.000Z"),
  });
  const finalized = finalizeAuditResultV4({
    auditId: audit.publicToken,
    createdAt: new Date(audit.createdAt).toISOString(),
    result: run,
  });
  await completeAuditRecord(audit.id, {
    publicResult: finalized.publicResult as unknown as Record<string, unknown>,
    fullResult: finalized.fullResult as unknown as Record<string, unknown>,
    score: null,
    grade: null,
    partial: finalized.partial,
    pagesDiscovered: finalized.publicResult.pagesDiscovered,
    pagesChecked: finalized.publicResult.pagesChecked,
  });
  return { audit, publicResult: finalized.publicResult };
}
