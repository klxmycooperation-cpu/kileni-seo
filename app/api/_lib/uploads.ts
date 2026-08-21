import { constants as fsConstants } from "node:fs";
import { chmod, mkdir, open, readFile, unlink } from "node:fs/promises";
import { basename, extname, isAbsolute, relative, resolve, sep } from "node:path";
import { inflateRawSync } from "node:zlib";
import { XMLParser, XMLValidator } from "fast-xml-parser";

const STORAGE_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:pdf|docx|xlsx|png|jpe?g)$/iu;
const ZIP_LOCAL_FILE = 0x04034b50;
const ZIP_CENTRAL_FILE = 0x02014b50;
const ZIP_END = 0x06054b50;
const MAX_ZIP_ENTRIES = 2_000;
const MAX_EXPANDED_BYTES = 50 * 1024 * 1024;
const SUSPICIOUS_ARCHIVE_PATH = /(?:^|\/)(?:vbaProject\.bin|connections\.xml|.*\.(?:exe|dll|com|scr|js|jse|vbs|vbe|bat|cmd|ps1|sh|lnk|jar|msi)|(?:activeX|embeddings|externalLinks|queryTables)\/)/iu;
const ACTIVE_OOXML_SEMANTIC = /(?:oleObject|activeX|embeddedPackage|vbaProject|externalLink|attachedTemplate|connections|queryTable)/iu;
const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@", processEntities: true });

export function uploadsRoot(): string {
  const root = resolve(process.env.PRIVATE_UPLOADS_PATH ?? "./data/uploads");
  const publicRoot = resolve(process.cwd(), "public");
  const fromPublic = relative(publicRoot, root);
  if (fromPublic === "" || (!fromPublic.startsWith(`..${sep}`) && fromPublic !== ".." && !isAbsolute(fromPublic))) {
    throw new Error("PRIVATE_UPLOADS_PATH must be outside public");
  }
  return root;
}

export async function ensureUploadsRoot(): Promise<string> {
  const root = uploadsRoot();
  await mkdir(root, { recursive: true, mode: 0o700 });
  await chmod(root, 0o700);
  return root;
}

export function safeStoragePath(root: string, storageName: string): string | null {
  if (!STORAGE_NAME.test(storageName) || basename(storageName) !== storageName) return null;
  const candidate = resolve(root, storageName);
  return candidate.startsWith(`${root}${sep}`) ? candidate : null;
}

export async function writePrivateFile(root: string, storageName: string, bytes: Uint8Array): Promise<string> {
  const target = safeStoragePath(root, storageName);
  if (!target) throw new Error("Unsafe storage name");
  const handle = await open(target, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY, 0o600);
  try {
    await handle.writeFile(bytes);
  } finally {
    await handle.close();
  }
  return target;
}

