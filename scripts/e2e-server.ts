import { mkdir } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { spawn } from "node:child_process";

const databasePath = resolve(process.env.DATABASE_PATH ?? "");
const allowedRoot = resolve(process.cwd(), "tmp/e2e");
if (!databasePath.startsWith(`${allowedRoot}${sep}`)) {
  throw new Error("E2E database must be inside tmp/e2e");
}
await mkdir(dirname(databasePath), { recursive: true });
const { sqlite } = await import("../src/db/client");
const { migrationSql } = await import("../src/db/migrations");
sqlite.exec(migrationSql);
sqlite.close();

const child = spawn(process.platform === "win32" ? "pnpm.cmd" : "pnpm", [
  "dev:web",
  "--hostname",
  "127.0.0.1",
  "--port",
  process.env.E2E_PORT ?? "3107",
], { env: process.env, stdio: "inherit" });

const stop = () => child.kill("SIGTERM");
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
child.once("exit", (code, signal) => process.exitCode = signal ? 1 : code ?? 1);
