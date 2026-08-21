import { spawn } from "node:child_process";
import { access, cp } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const standalone = resolve(root, ".next/standalone");
const server = resolve(standalone, "server.js");
const runtimeEnvironment = {
  ...process.env,
  DATABASE_PATH: resolve(root, process.env.DATABASE_PATH ?? "data/kileni.sqlite"),
  PRIVATE_UPLOADS_PATH: resolve(root, process.env.PRIVATE_UPLOADS_PATH ?? "data/uploads"),
  BACKUP_PATH: resolve(root, process.env.BACKUP_PATH ?? "data/backups"),
};

try {
  await access(server);
} catch {
  throw new Error("Production build is missing. Run `pnpm build` before `pnpm start`.");
}

await Promise.all([
  cp(resolve(root, ".next/static"), resolve(standalone, ".next/static"), { recursive: true, force: true }),
  cp(resolve(root, "public"), resolve(standalone, "public"), { recursive: true, force: true }),
]);

const child = spawn(process.execPath, [server], {
  cwd: root,
  env: runtimeEnvironment,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => child.kill(signal));
}

child.once("exit", (code, signal) => {
  process.exitCode = signal ? 0 : code ?? 1;
});
