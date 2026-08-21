import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, expect, test } from "vitest";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("starts the standalone server with persistent paths anchored at the project root", () => {
  const root = mkdtempSync(join(tmpdir(), "kileni-start-test-"));
  temporaryDirectories.push(root);
  mkdirSync(join(root, ".next", "standalone"), { recursive: true });
  mkdirSync(join(root, ".next", "static"), { recursive: true });
  mkdirSync(join(root, "public"), { recursive: true });
  writeFileSync(
    join(root, ".next", "standalone", "server.js"),
    "process.chdir(__dirname); console.log(JSON.stringify({ database: process.env.DATABASE_PATH, uploads: process.env.PRIVATE_UPLOADS_PATH, backups: process.env.BACKUP_PATH }));\n",
  );

  const output = execFileSync(process.execPath, [resolve(process.cwd(), "scripts/start.mjs")], {
    cwd: root,
    env: process.env,
    encoding: "utf8",
  });

  const resolvedRoot = realpathSync(root);
  expect(JSON.parse(output.trim())).toEqual({
    database: join(resolvedRoot, "data", "kileni.sqlite"),
    uploads: join(resolvedRoot, "data", "uploads"),
    backups: join(resolvedRoot, "data", "backups"),
  });
});
