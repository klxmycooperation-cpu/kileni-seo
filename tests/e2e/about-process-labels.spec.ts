import { expect, test } from "@playwright/test";

test("keeps every desktop work-stage label on one line", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/about");

  const labels = page.locator(".about-action-list strong");
  await expect(labels).toHaveCount(7);

  for (const label of await labels.all()) {
    const layout = await label.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        height: element.getBoundingClientRect().height,
        lineHeight: Number.parseFloat(style.lineHeight),
        whiteSpace: style.whiteSpace,
      };
    });

    expect(layout.whiteSpace).toBe("nowrap");
    expect(layout.height).toBeLessThanOrEqual(layout.lineHeight + 1);
  }
});
