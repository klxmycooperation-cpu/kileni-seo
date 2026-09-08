import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const themes = ["dark", "signal", "light"] as const;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("kileni:intro:v9", "1");
    window.localStorage.setItem(
      "kileni-cookie-preferences:v2",
      JSON.stringify({ essential: true, analytics: false, marketing: false, version: "2026-08-23.2" }),
    );
  });
});

async function readButtonColors(page: Page, selector: string) {
  return page.locator(selector).evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, color: style.color };
  });
}

test("keeps public H1 roles inside 320 pixels at 200 percent text", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  const routes = ["/", "/services", "/seo-audit", "/pricing", "/brief", "/glossary", "/free-audit", "/about", "/marketplaces"];

  for (const route of routes) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.addStyleTag({ content: "html { font-size: 32px !important; }" });
    const title = page.locator("main h1").first();
    await expect(title, `${route} must have a visible H1`).toBeVisible();

    const layout = await title.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        roleSize: style.getPropertyValue("--h1-role-size").trim(),
        pageWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        left: rect.left,
        right: rect.right,
        titleFits: element.scrollWidth <= element.clientWidth + 1,
      };
    });

    expect(layout.roleSize, `${route} must resolve an H1 role token`).not.toBe("");
    expect(layout.pageWidth, `${route} must not create horizontal page scroll`).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.left, `${route} H1 must start inside the viewport`).toBeGreaterThanOrEqual(-1);
    expect(layout.right, `${route} H1 must end inside the viewport`).toBeLessThanOrEqual(321);
    expect(layout.titleFits, `${route} H1 must wrap inside its own box`).toBe(true);
  }
});

for (const theme of themes) {
  test(`keeps CTA normal, hover, active and disabled states distinct in ${theme}`, async ({ page }) => {
    await page.addInitScript((value) => window.localStorage.setItem("kileni:theme:v1", value), theme);
    await page.goto("/");
    await page.addStyleTag({ content: ".button { transition: none !important; }" });

    const selector = ".site-header .header-cta";
    const button = page.locator(selector);
    await expect(button).toBeVisible();
    await expect(button).toHaveCSS("cursor", "pointer");

    const tokens = await button.evaluate((element) => {
      const style = getComputedStyle(element);
      const resolveColor = (name: string) => {
        const probe = document.createElement("span");
        probe.style.color = style.getPropertyValue(name).trim();
        document.body.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      };
      return {
        normal: resolveColor("--cta-primary-bg"),
        hover: resolveColor("--cta-primary-hover-bg"),
        active: resolveColor("--cta-primary-active-bg"),
        disabled: resolveColor("--cta-primary-disabled-bg"),
      };
    });
    expect(Object.values(tokens).every(Boolean)).toBe(true);

    const normal = await readButtonColors(page, selector);
    expect(normal.background).toBe(tokens.normal);
    await button.evaluate((element) => element.addEventListener("click", (event) => event.preventDefault(), { once: true }));
    await button.hover();
    await expect(button).toHaveCSS("background-color", tokens.hover);
    const hover = await readButtonColors(page, selector);
    const box = await button.boundingBox();
    if (!box) throw new Error("CTA has no layout box");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect(button).toHaveCSS("background-color", tokens.active);
    const active = await readButtonColors(page, selector);
    await page.mouse.up();
    const disabled = await button.evaluate((element) => {
      element.setAttribute("aria-disabled", "true");
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, color: style.color, cursor: style.cursor };
    });

    expect(hover.background).not.toBe(normal.background);
    expect(active.background).not.toBe(hover.background);
    expect(disabled.background).not.toBe(normal.background);
    expect(disabled.background).toBe(tokens.disabled);
    expect(disabled.cursor).toBe("not-allowed");
    expect(disabled.color).not.toBe("rgba(0, 0, 0, 0)");

    const formButton = page.locator(".audit-form .form-actions .button-primary");
    const formDisabled = await formButton.evaluate((element) => {
      element.setAttribute("disabled", "");
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, cursor: style.cursor };
    });
    expect(formDisabled.background).toBe(tokens.disabled);
    expect(formDisabled.cursor).toBe("not-allowed");
  });
}

test("keeps confirmed contrast regressions clear in dark and signal themes", async ({ page }) => {
  const scenarios = [
    { theme: "dark", viewport: { width: 1_440, height: 900 }, routes: ["/services", "/seo", "/glossary/lighthouse", "/checks/http-status", "/contacts"] },
    { theme: "signal", viewport: { width: 390, height: 844 }, routes: ["/", "/services", "/pricing"] },
  ] as const;

  for (const scenario of scenarios) {
    await page.setViewportSize(scenario.viewport);
    await page.goto("/");
    await page.evaluate((theme) => window.localStorage.setItem("kileni:theme:v1", theme), scenario.theme);
    for (const route of scenario.routes) {
      await page.goto(route);
      const result = await new AxeBuilder({ page }).analyze();
      expect(
        result.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious"),
        `${scenario.theme} ${route}: serious axe violations`,
      ).toEqual([]);
    }
  }
});

test("keeps the brief heading hierarchy valid", async ({ page }) => {
  await page.goto("/brief");
  const result = await new AxeBuilder({ page }).analyze();

  expect(
    result.violations.filter((violation) => violation.id === "heading-order"),
    "The brief side guide must introduce its level-three headings with a level-two heading",
  ).toEqual([]);
});
