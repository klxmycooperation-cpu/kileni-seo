import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { migrationSql } from "./migrations";
import * as schema from "./schema";

const defaultPath = process.env.VERCEL === "1" ? "/tmp/kileni.sqlite" : "./data/kileni.sqlite";
const databasePath = resolve(process.env.DATABASE_PATH ?? defaultPath);
mkdirSync(dirname(databasePath), { recursive: true });

const globalDatabase = globalThis as typeof globalThis & { __kileniSqlite?: Database.Database };

export const sqlite = globalDatabase.__kileniSqlite ?? new Database(databasePath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("busy_timeout = 5000");
sqlite.exec(migrationSql);

globalDatabase.__kileniSqlite = sqlite;

export const db = drizzle(sqlite, { schema });
export { databasePath };
