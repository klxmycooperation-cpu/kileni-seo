import { expect, test } from "@playwright/test";

test("keeps the admin shell and form controls usable on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/login");

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
  const report = await page.locator(".admin-login-form").evaluate((form) => {
    const controls = [...form.querySelectorAll<HTMLElement>("input, button")];
    return controls.map((element) => ({
      height: element.getBoundingClientRect().height,
      fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
      tagName: element.tagName,
      label: element.getAttribute("name") || element.textContent?.trim() || element.tagName.toLowerCase(),
    }));
  });
  expect(report.filter((control) => control.height < 43.5), "admin login tap targets").toEqual([]);
  expect(report.filter((control) => control.tagName !== "BUTTON" && control.fontSize < 16), "admin login text must not trigger iOS zoom").toEqual([]);
});

test("protects the unified request center and keeps its controls usable on mobile", async ({ page }) => {
  await page.goto("/admin/requests");
  await expect(page).toHaveURL(/\/admin\/login$/u);

  await page.getByLabel("Логин").fill("e2e-admin");
  await page.getByLabel("Пароль").fill("Kileni-e2e-password");
  await page.getByRole("button", { name: "Войти" }).click();
  // The first admin POST is compiled on demand in local dev and can take
  // longer than the suite-wide assertion timeout on a cold server.
  await expect(page).toHaveURL(/\/admin$/u, { timeout: 20_000 });

  await page.goto("/admin/requests");
  await expect(page.getByRole("heading", { name: "Все обращения" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Администрирование" }).getByRole("link", { name: /Обращения/u })).toBeVisible();
  await expect(page.getByRole("form", { name: "Фильтры обращений" })).toBeVisible();

  for (const viewport of [
    { width: 320, height: 720 },
    { width: 390, height: 844 },
    { width: 768, height: 1_024 },
    { width: 1_024, height: 768 },
    { width: 1_440, height: 900 },
    { width: 1_920, height: 1_080 },
  ]) {
    await page.setViewportSize(viewport);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Все обращения" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `admin requests at ${viewport.width}px`).toBeLessThanOrEqual(viewport.width + 1);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const mobileControls = await page.evaluate(() => {
    const visible = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const compact = [...document.querySelectorAll<HTMLElement>(".admin-shell button, .admin-shell input, .admin-shell select, .admin-shell textarea")]
      .filter((element) => visible(element) && !element.matches("input[type='checkbox'], input[type='radio']"))
      .filter((element) => element.getBoundingClientRect().height < 43.5)
      .map((element) => element.getAttribute("aria-label") || element.textContent?.trim() || element.tagName.toLowerCase());
    const smallText = [...document.querySelectorAll<HTMLElement>(".admin-shell input, .admin-shell select, .admin-shell textarea")]
      .filter(visible)
      .filter((element) => Number.parseFloat(getComputedStyle(element).fontSize) < 16)
      .map((element) => element.getAttribute("name") || element.tagName.toLowerCase());
    return { compact, smallText };
  });
  expect(mobileControls.compact).toEqual([]);
  expect(mobileControls.smallText).toEqual([]);
  await page.screenshot({ path: test.info().outputPath("admin-requests-mobile.png"), fullPage: true });
});
