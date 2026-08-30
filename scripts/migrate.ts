import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env") as typeof import("@next/env");
loadEnvConfig(process.cwd());

const { database, databaseMode, databasePath, sqlite } = await import("../src/db/client");

if (databaseMode === "turso") {
  // Первый запрос применяет idempotent-миграции из db/client.ts к постоянной БД.
  const result = await database.execute("SELECT MAX(version) AS version FROM schema_migrations");
  const migrationVersion = Number(result.rows[0]?.version ?? 0);
  if (migrationVersion < 7) throw new Error(`Turso migration is incomplete: version ${migrationVersion}`);
  console.log(`Database migrated: Turso (version ${migrationVersion})`);
} else {
  const { migrationSql } = await import("../src/db/migrations");
  sqlite.exec(migrationSql);
  const result = sqlite.prepare("PRAGMA integrity_check").pluck().get();
  if (result !== "ok") throw new Error(`SQLite integrity check failed: ${String(result)}`);
  console.log(`Database migrated: ${databasePath}`);
}
