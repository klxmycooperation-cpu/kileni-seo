import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
    window.sessionStorage.setItem("kileni:intro:v9", "1");
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
    await expect(surface, `${family.path} surface`).toHaveCSS("background-color", "rgb(8, 21, 15)");
    await expect(surface, `${family.path} foreground`).toHaveCSS("color", "rgb(243, 255, 246)");
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

test("keeps the light home hero's supporting copy readable", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("kileni:theme:v1", "light");
  });

  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "light");
  await expect(page.locator(".hero-free-audit-usage")).toHaveCSS("color", "rgb(75, 89, 112)");
  await expect(page.locator(".hero-free-audit-usage strong")).toHaveCSS("color", "rgb(16, 23, 34)");
  await expect(page.locator(".analytics-demo-caption")).toHaveCSS("color", "rgb(89, 97, 121)");
});

test("cycles the public themes in the approved Dark to Signal to Light order", async ({ page }) => {
  await page.goto("/");

  const toggle = page.locator(".site-header .theme-toggle:not(.theme-toggle--mobile)");
  await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "dark");
  await expect(toggle).toHaveAttribute("aria-label", "Включить сигнальную тему");

  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "signal");
  await expect(toggle).toHaveAttribute("aria-label", "Включить светлую тему");

  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "light");
  await expect(toggle).toHaveAttribute("aria-label", "Включить тёмную тему");

  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "dark");
});

test("defines the required semantic tokens in every public palette", async ({ page }) => {
  const themes = ["dark", "signal", "light"] as const;
  const tokens = [
    "--background",
    "--background-elevated",
    "--surface",
    "--surface-hover",
    "--surface-selected",
    "--text-primary",
    "--text-secondary",
    "--text-muted",
    "--text-inverse",
    "--border",
    "--border-strong",
    "--brand",
    "--brand-contrast",
    "--success",
    "--warning",
    "--danger",
    "--focus",
  ] as const;

  for (const theme of themes) {
    await page.addInitScript((palette) => {
      window.localStorage.setItem("kileni:theme:v1", palette);
    }, theme);
    await page.goto("/");

    await expect(page.locator("html"), theme).toHaveAttribute("data-kileni-theme", theme);
    const values = await page.locator(".kileni-site").evaluate((element, names) => {
      const styles = getComputedStyle(element);
      return names.map((name) => styles.getPropertyValue(name).trim());
    }, tokens);
    expect(values, theme).not.toContain("");
  }
});

test("uses semantic colors for the key light-theme home sections", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("kileni:theme:v1", "light");
  });
  await page.goto("/");

  const matchesTokens = await page.locator(".kileni-site").evaluate((site) => {
    const styles = getComputedStyle(site);
    const colorFor = (token: string) => {
      const probe = document.createElement("span");
      probe.style.color = `var(${token})`;
      site.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    };
    const backgroundFor = (token: string) => {
      const probe = document.createElement("span");
      probe.style.backgroundColor = `var(${token})`;
      site.append(probe);
      const color = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return color;
    };
    const colorOf = (selector: string) => getComputedStyle(document.querySelector(selector)!).color;
    const backgroundOf = (selector: string) => getComputedStyle(document.querySelector(selector)!).backgroundColor;
    return {
      deliverables: backgroundOf(".home-deliverables") === backgroundFor("--background-elevated"),
      heading: colorOf(".home-deliverables h2") === colorFor("--text-primary"),
      directionNumber: colorOf(".home-direction-list > a > span") === colorFor("--text-muted"),
      directionBorder: getComputedStyle(document.querySelector(".home-direction-list > a")!).borderTopColor === colorFor("--border"),
      surface: backgroundOf(".home-directions") === backgroundFor("--surface"),
      hasPrimary: styles.getPropertyValue("--text-primary").trim().length > 0,
    };
  });

  expect(matchesTokens).toEqual({
    deliverables: true,
    heading: true,
    directionNumber: true,
    directionBorder: true,
    surface: true,
    hasPrimary: true,
  });
});
