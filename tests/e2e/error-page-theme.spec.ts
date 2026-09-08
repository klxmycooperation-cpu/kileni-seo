import { expect, test } from "@playwright/test";

for (const theme of ["signal", "light"] as const) {
  test(`keeps the persisted ${theme} theme on the generic 404 page`, async ({ page }) => {
    await page.addInitScript((storedTheme) => {
      window.localStorage.setItem("kileni:theme:v1", storedTheme);
    }, theme);

    const response = await page.goto(`/missing-release-gate-${theme}`);

    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "Страница не найдена" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", theme);
  });
}
