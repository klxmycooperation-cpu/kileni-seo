import { expect, test } from "@playwright/test";
import { database } from "../../src/db/client";

test("lead form recovers from a lost response and preserves entered data", async ({ page }, testInfo) => {
  const contact = `qa-${testInfo.project.name}@example.test`;
  await page.goto("/contacts");
  await page.getByRole("button", { name: "Только необходимые", exact: true }).click();
  const submit = page.getByRole("button", { name: "Отправить заявку" });
  await expect(submit).toBeEnabled();
  await page.getByRole("textbox", { name: "Имя", exact: true }).fill("QA local test");
  await page.getByRole("textbox", { name: "Телефон или e-mail" }).fill(contact);
  await page.locator('.lead-form input[name="consent"]').check();
  await page.route("**/api/leads", (route) => route.abort("connectionfailed"));
  await submit.click();
  await expect(page.getByRole("status")).toContainText("Не удалось получить ответ");
  await expect(submit).toBeEnabled();
  await expect(page.getByRole("textbox", { name: "Имя", exact: true })).toHaveValue("QA local test");
  await page.screenshot({ path: testInfo.outputPath("lead-network-error.png") });
  await page.unroute("**/api/leads");
  const savedResponse = page.waitForResponse((response) => response.url().endsWith("/api/leads") && response.request().method() === "POST");
  await submit.click();
  expect((await savedResponse).status()).toBe(201);
  await expect(page.getByRole("status")).toContainText("Заявка сохранена");
  const saved = await database.execute({ sql: "SELECT id FROM leads WHERE contact=?", args: [contact] });
  expect(saved.rows).toHaveLength(1);
  await page.getByRole("status").evaluate((element) => element.scrollIntoView({ block: "center" }));
  await page.screenshot({ path: testInfo.outputPath("lead-retry-success.png") });
});

test("calculator saves a completed form in the admin database", async ({ page }, testInfo) => {
  const contact = `calculator-${testInfo.project.name}@example.test`;
  await page.goto("/calculator");
  await page.getByRole("button", { name: "Только необходимые", exact: true }).click();
  const submit = page.getByRole("button", { name: "Отправить расчёт" });
  await expect(submit).toBeEnabled();
  await page.locator('.estimate-panel input[name="name"]').fill("QA calculator");
  await page.locator('.estimate-panel input[name="contact"]').fill(contact);
  await page.locator('.estimate-panel input[name="consent"]').check();
  await submit.click();
  await expect(page.getByRole("status")).toContainText("Расчёт сохранён");
  const saved = await database.execute({
    sql: "SELECT c.id FROM calculator_requests c JOIN leads l ON l.id=c.lead_id WHERE l.contact=?",
    args: [contact],
  });
  expect(saved.rows).toHaveLength(1);
  await page.getByRole("status").evaluate((element) => element.scrollIntoView({ block: "center" }));
  await page.screenshot({ path: testInfo.outputPath("calculator-saved.png") });
});

test("audit form creates an audit visible to admin", async ({ page }, testInfo) => {
  const site = testInfo.project.name === "webkit" ? "https://icann.org" : "https://iana.org";
  await page.goto("/free-audit");
  await page.getByRole("button", { name: "Только необходимые", exact: true }).click();
  await page.getByLabel("Адрес сайта").fill(site);
  await page.getByRole("button", { name: "Проверить сайт бесплатно" }).click();
  await expect(page.getByLabel("Email (необязательно)")).toBeVisible();
  await page.getByLabel(/Я имею отношение к сайту/u).check();
  await page.getByRole("button", { name: "Запустить проверку" }).click();
  await expect(page).toHaveURL(/\/audit\/[A-Za-z0-9_-]{43}$/u);
  const token = new URL(page.url()).pathname.split("/").at(-1)!;
  const saved = await database.execute({ sql: "SELECT id FROM audits WHERE public_token=?", args: [token] });
  expect(saved.rows).toHaveLength(1);
  await page.screenshot({ path: testInfo.outputPath("audit-created.png") });
});
