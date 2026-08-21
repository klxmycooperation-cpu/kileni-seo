import { sqlite } from "@/src/db/client";
import { apiError, jsonReadError, noStoreJson, readJson, validUuid } from "../../../_lib/http";
import { removePrivateFiles } from "../../../_lib/uploads";
import { adminMutationGuard } from "../../_lib/guard";
import { patchSubmission } from "../../_lib/entities";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return patchSubmission(request, (await context.params).id, "brief");
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = adminMutationGuard(request);
  if (guard) return guard;
  const { id } = await context.params;
  if (!validUuid(id)) return apiError(400, "INVALID_ID", "Некорректный идентификатор");
  let raw: unknown;
  try {
    raw = await readJson(request, 8 * 1024);
  } catch (error) {
    return jsonReadError(error);
  }
  if (!isRecord(raw) || raw.id !== id || raw.confirmation !== "DELETE") {
    return apiError(409, "DELETE_NOT_CONFIRMED", "Удаление не подтверждено");
  }
  try {
    const storageNames = sqlite.prepare("SELECT storage_name AS storageName FROM attachments WHERE brief_id=?")
      .all(id) as { storageName: string }[];
    const exists = sqlite.prepare("SELECT 1 FROM brief_submissions WHERE id=? LIMIT 1").get(id);
    if (!exists) return apiError(404, "NOT_FOUND", "Бриф не найден");
    try {
      await removePrivateFiles(storageNames.map((row) => row.storageName));
    } catch {
      return apiError(500, "FILE_DELETE_FAILED", "Не удалось удалить приватные вложения; бриф сохранён");
    }
    const deleted = sqlite.transaction(() => {
      sqlite.prepare("DELETE FROM attachments WHERE brief_id=?").run(id);
      sqlite.prepare("DELETE FROM admin_notes WHERE entity_type='brief' AND entity_id=?").run(id);
      sqlite.prepare("DELETE FROM notification_events WHERE entity_type='brief' AND entity_id=?").run(id);
      return sqlite.prepare("DELETE FROM brief_submissions WHERE id=?").run(id).changes > 0;
    })();
    if (!deleted) return apiError(404, "NOT_FOUND", "Бриф уже удалён");
    return noStoreJson({ ok: true });
  } catch {
    return apiError(500, "DELETE_FAILED", "Не удалось удалить бриф");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
