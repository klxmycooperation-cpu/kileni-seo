import Database from "better-sqlite3";
import { createHash, randomBytes } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  chmod,
  copyFile,
  lstat,
  mkdir,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

export const BACKUP_FORMAT = "kileni-sqlite-backup";
export const BACKUP_SCHEMA_VERSION = 1;

function timestampForPath(date = new Date()) {
  return date.toISOString().replace(/[-:]/gu, "").replace(".", "");
}

function parseArguments(argv) {
  let outputRoot = process.env.BACKUP_PATH ?? "./backups";
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--output") {
      const value = argv[index + 1];
      if (!value) throw new Error("После --output нужен путь");
      outputRoot = value;
      index += 1;
    } else if (argument === "--help" || argument === "-h") {
      return { help: true, outputRoot };
    } else {
      throw new Error(`Неизвестный аргумент: ${argument}`);
    }
  }
  return { help: false, outputRoot };
}

export async function sha256File(filePath) {
  const hash = createHash("sha256");
  await new Promise((fulfill, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", fulfill);
  });
  return hash.digest("hex");
}

export async function walkRegularFiles(root, prefix = "") {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }

  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const absolutePath = join(root, entry.name);
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) {
      throw new Error(`Символические ссылки в резервной копии запрещены: ${absolutePath}`);
    }
    if (entry.isDirectory()) {
      files.push(...await walkRegularFiles(absolutePath, relativePath));
    } else if (entry.isFile()) {
      files.push({ absolutePath, relativePath });
    } else {
      throw new Error(`Неподдерживаемый тип файла: ${absolutePath}`);
    }
  }
  return files;
}

export async function copyRegularTree(sourceRoot, destinationRoot) {
  await mkdir(destinationRoot, { recursive: true, mode: 0o700 });
  const files = await walkRegularFiles(sourceRoot);
  for (const file of files) {
    const destination = join(destinationRoot, ...file.relativePath.split("/"));
    await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
    await copyFile(file.absolutePath, destination);
    await chmod(destination, 0o600);
  }
  return files.length;
}

async function copySnapshotUploads(databaseSnapshotPath, sourceRoot, destinationRoot) {
  const snapshot = new Database(databaseSnapshotPath, { readonly: true, fileMustExist: true });
  let references = null;
  try {
    const hasAttachments = snapshot.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name='attachments' LIMIT 1",
    ).get();
    if (hasAttachments) {
      references = snapshot.prepare(
        "SELECT storage_name AS storageName, size FROM attachments ORDER BY storage_name",
      ).all();
    }
  } finally {
    snapshot.close();
  }
  // This fallback keeps the utility usable for a pre-migration database. A
  // normal KILENI database always has the attachments table.
  if (references === null) return copyRegularTree(sourceRoot, destinationRoot);

  await mkdir(destinationRoot, { recursive: true, mode: 0o700 });
  const copied = new Set();
  for (const reference of references) {
    const storageName = String(reference.storageName ?? "");
    if (!storageName || basename(storageName) !== storageName || copied.has(storageName)) {
      if (copied.has(storageName)) continue;
      throw new Error(`Некорректное имя вложения в SQLite snapshot: ${storageName}`);
    }
    const source = assertPathInside(sourceRoot, join(sourceRoot, storageName));
    const destination = assertPathInside(destinationRoot, join(destinationRoot, storageName));
    const sourceInfo = await lstat(source).catch((error) => {
      if (error?.code === "ENOENT") throw new Error(`Вложение из SQLite snapshot не найдено: ${storageName}`);
      throw error;
    });
    if (!sourceInfo.isFile() || sourceInfo.size !== Number(reference.size)) {
      throw new Error(`Размер вложения не совпадает с SQLite snapshot: ${storageName}`);
    }
    await copyFile(source, destination);
    await chmod(destination, 0o600);
    const copiedInfo = await stat(destination);
    if (copiedInfo.size !== sourceInfo.size) throw new Error(`Вложение скопировано не полностью: ${storageName}`);
    copied.add(storageName);
  }
  return copied.size;
}

export function assertPathInside(root, candidate) {
  const normalizedRoot = resolve(root);
  const normalizedCandidate = resolve(candidate);
  const child = relative(normalizedRoot, normalizedCandidate);
  if (!child || child === ".." || child.startsWith(`..${sep}`)) {
    throw new Error(`Путь выходит за границы резервной копии: ${candidate}`);
  }
  return normalizedCandidate;
}

