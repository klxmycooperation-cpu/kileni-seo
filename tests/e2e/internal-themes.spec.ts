import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences",
      JSON.stringify({ essential: true, analytics: false, marketing: false }),
    );
    window.sessionStorage.setItem("kileni:intro:v3", "1");
  });
});

test("keeps every internal content family in the complete Signal palette", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("kileni:theme:v1", "signal");
  });

  const families = [
    { path: "/blog", selector: ".editorial-page" },
    { path: "/services", selector: ".services-10" },
    { path: "/pricing", selector: ".pricing-redesign" },
    { path: "/cases", selector: ".cases-redesign" },
    { path: "/brief", selector: ".brief-refinement" },
    { path: "/marketplaces", selector: ".marketplace-page" },
    { path: "/glossary", selector: ".glossary-page" },
  ] as const;

  for (const family of families) {
    await page.goto(family.path);

    await expect(page.locator("html"), family.path).toHaveAttribute("data-kileni-theme", "signal");
    const surface = page.locator(family.selector).first();
    await expect(surface, `${family.path} surface`).toHaveCSS("background-color", "rgb(7, 11, 24)");
    await expect(surface, `${family.path} foreground`).toHaveCSS("color", "rgb(245, 247, 255)");
  }
});

test("applies the persisted Dark palette to architecture pages", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("kileni:theme:v1", "dark");
  });

  for (const family of [
    { path: "/marketplaces", selector: ".marketplace-page" },
    { path: "/glossary", selector: ".glossary-page" },
  ] as const) {
    await page.goto(family.path);

    await expect(page.locator("html"), family.path).toHaveAttribute("data-kileni-theme", "dark");
    const surface = page.locator(family.selector).first();
    await expect(surface, `${family.path} surface`).toHaveCSS("background-color", "rgb(7, 17, 31)");
    await expect(surface, `${family.path} foreground`).toHaveCSS("color", "rgb(247, 248, 252)");
  }
});
