import { createClient, type Client, type InArgs, type InStatement, type ResultSet, type Row, type Transaction } from "@libsql/client";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { migrationSql } from "./migrations";

const defaultPath = process.env.VERCEL === "1" ? "/tmp/kileni.sqlite" : "./data/kileni.sqlite";
const databasePath = resolve(process.env.DATABASE_PATH ?? defaultPath);
const tursoDatabaseUrl = process.env.TURSO_DATABASE_URL?.trim() ?? "";
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN?.trim() ?? "";

export const databaseMode = tursoDatabaseUrl && tursoAuthToken ? "turso" : process.env.VERCEL === "1" ? "ephemeral" : "local";
export const databaseIsDurable = databaseMode === "turso" || databaseMode === "local";
export const databaseConfigurationError = (tursoDatabaseUrl || tursoAuthToken) && !(tursoDatabaseUrl && tursoAuthToken)
  ? "TURSO_DATABASE_URL и TURSO_AUTH_TOKEN должны быть заданы вместе"
  : null;

if (databaseMode === "local" || databaseMode === "ephemeral") mkdirSync(dirname(databasePath), { recursive: true });

const globalDatabase = globalThis as typeof globalThis & {
  __kileniSqlite?: { path: string; connection: Database.Database };
  __kileniLibsql?: { key: string; client: Client };
  __kileniDatabaseReady?: { key: string; promise: Promise<void> };
};

