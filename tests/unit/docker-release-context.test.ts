import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("Docker release context", () => {
  it("copies the pnpm workspace settings into both dependency stages", async () => {
    const dockerfile = await readFile("Dockerfile", "utf8");
    const copies = dockerfile.match(
      /COPY package\.json pnpm-lock\.yaml pnpm-workspace\.yaml \.\//g,
    );

    expect(copies).toHaveLength(2);
  });

  it("includes the fixture imported by the PDF QA script", async () => {
    const dockerignore = await readFile(".dockerignore", "utf8");

    expect(dockerignore).toContain(
      "!tests/unit/fixtures/audit-client-report-snapshot.ts",
    );
  });
});
