import { sqlite, databasePath } from "../src/db/client";

const integrity = sqlite.prepare("PRAGMA integrity_check").pluck().get();
const wal = sqlite.pragma("journal_mode", { simple: true });
console.log(JSON.stringify({ databasePath, integrity, journalMode: wal }, null, 2));
if (integrity !== "ok" || String(wal).toLowerCase() !== "wal") process.exitCode = 1;
