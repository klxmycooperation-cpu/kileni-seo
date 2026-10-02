import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("kileni:intro:v9", "1");
    window.localStorage.setItem("kileni-cookie-preferences:v2", JSON.stringify({
      essential: true,
      analytics: false,
      marketing: false,
      version: "2026-08-23.2",
    }));
  });
});

test("shows one site-wide tracing beam that follows a long public page", async ({ page }, testInfo) => {
  await page.goto("/pricing?category=seo-audit");

  const beam = page.locator(".site-tracing-beam");
  await expect(beam).toHaveCount(1);
  await expect(beam.locator(".site-tracing-beam__track")).toBeVisible();
  await expect(beam.locator(".site-tracing-beam__track")).toHaveCSS("opacity", "1");
  await expect(beam.locator(".site-tracing-beam__path--active")).toHaveAttribute("stroke", /^url\(#site-tracing-beam-/u);
  expect(await beam.locator(".site-tracing-beam__track > svg").evaluate((svg) => Number(svg.getAttribute("height")))).toBeGreaterThan(1000);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.55));
  await expect(beam.locator(".site-tracing-beam__path--active")).toHaveCSS("display", "inline");
  expect(await beam.locator(".site-tracing-beam__path--active").evaluate((path) => (
    (path as SVGGraphicsElement).getBBox().height
  ))).toBeGreaterThan(1000);
  await page.screenshot({ path: testInfo.outputPath("site-tracing-beam-desktop.png") });
});

test("softens the home beam at the top and dissolves it before the legal footer", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1119 });
  await page.goto("/");

  const beam = page.locator(".site-tracing-beam");
  const track = beam.locator(".site-tracing-beam__track");
  await expect(track.locator(".site-tracing-beam__start")).toHaveCount(0);
  await expect.poll(() => track.evaluate((element) => Number.parseFloat(
    getComputedStyle(element).getPropertyValue("--site-beam-fade-start"),
  ))).toBeGreaterThan(1000);

  const geometry = await page.evaluate(() => {
    const content = document.querySelector<HTMLElement>(".site-tracing-beam__content");
    const trackElement = document.querySelector<HTMLElement>(".site-tracing-beam__track");
    const svg = trackElement?.querySelector<SVGSVGElement>("svg");
    const brandCopy = document.querySelector<HTMLElement>(".site-footer .footer-brand p");
    const legal = document.querySelector<HTMLElement>(".site-footer .footer-legal-identity");
    if (!content || !trackElement || !svg || !brandCopy || !legal) throw new Error("Beam geometry is incomplete");
    const contentBox = content.getBoundingClientRect();
    const brandBox = brandCopy.getBoundingClientRect();
    const legalBox = legal.getBoundingClientRect();
    const trackStyle = getComputedStyle(trackElement);
    const legalStyle = getComputedStyle(legal);
    return {
      fadeStart: Number.parseFloat(trackStyle.getPropertyValue("--site-beam-fade-start")),
      fadeEnd: Number.parseFloat(trackStyle.getPropertyValue("--site-beam-fade-end")),
      brandBottom: brandBox.bottom - contentBox.top,
      legalTop: legalBox.top - contentBox.top,
      mask: trackStyle.maskImage || trackStyle.getPropertyValue("-webkit-mask-image"),
      svgHeight: Number(svg.getAttribute("height")),
      legalBorderWidth: Number.parseFloat(legalStyle.borderTopWidth),
      legalBorderStyle: legalStyle.borderTopStyle,
    };
  });

  expect(geometry.fadeStart).toBeGreaterThanOrEqual(geometry.brandBottom - 16);
  expect(geometry.fadeStart).toBeLessThanOrEqual(geometry.brandBottom + 16);
  expect(geometry.fadeEnd).toBeLessThanOrEqual(geometry.legalTop);
  expect(geometry.fadeEnd - geometry.fadeStart).toBeGreaterThanOrEqual(120);
  expect(geometry.svgHeight).toBeLessThanOrEqual(geometry.fadeEnd + 1);
  expect(geometry.mask).toContain("linear-gradient");
  expect(geometry.legalBorderStyle).toBe("solid");
  expect(geometry.legalBorderWidth).toBeGreaterThanOrEqual(1);
});

test("keeps a static route without the moving highlight for reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/pricing");

  const beam = page.locator(".site-tracing-beam");
  await expect(beam.locator(".site-tracing-beam__path--base")).toHaveCSS("display", "inline");
  expect(await beam.locator(".site-tracing-beam__track").evaluate((track) => (
    track.getBoundingClientRect().height
  ))).toBeGreaterThan(1000);
  await expect(beam.locator(".site-tracing-beam__path--active")).toBeHidden();
});

test("removes the decorative rail from the narrow mobile layout", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pricing");

  const beam = page.locator(".site-tracing-beam__track");
  await expect(beam).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath("site-tracing-beam-mobile.png") });
});
