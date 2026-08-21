import { randomBytes } from "node:crypto";
import {
  access,
  chmod,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
} from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

import {
  assertPathInside,
  BACKUP_FORMAT,
  BACKUP_SCHEMA_VERSION,
  checkDatabase,
  copyRegularTree,
  createBackup,
  sha256File,
  walkRegularFiles,
} from "./backup.mjs";

function usage() {
  return "Использование: node scripts/restore.mjs <каталог-копии> --confirm";
}

function parseArguments(argv) {
  let backupRoot;
  let confirmed = false;
  for (const argument of argv) {
    if (argument === "--confirm") confirmed = true;
    else if (argument === "--help" || argument === "-h") return { help: true };
    else if (!argument.startsWith("-") && !backupRoot) backupRoot = argument;
    else throw new Error(`Неизвестный аргумент: ${argument}`);
  }
  if (!backupRoot) throw new Error(`Не указан каталог резервной копии. ${usage()}`);
  if (!confirmed) throw new Error(`Восстановление требует явного флага --confirm. ${usage()}`);
  return { help: false, backupRoot: resolve(backupRoot) };
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function loadAndVerifyBackup(backupRoot) {
  const manifestPath = assertPathInside(backupRoot, join(backupRoot, "manifest.json"));
  const manifestInfo = await lstat(manifestPath);
  if (!manifestInfo.isFile() || manifestInfo.isSymbolicLink()) throw new Error("manifest.json должен быть обычным файлом");
  const raw = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(raw);
  if (manifest?.format !== BACKUP_FORMAT || manifest?.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new Error("Формат или версия резервной копии не поддерживается");
  }
  if (manifest?.database?.file !== "database.sqlite" || !Array.isArray(manifest?.files)) {
    throw new Error("manifest.json не содержит обязательных полей");
  }

  const declaredPaths = new Set();
  for (const file of manifest.files) {
    if (!file || typeof file.path !== "string" || typeof file.sha256 !== "string" || !Number.isSafeInteger(file.bytes)) {
      throw new Error("manifest.json содержит некорректную запись файла");
    }
    const absolutePath = assertPathInside(backupRoot, join(backupRoot, ...file.path.split("/")));
    const info = await lstat(absolutePath);
    if (!info.isFile() || info.isSymbolicLink() || info.size !== file.bytes) throw new Error(`Размер файла не совпадает: ${file.path}`);
    if (await sha256File(absolutePath) !== file.sha256) throw new Error(`SHA-256 не совпадает: ${file.path}`);
    if (declaredPaths.has(file.path)) throw new Error(`Дублированный путь в manifest.json: ${file.path}`);
    declaredPaths.add(file.path);
  }
  if (!declaredPaths.has("database.sqlite")) throw new Error("В manifest.json отсутствует database.sqlite");

  const actualFiles = (await walkRegularFiles(backupRoot))
    .map((file) => file.relativePath)
    .filter((path) => path !== "manifest.json")
    .sort();
  const declaredFiles = [...declaredPaths].sort();
  if (JSON.stringify(actualFiles) !== JSON.stringify(declaredFiles)) {
    throw new Error("Состав файлов не совпадает с manifest.json");
  }

  const databaseBackupPath = assertPathInside(backupRoot, join(backupRoot, "database.sqlite"));
  checkDatabase(databaseBackupPath);
  return { manifest, databaseBackupPath, uploadsBackupPath: join(backupRoot, "uploads") };
}

async function installRestore(verified) {
  const databasePath = resolve(process.env.DATABASE_PATH ?? "./data/kileni.sqlite");
  const uploadsPath = resolve(process.env.PRIVATE_UPLOADS_PATH ?? "./data/uploads");
  const backupOutputPath = resolve(process.env.BACKUP_PATH ?? "./backups");
  await mkdir(dirname(databasePath), { recursive: true, mode: 0o700 });
  await mkdir(dirname(uploadsPath), { recursive: true, mode: 0o700 });

  let safetyBackup = null;
  if (await exists(databasePath)) {
    safetyBackup = await createBackup({ databasePath, uploadsPath, outputRoot: backupOutputPath });
  }

  const token = randomBytes(5).toString("hex");
  const databaseStageRoot = await mkdtemp(join(dirname(databasePath), ".kileni-db-restore-"));
  const uploadsStageRoot = await mkdtemp(join(dirname(uploadsPath), ".kileni-uploads-restore-"));
  const stagedDatabase = join(databaseStageRoot, "database.sqlite");
  const stagedUploads = join(uploadsStageRoot, "uploads");
  const oldDatabase = join(dirname(databasePath), `.${basename(databasePath)}.restore-old-${token}`);
  const oldUploads = join(dirname(uploadsPath), `.${basename(uploadsPath)}.restore-old-${token}`);
  const hadDatabase = await exists(databasePath);
  const hadUploads = await exists(uploadsPath);
  let databaseInstalled = false;
  let uploadsInstalled = false;

  try {
    await copyFile(verified.databaseBackupPath, stagedDatabase);
    await chmod(stagedDatabase, 0o600);
    checkDatabase(stagedDatabase);
    await copyRegularTree(verified.uploadsBackupPath, stagedUploads);

    // Сервисы должны быть остановлены. WAL/SHM не переносятся: проверенный
    // snapshot уже содержит согласованное состояние SQLite.
    await rm(`${databasePath}-wal`, { force: true });
    await rm(`${databasePath}-shm`, { force: true });
    if (hadDatabase) await rename(databasePath, oldDatabase);
    if (hadUploads) await rename(uploadsPath, oldUploads);
    await rename(stagedDatabase, databasePath);
    databaseInstalled = true;
    await rename(stagedUploads, uploadsPath);
    uploadsInstalled = true;
    checkDatabase(databasePath);
    await rm(oldDatabase, { force: true });
    await rm(oldUploads, { recursive: true, force: true });
    return { databasePath, uploadsPath, safetyBackup: safetyBackup?.backupRoot ?? null };
  } catch (error) {
    if (uploadsInstalled) await rm(uploadsPath, { recursive: true, force: true });
    if (databaseInstalled) await rm(databasePath, { force: true });
    if (hadUploads && await exists(oldUploads)) await rename(oldUploads, uploadsPath);
    if (hadDatabase && await exists(oldDatabase)) await rename(oldDatabase, databasePath);
    throw error;
  } finally {
    await rm(databaseStageRoot, { recursive: true, force: true });
    await rm(uploadsStageRoot, { recursive: true, force: true });
  }
}

async function main() {
  const arguments_ = parseArguments(process.argv.slice(2));
  if (arguments_.help) {
    console.log(usage());
    return;
  }
  const verified = await loadAndVerifyBackup(arguments_.backupRoot);
  const restored = await installRestore(verified);
  console.log(JSON.stringify({
    status: "ok",
    restoredAt: new Date().toISOString(),
    sourceCreatedAt: verified.manifest.createdAt,
    database: restored.databasePath,
    uploads: restored.uploadsPath,
    preRestoreBackup: restored.safetyBackup,
  }, null, 2));
}

main().catch((error) => {
  console.error(`Восстановление не выполнено: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
