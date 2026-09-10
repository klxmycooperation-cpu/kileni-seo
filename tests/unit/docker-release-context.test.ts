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

  it("allows an approved mirror for the pinned Node base image", async () => {
    const dockerfile = await readFile("Dockerfile", "utf8");

    expect(dockerfile).toContain(
      "ARG NODE_IMAGE=node:${NODE_VERSION}-bookworm-slim",
    );
    expect(dockerfile.match(/FROM \$\{NODE_IMAGE\}/g)).toHaveLength(3);
  });

  it("includes the fixture imported by the PDF QA script", async () => {
    const dockerignore = await readFile(".dockerignore", "utf8");

    expect(dockerignore).toContain(
      "!tests/unit/fixtures/audit-client-report-snapshot.ts",
    );
  });
});
