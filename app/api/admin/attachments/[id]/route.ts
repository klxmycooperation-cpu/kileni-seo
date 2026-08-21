import { sqlite } from "@/src/db/client";
import { apiError, validUuid } from "../../../_lib/http";
import { readPrivateFile } from "../../../_lib/uploads";
import { adminGuard } from "../../_lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = adminGuard(request);
  if (guard) return guard;
  const { id } = await context.params;
  if (!validUuid(id)) return apiError(400, "INVALID_ID", "Некорректный идентификатор");
  const attachment = sqlite.prepare(`SELECT storage_name AS storageName, original_name AS originalName, mime, size
    FROM attachments WHERE id=? LIMIT 1`).get(id) as {
      storageName: string; originalName: string; mime: string; size: number;
    } | undefined;
  if (!attachment) return apiError(404, "ATTACHMENT_NOT_FOUND", "Файл не найден");
  try {
    const bytes = await readPrivateFile(attachment.storageName);
    if (!bytes || bytes.byteLength !== attachment.size) return apiError(404, "ATTACHMENT_NOT_FOUND", "Файл не найден");
    return new Response(Uint8Array.from(bytes), {
      status: 200,
      headers: {
        "content-type": attachment.mime,
        "content-length": String(bytes.byteLength),
        "content-disposition": contentDisposition(attachment.originalName),
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
        "content-security-policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return apiError(500, "ATTACHMENT_READ_FAILED", "Не удалось прочитать файл");
  }
}

function contentDisposition(filename: string): string {
  const fallback = filename.replace(/[^A-Za-z0-9._-]/gu, "_").slice(0, 120) || "attachment";
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
