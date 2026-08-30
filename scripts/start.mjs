import { spawn } from "node:child_process";
import { access, cp, lstat, mkdir, readlink, readdir, realpath, rm, symlink } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";

const root = process.cwd();
const standalone = resolve(root, ".next/standalone");
const server = resolve(standalone, "server.js");
const sourceNodeModules = resolve(root, "node_modules");
const standaloneNodeModules = resolve(standalone, "node_modules");
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

// Next's standalone tracer copies pnpm package contents but can dereference the
// links between an external package and its transitive dependencies. Native
// @libsql/client then resolves from the flattened copy and cannot find
// @libsql/core. Restore only that production dependency graph; Docker already
// overlays the complete production node_modules and does not need this fallback.
const restoredStores = new Set();

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function restorePnpmStore(storeDirectory) {
  if (restoredStores.has(storeDirectory)) return;
  restoredStores.add(storeDirectory);

  const sourceStoreNodeModules = resolve(sourceNodeModules, ".pnpm", storeDirectory, "node_modules");
  if (!(await exists(sourceStoreNodeModules))) return;

  for (const entry of await readdir(sourceStoreNodeModules, { withFileTypes: true })) {
    if (entry.name.startsWith("@") && entry.isDirectory()) {
      for (const scopedEntry of await readdir(resolve(sourceStoreNodeModules, entry.name), { withFileTypes: true })) {
        await restorePnpmLink(relative(sourceNodeModules, resolve(sourceStoreNodeModules, entry.name, scopedEntry.name)));
      }
      continue;
    }
    await restorePnpmLink(relative(sourceNodeModules, resolve(sourceStoreNodeModules, entry.name)));
  }
}

async function restorePnpmLink(relativePath) {
  const source = resolve(sourceNodeModules, relativePath);
  let sourceStat;
  try {
    sourceStat = await lstat(source);
  } catch {
    return;
  }
  if (!sourceStat.isSymbolicLink()) return;

  const sourceTarget = await realpath(source);
  const targetRelativePath = relative(sourceNodeModules, sourceTarget);
  if (targetRelativePath.startsWith(`..${sep}`) || targetRelativePath === "..") return;

  const standaloneTarget = resolve(standaloneNodeModules, targetRelativePath);
  if (!(await exists(standaloneTarget))) {
    await mkdir(dirname(standaloneTarget), { recursive: true });
    await cp(sourceTarget, standaloneTarget, { recursive: true, force: true });
  }

  const destination = resolve(standaloneNodeModules, relativePath);
  await mkdir(dirname(destination), { recursive: true });
  await rm(destination, { recursive: true, force: true });
  await symlink(await readlink(source), destination, process.platform === "win32" ? "junction" : undefined);

  const marker = `${sep}.pnpm${sep}`;
  const markerIndex = sourceTarget.indexOf(marker);
  if (markerIndex < 0) return;
  const storeDirectory = sourceTarget.slice(markerIndex + marker.length).split(sep)[0];
  await restorePnpmStore(storeDirectory);
}

await restorePnpmLink("@libsql/client");

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
