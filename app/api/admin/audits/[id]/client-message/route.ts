import { z } from "zod";

import { adminAuditDetail } from "@/app/admin/_lib/data";
import { apiError, jsonReadError, noStoreJson, readJson, validUuid } from "@/app/api/_lib/http";
import { adminMutationGuard } from "@/app/api/admin/_lib/guard";
import { generateAuditClientMessage } from "@/src/lib/audit/client-message";
import { buildAuditClientPresentation } from "@/src/lib/audit/client-presentation";

export const runtime = "nodejs";

const bodySchema = z.object({
  variant: z.number().int().min(0).max(2).default(0),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = adminMutationGuard(request);
  if (guard) return guard;

  const { id } = await context.params;
  if (!validUuid(id)) return apiError(400, "INVALID_ID", "Некорректный идентификатор");

  let raw: unknown;
  try {
    raw = await readJson(request, 4 * 1024);
  } catch (error) {
    return jsonReadError(error);
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return apiError(422, "INVALID_INPUT", "Не удалось прочитать параметры генерации");

  try {
    const detail = await adminAuditDetail(id);
    if (!detail) return apiError(404, "AUDIT_NOT_FOUND", "Аудит не найден");
    if (!["completed", "partial"].includes(detail.audit.status)) {
      return apiError(409, "AUDIT_NOT_COMPLETED", "Текст можно подготовить после завершения аудита");
    }

    const source = detail.publicResult ?? detail.fullResult;
    if (!source) return apiError(409, "AUDIT_RESULT_MISSING", "В аудите нет сохранённого результата");
    const presentation = buildAuditClientPresentation(source, "ru");
    const message = generateAuditClientMessage({
      domain: detail.audit.normalizedDomain,
      presentation,
      variant: parsed.data.variant,
    });

    return noStoreJson({ message, variant: parsed.data.variant });
  } catch {
    return apiError(500, "CLIENT_MESSAGE_FAILED", "Не удалось подготовить текст. Попробуйте ещё раз");
  }
}
