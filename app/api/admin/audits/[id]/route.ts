import { randomUUID } from "node:crypto";

import { z } from "zod";

import { database } from "@/src/db/client";
import { updateAdminEntityMetadataOn } from "@/src/db/admin-entity-metadata";
import { apiError, jsonReadError, noStoreJson, readJson, validUuid } from "../../../_lib/http";
import { zodError } from "../../../_lib/submission";
import { adminMutationGuard } from "../../_lib/guard";

export const runtime = "nodejs";

const patchSchema = z.object({
  note: z.string().trim().min(1).max(3000).optional(),
  status: z.enum(["queued", "failed"]).optional(),
  qaLabel: z.union([z.string().trim().min(2).max(80), z.null()]).optional(),
  archived: z.boolean().optional(),
}).refine((value) => value.note !== undefined || value.status !== undefined || value.qaLabel !== undefined || value.archived !== undefined, "Нет изменений");

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
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
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) return zodError(parsed.error);
  try {
    const result = await database.transaction(async (transaction) => {
      const auditResult = await transaction.execute({ sql: "SELECT status FROM audits WHERE id=? LIMIT 1", args: [id] });
      const audit = auditResult.rows[0] as unknown as { status: string } | undefined;
      if (!audit) return "missing" as const;
      if (parsed.data.status === "queued" && audit.status !== "failed") return "transition" as const;
      if (parsed.data.status === "failed" && audit.status !== "queued") return "transition" as const;
      const now = Date.now();
      if (parsed.data.status === "queued") {
        await transaction.execute({ sql: `UPDATE audits SET status='queued', started_at=NULL, completed_at=NULL,
          pages_discovered=0, pages_checked=0, overall_score=NULL, grade=NULL, partial=0,
          error_summary=NULL, public_result_json=NULL, full_result_json=NULL, updated_at=? WHERE id=?`, args: [now, id] });
        await transaction.execute({ sql: "DELETE FROM audit_pages WHERE audit_id=?", args: [id] });
        await transaction.execute({ sql: "DELETE FROM audit_issues WHERE audit_id=?", args: [id] });
        await transaction.execute({ sql: "INSERT INTO audit_events(audit_id,event,payload_json,created_at) VALUES (?, 'queued', ?, ?)", args: [id, JSON.stringify({ admin: true, retry: true }), now] });
      } else if (parsed.data.status === "failed") {
        await transaction.execute({ sql: "UPDATE audits SET status='failed', error_summary='Остановлено администратором', completed_at=?, updated_at=? WHERE id=?", args: [now, now, id] });
        await transaction.execute({ sql: "INSERT INTO audit_events(audit_id,event,payload_json,created_at) VALUES (?, 'failed', ?, ?)", args: [id, JSON.stringify({ admin: true }), now] });
      }
      if (parsed.data.note) {
        await transaction.execute({ sql: "INSERT INTO admin_notes(id,entity_type,entity_id,note,created_at) VALUES (?, 'audit', ?, ?, ?)", args: [randomUUID(), id, parsed.data.note, now] });
      }
      if (parsed.data.qaLabel !== undefined || parsed.data.archived !== undefined) {
        await updateAdminEntityMetadataOn(transaction, "audit", id, {
          qaLabel: parsed.data.qaLabel,
          archived: parsed.data.archived,
        });
      }
      return "ok" as const;
    });
    if (result === "missing") return apiError(404, "AUDIT_NOT_FOUND", "Аудит не найден");
    if (result === "transition") return apiError(409, "INVALID_STATUS_TRANSITION", "Этот переход статуса небезопасен");
    return noStoreJson({ ok: true, status: parsed.data.status ?? null });
  } catch {
    return apiError(500, "UPDATE_FAILED", "Не удалось сохранить изменения");
  }
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
    const deleted = await database.transaction(async (transaction) => {
      const existing = await transaction.execute({ sql: "SELECT 1 FROM audits WHERE id=? LIMIT 1", args: [id] });
      if (!existing.rows[0]) return false;
      await transaction.execute({ sql: "DELETE FROM admin_notes WHERE entity_type='audit' AND entity_id=?", args: [id] });
      await transaction.execute({ sql: "DELETE FROM notification_events WHERE entity_type='audit' AND entity_id=?", args: [id] });
      await transaction.execute({ sql: "DELETE FROM admin_entity_metadata WHERE entity_type='audit' AND entity_id=?", args: [id] });
      await transaction.execute({ sql: "DELETE FROM audit_events WHERE audit_id=?", args: [id] });
      await transaction.execute({ sql: "DELETE FROM audit_pages WHERE audit_id=?", args: [id] });
      await transaction.execute({ sql: "DELETE FROM audit_issues WHERE audit_id=?", args: [id] });
      await transaction.execute({ sql: "DELETE FROM audits WHERE id=?", args: [id] });
      return true;
    });
    return deleted ? noStoreJson({ ok: true }) : apiError(404, "AUDIT_NOT_FOUND", "Аудит не найден");
  } catch {
    return apiError(500, "DELETE_FAILED", "Не удалось удалить аудит");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
