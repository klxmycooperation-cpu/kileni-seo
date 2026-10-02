import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { KILENI_THEMES, THEME_BOOTSTRAP } from "../../src/components/layout/theme-config";

describe("public theme contract", () => {
  it("exposes exactly light and dark themes and safely normalises removed preferences", () => {
    expect(KILENI_THEMES).toEqual(["light", "dark"]);
    expect(THEME_BOOTSTRAP).not.toContain('"signal"');
    expect(THEME_BOOTSTRAP).not.toContain('"cosmos"');
  });

  it("does not ship Signal-theme selectors in the active public theme system", () => {
    const themeFiles = ["app/theme.css", "src/components/layout/ThemeToggle.tsx", "src/components/layout/ThemePreferenceSync.tsx"];
    const source = themeFiles.map((file) => readFileSync(resolve(process.cwd(), file), "utf8")).join("\n");

    expect(source).not.toContain('data-kileni-theme="signal"');
    expect(source).not.toContain("Сигнальная");
  });
});
