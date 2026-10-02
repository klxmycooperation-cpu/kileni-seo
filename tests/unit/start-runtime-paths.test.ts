import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, expect, test } from "vitest";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

test.each(["start.mjs", "docker-entrypoint.mjs"])("%s rejects unsafe launch before touching persistent data", (script) => {
  const root = mkdtempSync(join(tmpdir(), "kileni-unsafe-start-"));
  temporaryDirectories.push(root);
  const databasePath = join(root, "never-created.sqlite");
  const result = spawnSync(process.execPath, [resolve(process.cwd(), "scripts", script)], {
    cwd: root, encoding: "utf8",
    env: { ...process.env, NODE_ENV: "development", KILENI_SKIP_ENV_FILE: "1",
      DATABASE_PATH: databasePath, PRIVATE_UPLOADS_PATH: join(root, "uploads"),
      ADMIN_LOGIN: "fixture-admin", ADMIN_PASSWORD_HASH: "", ADMIN_SESSION_SECRET: "replace-with-at-least-32-random-characters",
      APP_BASE_URL: "https://kileni-seo.ru", IP_HASH_SALT: "i".repeat(32), ADMIN_SESSION_HOURS: "8",
      AUDIT_ENABLED: "false", FORMS_ENABLED: "false", LEGAL_EMAIL: "" },
  });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("Production launch blocked");
  expect(result.stderr).toContain("ADMIN_PASSWORD_HASH");
  expect(result.stderr).toContain("ADMIN_SESSION_SECRET");
  expect(existsSync(databasePath)).toBe(false);
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
    env: { ...process.env, KILENI_SKIP_ENV_FILE: "1", FORMS_ENABLED: "false", AUDIT_ENABLED: "false",
      APP_BASE_URL: "https://kileni-seo.ru", IP_HASH_SALT: "i".repeat(32), ADMIN_LOGIN: "fixture-admin",
      ADMIN_PASSWORD_HASH: `$2b$12$${"a".repeat(53)}`, ADMIN_SESSION_SECRET: "s".repeat(32),
      LEGAL_EMAIL: "", ADMIN_SESSION_HOURS: "8" },
    encoding: "utf8",
  });

  const resolvedRoot = realpathSync(root);
  expect(JSON.parse(output.trim().split("\n").at(-1)!)).toEqual({
    database: join(resolvedRoot, "data", "kileni.sqlite"),
    uploads: join(resolvedRoot, "data", "uploads"),
    backups: join(resolvedRoot, "data", "backups"),
  });
});
