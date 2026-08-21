import Database from "better-sqlite3";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const databasePath = resolve(process.env.DATABASE_PATH ?? "/data/kileni.sqlite");
const migrationPath = resolve(process.env.MIGRATION_SQL_PATH ?? "/app/runtime/migration.sql");
mkdirSync(dirname(databasePath), { recursive: true, mode: 0o700 });

const database = new Database(databasePath);
try {
  database.pragma("busy_timeout = 10000");
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.exec(readFileSync(migrationPath, "utf8"));
  const integrity = database.pragma("integrity_check", { simple: true });
  if (integrity !== "ok") throw new Error(`SQLite integrity_check: ${String(integrity)}`);
  console.log(`SQLite готова: ${databasePath}`);
} finally {
  database.close();
}