export function checkDatabase(databasePath) {
  const database = new Database(databasePath, { readonly: true, fileMustExist: true });
  try {
    database.pragma("busy_timeout = 5000");
    const integrity = database.pragma("integrity_check", { simple: true });
    if (integrity !== "ok") {
      throw new Error(`SQLite integrity_check: ${String(integrity)}`);
    }
    const foreignKeyErrors = database.pragma("foreign_key_check");
    if (foreignKeyErrors.length > 0) {
      throw new Error(`SQLite foreign_key_check: ${foreignKeyErrors.length} нарушений`);
    }
  } finally {
    database.close();
  }
}

function makeSnapshotPortable(databasePath) {
  const database = new Database(databasePath, { fileMustExist: true });
  try {
    database.pragma("busy_timeout = 5000");
    const journalMode = database.pragma("journal_mode = DELETE", { simple: true });
    if (String(journalMode).toLowerCase() !== "delete") {
      throw new Error(`Не удалось перевести SQLite snapshot в DELETE journal mode: ${String(journalMode)}`);
    }
  } finally {
    database.close();
  }
}

export async function createBackup(options = {}) {
  const databasePath = resolve(options.databasePath ?? process.env.DATABASE_PATH ?? "./data/kileni.sqlite");
  const uploadsPath = resolve(options.uploadsPath ?? process.env.PRIVATE_UPLOADS_PATH ?? "./data/uploads");
  const outputRoot = resolve(options.outputRoot ?? process.env.BACKUP_PATH ?? "./backups");

  const databaseInfo = await stat(databasePath).catch((error) => {
    if (error?.code === "ENOENT") throw new Error(`База данных не найдена: ${databasePath}`);
    throw error;
  });
  if (!databaseInfo.isFile()) throw new Error(`DATABASE_PATH не указывает на файл: ${databasePath}`);

  await mkdir(outputRoot, { recursive: true, mode: 0o700 });
  const suffix = randomBytes(3).toString("hex");
  const backupRoot = join(outputRoot, `kileni-backup-${timestampForPath()}-${suffix}`);
  await mkdir(backupRoot, { mode: 0o700 });

  const databaseBackupPath = join(backupRoot, "database.sqlite");
  const uploadsBackupPath = join(backupRoot, "uploads");
  let sourceDatabase;
  try {
    sourceDatabase = new Database(databasePath, { readonly: true, fileMustExist: true });
    sourceDatabase.pragma("busy_timeout = 10000");
    await sourceDatabase.backup(databaseBackupPath);
    sourceDatabase.close();
    sourceDatabase = undefined;
    makeSnapshotPortable(databaseBackupPath);
    await rm(`${databaseBackupPath}-wal`, { force: true });
    await rm(`${databaseBackupPath}-shm`, { force: true });
    await chmod(databaseBackupPath, 0o600);
    checkDatabase(databaseBackupPath);

    const uploadsCopied = await copySnapshotUploads(databaseBackupPath, uploadsPath, uploadsBackupPath);
    const payloadFiles = [
      { absolutePath: databaseBackupPath, relativePath: "database.sqlite" },
      ...await walkRegularFiles(uploadsBackupPath, "uploads"),
    ];
    const files = [];
    for (const file of payloadFiles) {
      const info = await stat(file.absolutePath);
      files.push({
        path: file.relativePath,
        bytes: info.size,
        sha256: await sha256File(file.absolutePath),
      });
    }

    const manifest = {
      format: BACKUP_FORMAT,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      createdAt: new Date().toISOString(),
      containsEnvironmentOrSecrets: false,
      database: { file: "database.sqlite", integrityCheck: "ok" },
      uploads: { directory: "uploads", files: uploadsCopied },
      files,
    };
    const manifestPath = join(backupRoot, "manifest.json");
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
    return { backupRoot, manifest };
  } catch (error) {
    sourceDatabase?.close();
    await rm(backupRoot, { recursive: true, force: true });
    throw error;
  }
}

async function main() {
  const arguments_ = parseArguments(process.argv.slice(2));
  if (arguments_.help) {
    console.log("Использование: node scripts/backup.mjs [--output <каталог>]");
    return;
  }
  const result = await createBackup({ outputRoot: arguments_.outputRoot });
  console.log(JSON.stringify({
    status: "ok",
    createdAt: result.manifest.createdAt,
    backup: result.backupRoot,
    files: result.manifest.files.length,
  }, null, 2));
}

const entry = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (entry === import.meta.url) {
  main().catch((error) => {
    console.error(`Резервное копирование не выполнено: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
