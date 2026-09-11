import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
  });
});

test("explains project responsibility without presenting a fictional permanent team", async ({ page }) => {
  await page.goto("/about");

  await expect(page.getByText(/До начала работ называем ответственного за проект/u)).toBeVisible();
  await expect(page.getByText(/не перечень постоянных сотрудников/u)).toBeVisible();
});

test("shows editorial provenance and update date on a glossary detail", async ({ page }) => {
  await page.goto("/glossary/search-crawler");

  const provenance = page.locator(".glossary-provenance");
  await expect(provenance).toContainText("Редакция KILENI");
  await expect(provenance).toContainText(/Обновлено:\s+\d{1,2}\s+\p{L}+\s+2026/iu);
});
