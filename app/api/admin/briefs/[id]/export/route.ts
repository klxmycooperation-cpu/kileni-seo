import { adminBriefDetail } from "@/app/admin/_lib/data";
import { apiError, validUuid } from "@/app/api/_lib/http";
import { buildBriefExport, entityJsonDownload } from "@/app/api/admin/_lib/entity-export";
import { adminGuard } from "@/app/api/admin/_lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = adminGuard(request);
  if (guard) return guard;
  const { id } = await context.params;
  if (!validUuid(id)) return apiError(400, "INVALID_ID", "Некорректный идентификатор");
  const detail = await adminBriefDetail(id);
  if (!detail) return apiError(404, "NOT_FOUND", "Бриф не найден");
  return entityJsonDownload(buildBriefExport(detail), `brief-${id}.json`);
}
