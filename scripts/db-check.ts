import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env") as typeof import("@next/env");
loadEnvConfig(process.cwd());

const { database, databaseMode, databasePath, sqlite } = await import("../src/db/client");

if (databaseMode === "turso") {
  const [{ rows: probeRows }, { rows: migrationRows }] = await Promise.all([
    database.execute("SELECT 1 AS ok"),
    database.execute("SELECT MAX(version) AS version FROM schema_migrations"),
  ]);
  const ok = Number(probeRows[0]?.ok ?? 0) === 1;
  const migrationVersion = Number(migrationRows[0]?.version ?? 0);
  console.log(JSON.stringify({ databaseMode, connection: ok ? "ok" : "failed", migrationVersion }, null, 2));
  if (!ok || migrationVersion < 7) process.exitCode = 1;
} else {
  const integrity = sqlite.prepare("PRAGMA integrity_check").pluck().get();
  const wal = sqlite.pragma("journal_mode", { simple: true });
  console.log(JSON.stringify({ databaseMode, databasePath, integrity, journalMode: wal }, null, 2));
  if (integrity !== "ok" || String(wal).toLowerCase() !== "wal") process.exitCode = 1;
}
