import Database from "better-sqlite3";
import { createClient } from "@libsql/client";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  DATABASE_MIGRATIONS,
  LATEST_SCHEMA_VERSION,
  MIN_SUPPORTED_SCHEMA_VERSION,
  bootstrapV6Sql,
  migrateLibsqlDatabase,
  migrateSqliteDatabase,
} from "../../src/db/migrations";

describe("versioned database migrations", () => {
  it("bootstraps an empty database at v6 and applies every later migration", () => {
    const database = new Database(":memory:");
    try {
      const result = migrateSqliteDatabase(database);

      expect(MIN_SUPPORTED_SCHEMA_VERSION).toBe(6);
      expect(LATEST_SCHEMA_VERSION).toBe(10);
      expect(DATABASE_MIGRATIONS.map((migration) => migration.version)).toEqual([6, 7, 8, 9, 10]);
      expect(result).toEqual({ fromVersion: 0, currentVersion: 10, appliedVersions: [6, 7, 8, 9, 10] });
      expect(appliedVersions(database)).toEqual([6, 7, 8, 9, 10]);
      expect(columnNames(database, "audits")).toContain("priority_urls_json");
    } finally {
      database.close();
    }
  });

  it("upgrades the real v6 baseline without changing existing counters", () => {
    const database = databaseAtVersion(6);
    try {
      database.prepare("INSERT INTO public_metrics(name,value,updated_at) VALUES ('free_audit_pages',42,1)").run();

      expect(migrateSqliteDatabase(database)).toEqual({
        fromVersion: 6,
        currentVersion: 10,
        appliedVersions: [7, 8, 9, 10],
      });
      expect(database.prepare("SELECT value FROM public_metrics WHERE name='free_audit_pages'").pluck().get()).toBe(42);
      expect(appliedVersions(database)).toEqual([6, 7, 8, 9, 10]);
    } finally {
      database.close();
    }
  });

  it("is a no-op for a current database", () => {
    const database = new Database(":memory:");
    try {
      migrateSqliteDatabase(database);
      const schemaVersion = database.pragma("schema_version", { simple: true });

      expect(migrateSqliteDatabase(database)).toEqual({
        fromVersion: 10,
        currentVersion: 10,
        appliedVersions: [],
      });
      expect(database.pragma("schema_version", { simple: true })).toBe(schemaVersion);
    } finally {
      database.close();
    }
  });

  it("rejects an unknown future version before changing the schema", () => {
    const database = new Database(":memory:");
    try {
      migrateSqliteDatabase(database);
      database.prepare("INSERT INTO schema_migrations(version,applied_at) VALUES (11,1)").run();
      const schemaVersion = database.pragma("schema_version", { simple: true });

      expect(() => migrateSqliteDatabase(database)).toThrowError(/SCHEMA_VERSION_FUTURE/u);
      expect(database.pragma("schema_version", { simple: true })).toBe(schemaVersion);
    } finally {
      database.close();
    }
  });

  it("rejects a gap in the supported migration history", () => {
    const database = databaseAtVersion(6);
    try {
      database.prepare("INSERT INTO schema_migrations(version,applied_at) VALUES (8,1)").run();

      expect(() => migrateSqliteDatabase(database)).toThrowError(/SCHEMA_VERSION_GAP/u);
      expect(appliedVersions(database)).toEqual([6, 8]);
      expect(tableNames(database)).not.toContain("page_view_daily");
    } finally {
      database.close();
    }
  });

  it("reports drift on the current version without silently repairing it", () => {
    const database = new Database(":memory:");
    try {
      migrateSqliteDatabase(database);
      database.exec("DROP INDEX page_view_daily_updated_idx");

      expect(() => migrateSqliteDatabase(database)).toThrowError(/SCHEMA_DRIFT.*page_view_daily_updated_idx/u);
      expect(indexNames(database)).not.toContain("page_view_daily_updated_idx");
    } finally {
      database.close();
    }
  });

  it("does not claim a failed transition in the journal", () => {
    const database = databaseAtVersion(9);
    try {
      database.exec("ALTER TABLE audits ADD COLUMN priority_urls_json TEXT");

      expect(() => migrateSqliteDatabase(database)).toThrow();
      expect(appliedVersions(database)).toEqual([6, 7, 8, 9]);
    } finally {
      database.close();
    }
  });

  it("uses the same ordered runner through the libSQL adapter", async () => {
    const directory = mkdtempSync(join(tmpdir(), "kileni-libsql-migrations-"));
    const client = createClient({ url: `file:${join(directory, "database.sqlite")}` });
    try {
      expect(await migrateLibsqlDatabase(client)).toEqual({
        fromVersion: 0,
        currentVersion: 10,
        appliedVersions: [6, 7, 8, 9, 10],
      });
      const columns = await client.execute("PRAGMA table_info(audits)");
      expect(columns.rows.map((row) => row.name)).toContain("priority_urls_json");
      expect(await migrateLibsqlDatabase(client)).toEqual({
        fromVersion: 10,
        currentVersion: 10,
        appliedVersions: [],
      });
    } finally {
      client.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

function databaseAtVersion(version: 6 | 7 | 8 | 9): Database.Database {
  const database = new Database(":memory:");
  database.exec(bootstrapV6Sql);
  database.prepare("INSERT INTO schema_migrations(version,applied_at) VALUES (6,1)").run();
  for (const migration of DATABASE_MIGRATIONS) {
    if (migration.version <= 6 || migration.version > version) continue;
    for (const sql of migration.up) database.exec(sql);
    database.prepare("INSERT INTO schema_migrations(version,applied_at) VALUES (?,1)").run(migration.version);
  }
  return database;
}

function appliedVersions(database: Database.Database): number[] {
  return database.prepare("SELECT version FROM schema_migrations ORDER BY version").pluck().all() as number[];
}

function tableNames(database: Database.Database): string[] {
  return database.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").pluck().all() as string[];
}

function indexNames(database: Database.Database): string[] {
  return database.prepare("SELECT name FROM sqlite_schema WHERE type='index' ORDER BY name").pluck().all() as string[];
}

function columnNames(database: Database.Database, table: string): string[] {
  return database.prepare(`PRAGMA table_info(${table})`).all().map((row) => (row as { name: string }).name);
}
