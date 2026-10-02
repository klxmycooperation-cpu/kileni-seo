import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
const completionCss = read("app/theme-contrast-completion.css");
const serviceCss = read("app/service-pricing-brief-10.css");

describe("visual completion contract", () => {
  it("ships two themes and the eclipse control without retired palette selectors", () => {
    expect(read("src/components/layout/theme-config.ts")).toContain('KILENI_THEMES = ["light", "dark"]');
    expect(read("src/components/layout/ThemeToggle.tsx")).toContain("theme-toggle__eclipse");
    expect(read("app/layout.tsx")).not.toContain("cosmos-palette");
    expect(completionCss).not.toContain('data-kileni-theme="signal"');
  });

  it("contains the required readability and component treatments", () => {
    for (const selector of [
      ".svc-assurance",
      ".svc-request-section",
      ".svc-custom-path",
      ".marketplace-docs__links",
      ".marketplace-cta__action",
      ".marketplace-result-example",
      ".marketplace-offer-price",
      ".svc-visual",
      ".svc-detail-hero",
      ".svc-build-composition",
      ".warm-final-cta",
      ".home-pin-cta::before",
      ".home-decision__tab[data-active=\"true\"]",
      ".home-decision__panel[data-route=\"2\"]",
      ".brief-review-details",
      ".analytics-time-card .analytics-detail-trend",
      ".analytics-errors-card .analytics-detail-trend",
    ]) expect(completionCss).toContain(selector);
  });

  it("keeps every home format compact and makes the pricing handoff continuous", () => {
    for (const route of ["0", "1", "2"]) {
      expect(completionCss).toContain(`.home-decision__panel[data-route="${route}"]`);
    }
    expect(completionCss).toContain(".home-case-explorer__surface {");
    expect(completionCss).toContain("width: 100%;");
    expect(completionCss).toContain("margin: .75rem 0 0;");
    expect(completionCss).toContain(".home-pin-cta::after");
  });

  it("keeps animated headline highlights available without weakening the light palette", () => {
    expect(completionCss).toContain("canvas-text-sheen");
    expect(completionCss).toContain('html[data-kileni-theme="light"] .kileni-site .canvas-text');
  });

  it("keeps official documentation and the marketplace action semantic", () => {
    const page = read("src/components/pages/MarketplacePage.tsx");
    expect(page).toContain("marketplace-docs__links");
    expect(page).toContain("marketplace-cta__action");
    expect(page).toContain('href="#marketplace-offers"');
  });

  it("keeps service heroes legible when the component stylesheet loads after global CSS", () => {
    expect(serviceCss).toContain('html[data-kileni-theme="light"] .kileni-site .svc-detail-hero');
    expect(serviceCss).toContain('html[data-kileni-theme="light"] .kileni-site .svc-visual-build-system');
  });
});