export async function readPrivateFile(storageName: string): Promise<Buffer | null> {
  const root = uploadsRoot();
  const target = safeStoragePath(root, storageName);
  if (!target) return null;
  try {
    return await readFile(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function removePrivateFiles(storageNames: readonly string[]): Promise<void> {
  const root = uploadsRoot();
  const results = await Promise.allSettled(storageNames.map(async (storageName) => {
    const target = safeStoragePath(root, storageName);
    if (!target) return;
    try {
      await unlink(target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }));
  const failed = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
  if (failed) throw failed.reason;
}

export function extensionForUpload(name: string): string {
  return extname(name).toLowerCase();
}

export function hasOpenXmlSignature(bytes: Uint8Array, mime: string): boolean {
  if (mime !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
      mime !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return true;
  try {
    return validateOpenXmlPackage(Buffer.from(bytes), mime.includes("wordprocessingml") ? "word" : "xl");
  } catch {
    return false;
  }
}

type ZipEntry = {
  name: string;
  flags: number;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
};

function validateOpenXmlPackage(buffer: Buffer, kind: "word" | "xl"): boolean {
  if (buffer.byteLength < 22 || buffer.readUInt32LE(0) !== ZIP_LOCAL_FILE) return false;
  const entries = readCentralDirectory(buffer);
  const names = new Set<string>();
  const canonicalNames = new Set<string>();
  const mainPart = kind === "word" ? "word/document.xml" : "xl/workbook.xml";
  const mainContentType = kind === "word"
    ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"
    : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml";
  let expandedTotal = 0;
  let compressedTotal = 0;
  let contentTypes = "";
  let rootRelationships = "";
  let mainPrefix = "";

  for (const entry of entries) {
    const canonicalName = entry.name.normalize("NFC").toLowerCase();
    if (!safeArchiveName(entry.name) || canonicalNames.has(canonicalName) || SUSPICIOUS_ARCHIVE_PATH.test(entry.name)) return false;
    names.add(entry.name);
    canonicalNames.add(canonicalName);
    if ((entry.flags & 0x2041) !== 0 || (entry.method !== 0 && entry.method !== 8)) return false;
    if (entry.name.endsWith("/")) {
      if (entry.uncompressedSize !== 0) return false;
      continue;
    }
    if (entry.uncompressedSize > MAX_EXPANDED_BYTES ||
        (entry.compressedSize === 0 && entry.uncompressedSize > 0) ||
        entry.uncompressedSize > Math.max(1024, entry.compressedSize * 200)) return false;
    const expanded = expandEntry(buffer, entry, MAX_EXPANDED_BYTES - expandedTotal);
    if (!expanded || expanded.byteLength !== entry.uncompressedSize) return false;
    expandedTotal += expanded.byteLength;
    compressedTotal += entry.compressedSize;
    if (expandedTotal > MAX_EXPANDED_BYTES ||
        (compressedTotal > 0 && expandedTotal > compressedTotal * 100)) return false;
    if (entry.name === "[Content_Types].xml") contentTypes = limitedXml(expanded);
    if (entry.name === "_rels/.rels") rootRelationships = limitedXml(expanded);
    if (entry.name === mainPart) mainPrefix = expanded.subarray(0, 8 * 1024).toString("utf8");
    if (entry.name.toLowerCase().endsWith(".rels")) {
      const relationships = limitedXml(expanded);
      if (/<!DOCTYPE/iu.test(relationships) ||
          /\bTargetMode\s*=/iu.test(relationships) ||
          XMLValidator.validate(relationships) !== true ||
          !relationshipSemanticsSafe(relationships)) return false;
    }
  }

  if (!names.has("[Content_Types].xml") || !names.has("_rels/.rels") || !names.has(mainPart)) return false;
  const contentTypeValues = xmlSemanticValues(contentTypes);
  if (!contentTypeValues.some((value) => value.includes(mainContentType)) ||
      contentTypeValues.some((value) => ACTIVE_OOXML_SEMANTIC.test(value)) ||
      /<!DOCTYPE/iu.test(contentTypes)) return false;
  if (!relationshipTargets(rootRelationships).some((target) => target.includes(mainPart)) ||
      /<!DOCTYPE/iu.test(rootRelationships)) return false;
  if (XMLValidator.validate(contentTypes) !== true || XMLValidator.validate(rootRelationships) !== true ||
      /<!DOCTYPE/iu.test(mainPrefix) ||
      (kind === "word"
        ? !/<(?:[A-Za-z_][\w.-]*:)?document\b/iu.test(mainPrefix)
        : !/<(?:[A-Za-z_][\w.-]*:)?workbook\b/iu.test(mainPrefix))) return false;
  return true;
}

function readCentralDirectory(buffer: Buffer): ZipEntry[] {
  const minimum = Math.max(0, buffer.byteLength - 65_557);
  let endOffset = -1;
  for (let offset = buffer.byteLength - 22; offset >= minimum; offset -= 1) {
    if (buffer.readUInt32LE(offset) === ZIP_END) { endOffset = offset; break; }
  }
  if (endOffset < 0) throw new Error("ZIP end record not found");
  const disk = buffer.readUInt16LE(endOffset + 4);
  const centralDisk = buffer.readUInt16LE(endOffset + 6);
  const diskEntries = buffer.readUInt16LE(endOffset + 8);
  const totalEntries = buffer.readUInt16LE(endOffset + 10);
  const centralSize = buffer.readUInt32LE(endOffset + 12);
  const centralOffset = buffer.readUInt32LE(endOffset + 16);
  const commentLength = buffer.readUInt16LE(endOffset + 20);
  if (disk !== 0 || centralDisk !== 0 || diskEntries !== totalEntries || totalEntries < 1 ||
      totalEntries > MAX_ZIP_ENTRIES || centralSize === 0xffffffff || centralOffset === 0xffffffff ||
      endOffset + 22 + commentLength !== buffer.byteLength || centralOffset + centralSize > endOffset) {
    throw new Error("Unsupported ZIP layout");
  }

  const entries: ZipEntry[] = [];
  let cursor = centralOffset;
  for (let index = 0; index < totalEntries; index += 1) {
    if (cursor + 46 > endOffset || buffer.readUInt32LE(cursor) !== ZIP_CENTRAL_FILE) throw new Error("Invalid ZIP entry");
    const versionMade = buffer.readUInt16LE(cursor + 4);
    const flags = buffer.readUInt16LE(cursor + 8);
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const entryCommentLength = buffer.readUInt16LE(cursor + 32);
    const startDisk = buffer.readUInt16LE(cursor + 34);
    const externalAttributes = buffer.readUInt32LE(cursor + 38);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const next = cursor + 46 + nameLength + extraLength + entryCommentLength;
    if (next > endOffset || compressedSize === 0xffffffff || uncompressedSize === 0xffffffff ||
        localOffset === 0xffffffff || startDisk !== 0 ||
        ((versionMade >>> 8) === 3 && ((externalAttributes >>> 16) & 0xf000) === 0xa000)) {
      throw new Error("Unsupported ZIP entry");
    }
    const name = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");
    entries.push({ name, flags, method, compressedSize, uncompressedSize, localOffset });
    cursor = next;
  }
  if (cursor !== centralOffset + centralSize) throw new Error("Invalid ZIP central directory size");
  return entries;
}

function expandEntry(buffer: Buffer, entry: ZipEntry, remaining: number): Buffer | null {
  if (remaining < 0 || entry.localOffset + 30 > buffer.byteLength || buffer.readUInt32LE(entry.localOffset) !== ZIP_LOCAL_FILE) return null;
  const localFlags = buffer.readUInt16LE(entry.localOffset + 6);
  const localMethod = buffer.readUInt16LE(entry.localOffset + 8);
  const nameLength = buffer.readUInt16LE(entry.localOffset + 26);
  const extraLength = buffer.readUInt16LE(entry.localOffset + 28);
  const dataOffset = entry.localOffset + 30 + nameLength + extraLength;
  const dataEnd = dataOffset + entry.compressedSize;
  const localName = buffer.subarray(entry.localOffset + 30, entry.localOffset + 30 + nameLength).toString("utf8");
  if (localFlags !== entry.flags || localMethod !== entry.method || localName !== entry.name || dataEnd > buffer.byteLength) return null;
  const compressed = buffer.subarray(dataOffset, dataEnd);
  if (entry.method === 0) return Buffer.from(compressed);
  return inflateRawSync(compressed, { maxOutputLength: Math.max(1, remaining) });
}

function safeArchiveName(name: string): boolean {
  if (!name || name.includes("\0") || name.includes("\\") || name.includes("\ufffd") ||
      name.startsWith("/") || /^[A-Za-z]:/u.test(name)) return false;
  return name.split("/").every((segment) => segment !== ".." && segment !== ".");
}

function limitedXml(bytes: Buffer): string {
  if (bytes.byteLength > 1024 * 1024) throw new Error("OOXML metadata is too large");
  return bytes.toString("utf8");
}

function relationshipSemanticsSafe(xml: string): boolean {
  if (xmlSemanticValues(xml).some((value) => ACTIVE_OOXML_SEMANTIC.test(value))) return false;
  for (const target of relationshipTargets(xml)) {
    const normalized = target.trim();
    if (/^[A-Za-z][A-Za-z\d+.-]*:/u.test(normalized) || normalized.startsWith("//") || normalized.startsWith("\\")) {
      return false;
    }
  }
  return true;
}

function relationshipTargets(xml: string): string[] {
  const parsed = xmlParser.parse(xml) as unknown;
  const targets: string[] = [];
  visitXml(parsed, (key, value) => {
    if (key.replace(/^@/u, "").split(":").at(-1) === "Target" && typeof value === "string") targets.push(value);
  });
  return targets;
}

function xmlSemanticValues(xml: string): string[] {
  const parsed = xmlParser.parse(xml) as unknown;
  const values: string[] = [];
  visitXml(parsed, (_key, value) => { if (typeof value === "string") values.push(value); });
  return values;
}

function visitXml(value: unknown, visitor: (key: string, value: unknown) => void): void {
  if (Array.isArray(value)) {
    for (const item of value) visitXml(item, visitor);
    return;
  }
  if (typeof value !== "object" || value === null) return;
  for (const [key, child] of Object.entries(value)) {
    visitor(key, child);
    visitXml(child, visitor);
  }
}