// Синхронное соединение оставлено для локальных обслуживающих скриптов и старых
// тестовых фикстур. Код приложения использует `database` ниже: на Vercel он
// всегда выполняет запросы через постоянную Turso, а не через /tmp.
const existingSqlite = globalDatabase.__kileniSqlite;
export const sqlite = existingSqlite?.path === databasePath ? existingSqlite.connection : new Database(databasePath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("busy_timeout = 5000");
sqlite.exec(migrationSql);
globalDatabase.__kileniSqlite = { path: databasePath, connection: sqlite };

const clientKey = `${tursoDatabaseUrl}\n${tursoAuthToken}`;
const existingClient = globalDatabase.__kileniLibsql;
const remoteClient = databaseMode === "turso"
  ? existingClient?.key === clientKey
    ? existingClient.client
    : createClient({ url: tursoDatabaseUrl, authToken: tursoAuthToken })
  : null;
if (remoteClient) globalDatabase.__kileniLibsql = { key: clientKey, client: remoteClient };

let localOperationTail: Promise<void> = Promise.resolve();

async function ensureDatabaseReady(): Promise<void> {
  if (databaseConfigurationError) throw new Error(databaseConfigurationError);
  if (databaseMode === "ephemeral" && process.env.NODE_ENV === "production") {
    throw new Error("На Vercel требуется постоянная Turso database; /tmp не подходит для заявок и аудитов");
  }
  if (databaseMode === "local" || databaseMode === "ephemeral") return;

  const existingReady = globalDatabase.__kileniDatabaseReady;
  const ready = existingReady?.key === clientKey
    ? existingReady.promise
    : remoteClient?.executeMultiple(migrationSql) ?? Promise.reject(new Error("Turso client is unavailable"));
  globalDatabase.__kileniDatabaseReady = { key: clientKey, promise: ready };
  await ready;
}

export type SqlClient = Pick<Client, "execute" | "batch" | "transaction">;

export const database = {
  async execute(statement: InStatement | string, args?: InArgs): Promise<ResultSet> {
    await ensureDatabaseReady();
    if (remoteClient) {
      if (typeof statement === "string") return args === undefined ? remoteClient.execute(statement) : remoteClient.execute(statement, args);
      return remoteClient.execute(statement);
    }
    return enqueueLocal(() => executeLocal(statement, args));
  },
  async batch(statements: Array<InStatement | [string, InArgs?]>, mode?: "read" | "write" | "deferred"): Promise<ResultSet[]> {
    await ensureDatabaseReady();
    if (remoteClient) return remoteClient.batch(statements, mode);
    return enqueueLocal(() => executeLocalTransaction(async (transaction) => {
      const results: ResultSet[] = [];
      for (const statement of statements) {
        results.push(Array.isArray(statement)
          ? await transaction.execute({ sql: statement[0], args: statement[1] })
          : await transaction.execute(statement));
      }
      return results;
    }, mode));
  },
  async transaction<T>(callback: (transaction: Transaction) => Promise<T>, mode: "read" | "write" | "deferred" = "write"): Promise<T> {
    await ensureDatabaseReady();
    if (!remoteClient) return enqueueLocal(() => executeLocalTransaction(callback, mode));
    const transaction = await remoteClient.transaction(mode);
    try {
      const result = await callback(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback().catch(() => undefined);
      throw error;
    } finally {
      transaction.close();
    }
  },
};

// Закрывает оба соединения с локальным файлом. Это необходимо для корректного
// завершения одноразовых процессов и тестов на Windows, где открытый SQLite-файл
// нельзя удалить. В обычном серверном процессе соединения остаются долгоживущими.
export async function closeDatabaseConnections(): Promise<void> {
  await localOperationTail;
  if (remoteClient && globalDatabase.__kileniLibsql?.client === remoteClient) {
    remoteClient.close();
    delete globalDatabase.__kileniLibsql;
  }
  if (globalDatabase.__kileniSqlite?.connection === sqlite) {
    if (sqlite.open) sqlite.close();
    delete globalDatabase.__kileniSqlite;
  }
  if (globalDatabase.__kileniDatabaseReady?.key === clientKey) {
    delete globalDatabase.__kileniDatabaseReady;
  }
}

function enqueueLocal<T>(operation: () => Promise<T> | T): Promise<T> {
  const result = localOperationTail.then(operation);
  localOperationTail = result.then(() => undefined, () => undefined);
  return result;
}

function executeLocal(statement: InStatement | string, explicitArgs?: InArgs): ResultSet {
  const sql = typeof statement === "string" ? statement : statement.sql;
  const args = normalizeArgs(typeof statement === "string" ? explicitArgs : statement.args);
  const prepared = sqlite.prepare(sql);
  const columns = prepared.reader ? prepared.columns() : [];

  if (prepared.reader) {
    const rawRows = Array.isArray(args)
      ? prepared.all(...args)
      : args === undefined
        ? prepared.all()
        : prepared.all(args);
    return resultSet(
      columns.map((column) => column.name),
      columns.map((column) => column.type ?? ""),
      rawRows as Row[],
      0,
      undefined,
    );
  }

  const run = Array.isArray(args)
    ? prepared.run(...args)
    : args === undefined
      ? prepared.run()
      : prepared.run(args);
  const isInsert = /^\s*(?:insert|replace)\b/iu.test(sql);
  return resultSet([], [], [], run.changes, isInsert ? BigInt(run.lastInsertRowid) : undefined);
}

async function executeLocalTransaction<T>(
  callback: (transaction: Transaction) => Promise<T>,
  mode: "read" | "write" | "deferred" = "write",
): Promise<T> {
  sqlite.exec(mode === "write" ? "BEGIN IMMEDIATE" : "BEGIN DEFERRED");
  let closed = false;
  const transaction = {
    execute: async (statement: InStatement) => executeLocal(statement),
    batch: async (statements: InStatement[]) => statements.map((statement) => executeLocal(statement)),
    executeMultiple: async (sql: string) => { sqlite.exec(sql); },
    rollback: async () => {
      if (!closed && sqlite.inTransaction) sqlite.exec("ROLLBACK");
      closed = true;
    },
    commit: async () => {
      if (!closed && sqlite.inTransaction) sqlite.exec("COMMIT");
      closed = true;
    },
    close: () => {
      if (!closed && sqlite.inTransaction) sqlite.exec("ROLLBACK");
      closed = true;
    },
    get closed() { return closed; },
  } as Transaction;

  try {
    const value = await callback(transaction);
    if (!transaction.closed) await transaction.commit();
    return value;
  } catch (error) {
    if (!transaction.closed) await transaction.rollback();
    throw error;
  } finally {
    transaction.close();
  }
}

function normalizeArgs(args: InArgs | undefined): unknown[] | Record<string, unknown> | undefined {
  if (args === undefined) return undefined;
  if (Array.isArray(args)) return args.map(normalizeValue);
  return Object.fromEntries(Object.entries(args).map(([key, value]) => [key, normalizeValue(value)]));
}

function normalizeValue(value: unknown): unknown {
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  return value;
}

function resultSet(
  columns: string[],
  columnTypes: string[],
  rows: Row[],
  rowsAffected: number,
  lastInsertRowid: bigint | undefined,
): ResultSet {
  return {
    columns,
    columnTypes,
    rows,
    rowsAffected,
    lastInsertRowid,
    toJSON: () => ({ columns, columnTypes, rows, rowsAffected, lastInsertRowid: lastInsertRowid?.toString() }),
  };
}

export { databasePath };
