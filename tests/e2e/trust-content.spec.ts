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
  await expect(page.getByText(/не перечень постоянного штата/u)).toBeVisible();
});

test("does not show editorial provenance or update date on glossary details", async ({ page }) => {
  await page.goto("/glossary/search-crawler");

  await expect(page.locator(".glossary-provenance")).toHaveCount(0);
  await expect(page.getByText("Редакция KILENI", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/^Обновлено:/u)).toHaveCount(0);
});
