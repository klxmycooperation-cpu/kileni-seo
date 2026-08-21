import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("critical font budget", () => {
  it("ships one webfont family on the public shell", () => {
    const layout = readFileSync(join(root, "app/layout.tsx"), "utf8");
    const globals = readFileSync(join(root, "app/globals.css"), "utf8");
    const redesign = readFileSync(join(root, "app/site-redesign.css"), "utf8");

    expect(layout).not.toMatch(/\bInter\b/u);
    expect(layout).not.toMatch(/\bIBM_Plex_Mono\b/u);
    expect(globals).not.toMatch(/--display:\s*"Bounded"/u);
    expect(redesign).not.toMatch(/font-family:\s*"Bounded"/u);
  });
});
