import { expect, test } from "@playwright/test";

const markNames = ["Wildberries", "Ozon", "Яндекс Маркет"] as const;

test.describe("marketplace platform marks", () => {
  test("keeps marketplace breadcrumbs clear of the floating header", async ({ page }) => {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.goto("/marketplaces");

      const [headerBox, breadcrumbsBox] = await Promise.all([
        page.locator(".site-header").boundingBox(),
        page.getByRole("navigation", { name: "Хлебные крошки" }).locator("ol").boundingBox(),
      ]);
      expect(headerBox).not.toBeNull();
      expect(breadcrumbsBox).not.toBeNull();
      expect(breadcrumbsBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height + 16);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    }
  });

  test("loads every local mark without a failed image request on desktop", async ({ page }) => {
    const failedRequests: string[] = [];
    page.on("requestfailed", (request) => {
      if (request.url().includes("/marketplaces/")) failedRequests.push(request.url());
    });

    await page.goto("/marketplaces", { waitUntil: "networkidle" });
    const marks = page.locator(".marketplace-card .platform-mark");
    await expect(marks).toHaveCount(3);
    await expect(marks.first().locator("img")).toHaveAttribute("fetchpriority", "high");
    await expect(marks.locator("img")).toHaveCount(3);
    await expect.poll(() => marks.locator("img").evaluateAll((images) => images.every((image) => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);

    const dimensions = await marks.evaluateAll((nodes) => nodes.map((node) => {
      const box = node.getBoundingClientRect();
      const image = node.querySelector("img") as HTMLImageElement;
      return { width: box.width, height: box.height, alt: image.alt };
    }));
    expect(dimensions.every(({ width, height }) => width > 0 && height > 0 && Math.abs(width / height - 8 / 3) < 0.03)).toBe(true);
    expect(dimensions.map(({ alt }) => alt)).toEqual([...markNames]);
    expect(failedRequests).toEqual([]);
    await page.screenshot({ path: "test-results/marketplace-icons/desktop.png", fullPage: false });
  });

  test("reserves the same mark box on a fresh mobile render", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/marketplaces", { waitUntil: "networkidle" });
    const marks = page.locator(".marketplace-card .platform-mark");
    await expect(marks).toHaveCount(3);
    const dimensions = await marks.evaluateAll((nodes) => nodes.map((node) => {
      const box = node.getBoundingClientRect();
      const image = node.querySelector("img") as HTMLImageElement;
      return { width: box.width, height: box.height, naturalWidth: image.naturalWidth };
    }));
    expect(dimensions.every(({ width, height, naturalWidth }) => width > 0 && height > 0 && Math.abs(width / height - 8 / 3) < 0.03 && naturalWidth > 0)).toBe(true);
    await page.screenshot({ path: "test-results/marketplace-icons/mobile.png", fullPage: false });
  });
});
