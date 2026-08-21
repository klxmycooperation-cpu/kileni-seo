import { sqlite } from "@/src/db/client";
import { getAuditById } from "@/src/db/queries";
import { apiError, safeJsonParse, validUuid } from "../../../../_lib/http";
import { adminGuard } from "../../../_lib/guard";
import { createAdminAuditPdf } from "@/src/lib/reports/audit-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = adminGuard(request);
  if (guard) return guard;
  const { id } = await context.params;
  if (!validUuid(id)) return apiError(400, "INVALID_ID", "Некорректный идентификатор");
  const audit = getAuditById(id);
  if (!audit) return apiError(404, "AUDIT_NOT_FOUND", "Аудит не найден");

  const pages = sqlite.prepare(`SELECT id,url,status_code AS statusCode,depth,data_json AS dataJson,created_at AS createdAt
    FROM audit_pages WHERE audit_id=? ORDER BY created_at,id`).all(id) as Array<Record<string, unknown> & { dataJson: string | null }>;
  const issues = sqlite.prepare(`SELECT id,code,category,severity,url,evidence,recommendation,created_at AS createdAt
    FROM audit_issues WHERE audit_id=? ORDER BY created_at,id`).all(id);
  const events = sqlite.prepare(`SELECT id,event,payload_json AS payloadJson,created_at AS createdAt
    FROM audit_events WHERE audit_id=? ORDER BY id`).all(id) as Array<Record<string, unknown> & { payloadJson: string | null }>;
  if (new URL(request.url).searchParams.get("format") === "pdf") {
    try {
      const bytes = await createAdminAuditPdf({
        audit,
        fullResult: safeJsonParse(audit.fullResultJson),
        issues: issues as Record<string, unknown>[],
        pages: pages.map(({ dataJson, ...page }) => ({ ...page, data: safeJsonParse(dataJson) })),
      });
      return new Response(Uint8Array.from(bytes), { status: 200, headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="audit-${id}.pdf"`, "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
    } catch {
      return apiError(500, "PDF_EXPORT_FAILED", "Не удалось сформировать PDF");
    }
  }
  const body = JSON.stringify({
    exportedAt: new Date().toISOString(),
    audit: {
      ...audit,
      partial: Boolean(audit.partial),
      publicResult: safeJsonParse(audit.publicResultJson),
      fullResult: safeJsonParse(audit.fullResultJson),
      publicResultJson: undefined,
      fullResultJson: undefined,
    },
    pages: pages.map(({ dataJson, ...page }) => ({ ...page, data: safeJsonParse(dataJson) })),
    issues,
    events: events.map(({ payloadJson, ...event }) => ({ ...event, payload: safeJsonParse(payloadJson) })),
  }, null, 2);
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="audit-${id}.json"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
