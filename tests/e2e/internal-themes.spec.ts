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

test("keeps every internal content family aligned in both public palettes", async ({ page }) => {
  test.setTimeout(90_000);
  const families = [
    { path: "/blog", selector: ".editorial-page" },
    { path: "/services", selector: ".services-10" },
    { path: "/pricing", selector: ".pricing-redesign" },
    { path: "/cases", selector: ".cases-redesign" },
    { path: "/brief", selector: ".brief-refinement" },
    { path: "/marketplaces", selector: ".marketplace-page" },
    { path: "/glossary", selector: ".glossary-page" },
  ] as const;

  await page.goto("/");
  for (const theme of ["dark", "light"] as const) {
    await page.evaluate((palette) => {
      window.localStorage.setItem("kileni:theme:v1", palette);
    }, theme);

    for (const family of families) {
      await page.goto(family.path);

      await expect(page.locator("html"), `${theme}: ${family.path}`).toHaveAttribute("data-kileni-theme", theme);
      const surface = page.locator(family.selector).first();
      await expect(surface, `${theme}: ${family.path} keeps the route surface seamless`).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await expect(surface, `${theme}: ${family.path} has a visible foreground`).not.toHaveCSS("color", "rgba(0, 0, 0, 0)");
      await expect(page.locator(".site-tracing-beam__content"), `${theme}: ${family.path} route canvas`).not.toHaveCSS("background-image", "none");
    }
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
    await expect(surface, `${family.path} keeps the route surface seamless`).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(surface, `${family.path} foreground`).toHaveCSS("color", "rgb(247, 248, 252)");
    await expect(page.locator(".site-tracing-beam__content"), `${family.path} route canvas`).not.toHaveCSS("background-image", "none");
  }
});

test("keeps the light home hero's supporting copy readable", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("kileni:theme:v1", "light");
  });

  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "light");
  await expect(page.locator(".hero-free-audit-usage")).toHaveCSS("color", "rgb(89, 97, 121)");
  await expect(page.locator(".hero-free-audit-usage strong")).toHaveCSS("color", "rgb(24, 35, 59)");
  await expect(page.locator(".analytics-demo-caption")).toHaveCSS("color", "rgb(98, 114, 141)");
});

test("cycles the public themes between Dark and Light", async ({ page }) => {
  await page.goto("/");

  const toggle = page.locator(".site-header .theme-toggle:not(.theme-toggle--mobile)");
  await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "dark");
  await expect(toggle).toHaveAttribute("aria-label", "Включить светлую тему");

  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "light");
  await expect(toggle).toHaveAttribute("aria-label", "Включить тёмную тему");

  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-kileni-theme", "dark");
});

test("defines the required semantic tokens in every public palette", async ({ page }) => {
  const themes = ["dark", "light"] as const;
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

  await page.goto("/");
  for (const theme of themes) {
    await page.evaluate((palette) => {
      window.localStorage.setItem("kileni:theme:v1", palette);
    }, theme);
    await page.reload();

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
    const colorOf = (selector: string) => getComputedStyle(document.querySelector(selector)!).color;
    const backgroundOf = (selector: string) => getComputedStyle(document.querySelector(selector)!).backgroundColor;
    return {
      deliverables: backgroundOf(".home-deliverables") === "rgba(0, 0, 0, 0)",
      heading: colorOf(".home-deliverables h2") === colorFor("--text-primary"),
      directionNumber: colorOf(".home-direction-list > a > span") === colorFor("--text-muted"),
      directionBorder: getComputedStyle(document.querySelector(".home-direction-list > a")!).borderTopColor !== "rgba(0, 0, 0, 0)",
      surface: backgroundOf(".home-directions") === "rgba(0, 0, 0, 0)",
      routeCanvas: getComputedStyle(document.querySelector(".site-tracing-beam__content")!).backgroundImage !== "none",
      hasPrimary: styles.getPropertyValue("--text-primary").trim().length > 0,
    };
  });

  expect(matchesTokens).toEqual({
    deliverables: true,
    heading: true,
    directionNumber: true,
    directionBorder: true,
    surface: true,
    routeCanvas: true,
    hasPrimary: true,
  });
});
