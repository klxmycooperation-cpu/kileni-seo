import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, expect, test } from "vitest";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("packages static and public assets inside the standalone runtime", () => {
  const root = mkdtempSync(join(tmpdir(), "kileni-standalone-assets-"));
  temporaryDirectories.push(root);
  mkdirSync(join(root, ".next", "static", "css"), { recursive: true });
  mkdirSync(join(root, ".next", "standalone"), { recursive: true });
  mkdirSync(join(root, ".next", "standalone", "public"), { recursive: true });
  mkdirSync(join(root, "public", "brand"), { recursive: true });
  writeFileSync(join(root, ".next", "static", "css", "site.css"), "body{}\n");
  writeFileSync(join(root, "public", "brand", "logo.svg"), "<svg/>\n");
  writeFileSync(join(root, ".next", "standalone", "public", "stale-private-runtime.enc"), "must not ship\n");

  execFileSync(
    process.execPath,
    [resolve(process.cwd(), "scripts/prepare-standalone-assets.mjs")],
    { cwd: root },
  );

  expect(readFileSync(join(root, ".next", "standalone", ".next", "static", "css", "site.css"), "utf8"))
    .toBe("body{}\n");
  expect(readFileSync(join(root, ".next", "standalone", "public", "brand", "logo.svg"), "utf8"))
    .toBe("<svg/>\n");
  expect(() => readFileSync(join(root, ".next", "standalone", "public", "stale-private-runtime.enc"), "utf8"))
    .toThrow();
});
