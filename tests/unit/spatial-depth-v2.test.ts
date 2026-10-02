import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readProjectFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("spatial depth v2 visual contract", () => {
  it("is loaded after the existing visual layers", () => {
    const layout = readProjectFile("app/layout.tsx");
    expect(layout.indexOf('import "./spatial-depth-v2.css";')).toBeGreaterThan(layout.indexOf('import "./final-ui-corrections.css";'));
  });

  it("keeps the depth scene scoped to existing visual containers", () => {
    const css = readProjectFile("app/spatial-depth-v2.css");
    expect(css).toContain(".kileni-site .signal-hero .hero-audit-surface");
    expect(css).toContain(".kileni-site .services-hub__trajectory");
    expect(css).toContain(".kileni-site .services-explorer__visual");
    expect(css).toContain(".kileni-site .svc-visual-build-system .svc-build-composition");
    expect(css).toContain(".kileni-site .marketplace-docs");
    expect(css).toMatch(/@media \(min-width: 721px\) and \(hover: hover\) and \(pointer: fine\)/u);
    expect(css).toContain("@media (max-width: 720px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("does not introduce a WebGL dependency or a fixed backdrop blur", () => {
    const css = readProjectFile("app/spatial-depth-v2.css");
    expect(css).not.toMatch(/(?:three\.js|webgl\s+context|<canvas)/iu);
    expect(css).not.toMatch(/\.kileni-site > \.kileni-visual-backdrop[^}]*backdrop-filter/isu);
  });

  it("declares a coarse-pointer fallback independent of viewport width", () => {
    const css = readProjectFile("app/spatial-depth-v2.css");
    const coarseBlock = css.match(/@media \(hover: none\), \(pointer: coarse\) \{([\s\S]*?)\n\}/u)?.[1] ?? "";

    expect(coarseBlock).toContain(".signal-hero .hero-audit-surface");
    expect(coarseBlock).toContain(".services-hub__trajectory");
    expect(coarseBlock).toContain(".services-explorer__visual");
    expect(coarseBlock).toContain(".marketplace-card:hover");
    expect(coarseBlock).toContain("transform: none !important");
    expect(coarseBlock).toContain("transition: none !important");
    expect(coarseBlock).toContain("backdrop-filter: none");
  });

  it("keeps the interactive audit surface stationary so its controls remain clickable", () => {
    const css = readProjectFile("app/spatial-depth-v2.css");
    expect(css).toMatch(/\.kileni-site \.signal-hero \.hero-tool\s*\{[\s\S]*?animation:\s*none/u);
    expect(css).toMatch(/\.kileni-site \.signal-hero \.hero-audit-surface\s*\{[\s\S]*?transform:\s*none/u);
  });

  it("does not tie the interactive audit surface to the intro animation state", () => {
    const css = readProjectFile("app/spatial-depth-v2.css");
    expect(css).not.toMatch(/data-kileni-intro[^}]+hero-audit-surface[^}]+animation-play-state/isu);
  });

  it("removes trajectory blur in reduced-motion mode", () => {
    const css = readProjectFile("app/spatial-depth-v2.css");
    const reducedBlock = css.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/u)?.[1] ?? "";

    expect(reducedBlock).toMatch(/\.kileni-site \.signal-hero \.hero-audit-visual,\s+\.kileni-site \.services-hub__trajectory,\s+\.kileni-site \.services-explorer__visual \{ backdrop-filter:\s*none\s*!important; \}/u);
  });
});
