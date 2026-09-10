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

const productionServer = process.env.E2E_PRODUCTION_SERVER === "1";
const port = process.env.E2E_PORT ?? "3107";
if (!/^\d{2,5}$/u.test(port)) throw new Error("E2E_PORT must be a numeric TCP port");
const pnpmArgs = productionServer
  ? ["start"]
  : ["dev:web", "--hostname", "127.0.0.1", "--port", port];
const executable = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "pnpm";
const args = process.platform === "win32" ? ["/d", "/s", "/c", ["pnpm", ...pnpmArgs].join(" ")] : pnpmArgs;
const child = spawn(executable, args, {
  env: productionServer
    ? { ...process.env, HOSTNAME: "127.0.0.1", PORT: port }
    : process.env,
  stdio: "inherit",
});

const stop = () => child.kill("SIGTERM");
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
child.once("exit", (code, signal) => process.exitCode = signal ? 1 : code ?? 1);
