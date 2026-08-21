import { randomUUID } from "node:crypto";

import { z } from "zod";

import { sqlite } from "@/src/db/client";
import { apiError, jsonReadError, noStoreJson, readJson, validUuid } from "../../_lib/http";
import { zodError } from "../../_lib/submission";
import { adminMutationGuard } from "./guard";

export type SubmissionEntity = "lead" | "brief";

const statusSchema = z.enum(["new", "contacted", "clarification", "proposal_sent", "in_work", "won", "lost"]);
const patchSchema = z.object({
  status: statusSchema.optional(),
  note: z.string().trim().min(1).max(3000).optional(),
}).refine((value) => value.status !== undefined || value.note !== undefined, "Нет изменений");

const deleteSchema = z.object({
  id: z.string().uuid(),
  confirmation: z.literal("DELETE"),
});

const config = {
  lead: { table: "leads", notesType: "lead" },
  brief: { table: "brief_submissions", notesType: "brief" },
} as const;

export async function patchSubmission(request: Request, id: string, entity: SubmissionEntity) {
  const guard = adminMutationGuard(request);
  if (guard) return guard;
  if (!validUuid(id)) return apiError(400, "INVALID_ID", "Некорректный идентификатор");
  let raw: unknown;
  try {
    raw = await readJson(request, 8 * 1024);
  } catch (error) {
    return jsonReadError(error);
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) return zodError(parsed.error);
  const selected = config[entity];
  try {
    const changed = sqlite.transaction(() => {
      const exists = sqlite.prepare(`SELECT 1 FROM ${selected.table} WHERE id=? LIMIT 1`).get(id);
      if (!exists) return false;
      if (parsed.data.status) {
        sqlite.prepare(`UPDATE ${selected.table} SET status=? WHERE id=?`).run(parsed.data.status, id);
      }
      if (parsed.data.note) {
        sqlite.prepare("INSERT INTO admin_notes(id,entity_type,entity_id,note,created_at) VALUES (?,?,?,?,?)")
          .run(randomUUID(), selected.notesType, id, parsed.data.note, Date.now());
      }
      return true;
    })();
    return changed
      ? noStoreJson({ ok: true, status: parsed.data.status ?? null })
      : apiError(404, "NOT_FOUND", "Запись не найдена");
  } catch {
    return apiError(500, "UPDATE_FAILED", "Не удалось сохранить изменения");
  }
}

export async function deleteSubmission(request: Request, id: string, entity: SubmissionEntity) {
  const guard = adminMutationGuard(request);
  if (guard) return guard;
  if (!validUuid(id)) return apiError(400, "INVALID_ID", "Некорректный идентификатор");
  let raw: unknown;
  try {
    raw = await readJson(request, 8 * 1024);
  } catch (error) {
    return jsonReadError(error);
  }
  const parsed = deleteSchema.safeParse(raw);
  if (!parsed.success || parsed.data.id !== id) {
    return apiError(409, "DELETE_NOT_CONFIRMED", "Удаление не подтверждено");
  }
  const selected = config[entity];
  try {
    const deleted = sqlite.transaction(() => {
      const exists = sqlite.prepare(`SELECT 1 FROM ${selected.table} WHERE id=? LIMIT 1`).get(id);
      if (!exists) return false;
      if (entity === "lead") sqlite.prepare("DELETE FROM calculator_requests WHERE lead_id=?").run(id);
      sqlite.prepare("DELETE FROM admin_notes WHERE entity_type=? AND entity_id=?").run(selected.notesType, id);
      sqlite.prepare("DELETE FROM notification_events WHERE entity_type=? AND entity_id=?").run(selected.notesType, id);
      sqlite.prepare(`DELETE FROM ${selected.table} WHERE id=?`).run(id);
      return true;
    })();
    return deleted ? noStoreJson({ ok: true }) : apiError(404, "NOT_FOUND", "Запись не найдена");
  } catch {
    return apiError(500, "DELETE_FAILED", "Не удалось удалить запись");
  }
}
