import { sqlite, databasePath } from "../src/db/client";
import { migrationSql } from "../src/db/migrations";

sqlite.exec(migrationSql);
const result = sqlite.prepare("PRAGMA integrity_check").pluck().get();
if (result !== "ok") throw new Error(`SQLite integrity check failed: ${String(result)}`);
console.log(`Database migrated: ${databasePath}`);
