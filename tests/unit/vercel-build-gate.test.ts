import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Vercel production build gate", () => {
  it("validates launch configuration before compiling the application", () => {
    const config = JSON.parse(readFileSync(new URL("../../vercel.json", import.meta.url), "utf8")) as {
      buildCommand?: string;
    };

    expect(config.buildCommand).toMatch(/^node scripts\/validate-launch\.mjs\s+&&\s+/u);
  });
});
