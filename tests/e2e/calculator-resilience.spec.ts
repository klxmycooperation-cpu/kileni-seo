import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const evidence = resolve(process.env.QA_EVIDENCE_ROOT ?? "tmp/e2e/final-handoff", "calculator");

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("kileni:intro:v9", "1");
    localStorage.setItem("kileni-cookie-preferences:v2", JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }));
  });
  await page.goto("/calculator");
  await page.getByRole("textbox", { name: "Имя", exact: true }).fill("QA test — do not contact");
  await page.getByRole("textbox", { name: "Телефон или e-mail" }).fill("qa@example.test");
  await page.locator('.estimate-panel input[name="consent"]').check();
});

test("calculator recovers from a lost connection without an uncaught exception", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/calculator", (route) => route.abort("connectionfailed"));
  await page.getByRole("button", { name: "Отправить расчёт" }).click();
  await expect(page.getByRole("status")).toContainText("Не удалось отправить");
  await expect(page.getByRole("button", { name: "Отправить расчёт" })).toBeEnabled();
  await mkdir(evidence, { recursive: true });
  await page.getByRole("status").scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(evidence, `${testInfo.project.name}-network-error.png`) });
  expect(errors).toEqual([]);
});

test("calculator allows only one in-flight submission", async ({ page }, testInfo) => {
  let release!: () => void;
  let requests = 0;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/calculator", async (route) => {
    requests += 1;
    await pending;
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
  });
  const submit = page.getByRole("button", { name: "Отправить расчёт" });
  await submit.click();
  await expect(submit).toBeDisabled();
  await mkdir(evidence, { recursive: true });
  await page.screenshot({ path: resolve(evidence, `${testInfo.project.name}-pending.png`) });
  release();
  await expect(page.getByRole("status")).toContainText("Расчёт сохранён");
  await page.screenshot({ path: resolve(evidence, `${testInfo.project.name}-success.png`) });
  expect(requests).toBe(1);
});
