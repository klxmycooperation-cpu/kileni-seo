import { extname } from "node:path";

export const allowedFiles = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
} as const;

export const maxFileCount = 5;
export const maxTotalFileBytes = 10 * 1024 * 1024;

export function safeOriginalFilename(name: string): string {
  return name.replace(/^.*[\\/]/u, "").replace(/[^\p{L}\p{N} ._()-]/gu, "_").slice(0, 180) || "file";
}

export function fileTypeAllowed(name: string, mime: string, bytes: Uint8Array): boolean {
  const extensions = allowedFiles[mime as keyof typeof allowedFiles];
  if (!extensions || !extensions.includes(extname(name).toLowerCase() as never)) return false;
  if (mime === "application/pdf") return bytes.slice(0, 5).toString() === "37,80,68,70,45";
  if (mime === "image/png") return bytes.slice(0, 8).toString() === "137,80,78,71,13,10,26,10";
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9;
  return bytes[0] === 0x50 && bytes[1] === 0x4b;
}
