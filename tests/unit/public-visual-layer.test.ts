import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readProjectFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("shared public visual layer", () => {
  it("provides one decorative backdrop in the public shell without exposing it to assistive technology", () => {
    const shell = readProjectFile("src/components/layout/PublicShell.tsx");

    expect(shell).toContain('className="kileni-visual-backdrop"');
    expect(shell).toContain('className="kileni-visual-backdrop__grid"');
    expect(shell).toContain('className="kileni-visual-backdrop__glow"');
    expect(shell).toMatch(/className="kileni-visual-backdrop"[^>]+aria-hidden="true"/u);
  });

  it("shares the same depth, focus and reduced-motion contracts across public templates", () => {
    const css = readProjectFile("app/visual-layer.css");

    expect(css).toContain(".kileni-site > .kileni-visual-backdrop");
    expect(css).toContain(".kileni-site .site-header");
    expect(css).toContain(".kileni-site .site-footer");
    expect(css).toContain(".kileni-site :is(.page-dark-top, .services-hub__hero, .seo-hub__hero");
    expect(css).toContain(".kileni-site :is(.marketplace-card, .glossary-item, .article-card, .cp-narrative-case)");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("--kileni-motion-fast: 1ms");
  });

  it("defines theme-aware intro surface tokens for every public theme", () => {
    const css = readProjectFile("app/brand-intro-v10.css");

    expect(css).toContain('--intro-surface-center: #fff');
    expect(css).toContain('html[data-kileni-theme="dark"] .brand-intro-v10');
    expect(css).not.toContain('data-kileni-theme="signal"');
    expect(css).not.toContain('data-kileni-theme="cosmos"');
    expect(css).toContain('background:\n    radial-gradient(circle at 50% 38%, var(--intro-highlight)');
    expect(css).toContain('linear-gradient(145deg, var(--intro-surface-center)');
  });
});
