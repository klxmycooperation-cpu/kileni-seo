import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chromium, webkit, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

// Replay a captured immutable production result on the isolated local candidate.
// This proves rendering parity; it is not a new worker audit or production login.
await import("../playwright.config");
const { createAuditRecord, completeAuditRecord } = await import("../src/db/queries");
const out = resolve("docs/user-audit-evidence/final-handoff");
const origin = "http://localhost:64231";
if (process.env.APP_BASE_URL !== origin || process.env.TURSO_DATABASE_URL) throw Error("Local isolated QA only");
const captured = await readFile(resolve(out, "pdf/production-api.json"), "utf8");
const source = JSON.parse(captured);
const audit = await createAuditRecord({ originalUrl: "https://kileni-seo.ru/", normalizedDomain: "kileni-seo.ru", locale: "ru", name: "QA snapshot replay — not a new audit", contact: "", contactType: "none", ipHash: "final-handoff-qa", userAgentHash: "final-handoff-qa", source: "playwright-final-handoff-replay", consentVersion: "2026-08-15" });
await completeAuditRecord(audit.id, { publicResult: source.result, fullResult: { publicResult: source.result }, score: null, grade: null, partial: false, pagesDiscovered: source.pagesDiscovered, pagesChecked: source.pagesChecked });
await mkdir(resolve(out, "admin"), { recursive: true });
const normalize = (text: string) => text.normalize("NFKC").replace(/\s+/gu, "");
const presentation = source.result.clientPresentationByLocale.ru;
const labels: string[] = [presentation.summary.scopeLabel, presentation.summary.checkedLabel,
  ...presentation.exclusions.map((entry: {label: string}) => entry.label),
  ...presentation.pages.flatMap((entry: {url: string; typeLabel: string; selectionReason: string}) => [entry.url, entry.typeLabel, entry.selectionReason]),
  ...presentation.issues.flatMap((entry: {title: string; whatFound: string; whyImportant: string; nextStep: string}) => [entry.title, entry.whatFound, entry.whyImportant, entry.nextStep])];
const results = [];
for (const [engine, launcher] of [["chromium", chromium], ["webkit", webkit]] as const) {
  const browser = await launcher.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block", reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`${page.url()}: ${error.stack || error.message}`));
  try {
    await page.goto(`${origin}/audit/${audit.publicToken}`);
    await expect(page.locator(".audit-complete--client")).toBeVisible();
    const details = page.locator("details");
    for (let i = 0; i < await details.count(); i++) {
      const detail = details.nth(i), summary = detail.locator(":scope > summary");
      if (await summary.isVisible() && await detail.getAttribute("open") === null) await summary.click();
    }
    const webText = await page.locator("main").innerText();
    await writeFile(resolve(out, `pdf/candidate-${engine}-web.txt`), webText);
    await page.screenshot({ path: resolve(out, `screenshots/candidate-${engine}-report.png`), fullPage: true });
    const api = await (await context.request.get(`${origin}/api/audits/${audit.publicToken}`)).json();
    expect(api.result.clientPresentationByLocale.ru).toEqual(presentation);
    const pdfResponse = await context.request.get(`${origin}/api/audits/${audit.publicToken}/report.pdf`);
    expect(pdfResponse.status()).toBe(200);
    const pdfPath = resolve(out, `pdf/candidate-${engine}-report.pdf`);
    const bytes = await pdfResponse.body(); await writeFile(pdfPath, bytes);
    const pdfPages = (await PDFDocument.load(bytes)).getPageCount();
    expect(pdfPages).toBe(2);
    const { stdout: pdfText } = await promisify(execFile)("pdftotext", ["-layout", pdfPath, "-"]);
    await writeFile(resolve(out, `pdf/candidate-${engine}-report.txt`), pdfText);
    await page.goto(`${origin}/admin/login`);
    await page.getByLabel("Логин").fill("e2e-admin");
    await page.getByLabel("Пароль").fill("Kileni-e2e-password");
    await page.getByRole("button", { name: "Войти" }).click();
    await expect(page).toHaveURL(`${origin}/admin`);
    await page.goto(`${origin}/admin/audits/${audit.id}`);
    await expect(page.getByRole("heading", { name: "Клиентский итог и рекомендации" })).toBeVisible();
    await page.getByLabel("Тестовая запись (QA)").check();
    await page.getByLabel("Метка QA").fill("Final handoff · snapshot replay");
    const note = `Final handoff ${engine}: проверено отображение неизменённого snapshot; не клиентская заявка.`;
    await page.getByLabel("Новая заметка").fill(note);
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("Сохранено");
    // Wait for the actual server-rendered note, not just the local success
    // message; otherwise reload cancels the in-flight router.refresh request.
    await expect(page.locator(".admin-notes")).toContainText(note);
    await page.reload();
    await expect(page.locator(".admin-notes")).toContainText(note);
    await expect(page.getByLabel("Тестовая запись (QA)")).toBeChecked();
    const adminText = await page.locator("main").innerText();
    await writeFile(resolve(out, `admin/candidate-${engine}.txt`), adminText);
    await page.locator('#audit-client-summary-heading').scrollIntoViewIfNeeded();
    await page.screenshot({ path: resolve(out, `admin/candidate-${engine}.png`), fullPage: true });
    const exportResponse = await context.request.get(`${origin}/api/admin/audits/${audit.id}/export`);
    expect(exportResponse.status()).toBe(200);
    await writeFile(resolve(out, `admin/candidate-${engine}-export.json`), await exportResponse.text());
    const labelDiff = labels.map(label => ({ label, web: normalize(webText).includes(normalize(label)), pdf: normalize(pdfText).includes(normalize(label)), admin: normalize(adminText).includes(normalize(label)) }));
    const row = { engine, origin, auditId: audit.id, token: audit.publicToken, sourceSnapshotSha256: createHash("sha256").update(captured).digest("hex"), source: "captured production snapshot replay; no new crawl", adminQaLabelAndNotePersisted: true, pdfPages, summary: presentation.summary, labelDiff, errors, verdict: labelDiff.every(r=>r.web&&r.pdf&&r.admin)&&!errors.length?"PASS":"FAIL" };
    results.push(row);
    console.log(engine, row.verdict, labelDiff.filter(r=>!r.web||!r.pdf||!r.admin));
  } finally { await context.close(); await browser.close(); }
}
await writeFile(resolve(out, "displayed-label-parity.json"), JSON.stringify(results, null, 2));
