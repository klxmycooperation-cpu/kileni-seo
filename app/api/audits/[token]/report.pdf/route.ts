import { getAuditByToken } from "@/src/db/queries";
import { createPublicAuditPdf } from "@/src/lib/reports/audit-pdf";
import { sanitizePublicAuditResult } from "../../../_lib/audit-public";
import { apiError, safeJsonParse, validOpaqueToken } from "../../../_lib/http";
import { verifyAuditRestoreEnvelope } from "../../../_lib/audit-restore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A download for the opaque public audit link. Never use the admin export here. */
export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  if (!validOpaqueToken(token)) return apiError(400, "INVALID_TOKEN", "Некорректный токен аудита");

  const audit = getAuditByToken(token);
  if (!audit) {
    const restored = verifyAuditRestoreEnvelope(new URL(request.url).searchParams.get("restore"), token);
    if (!restored) return apiError(404, "AUDIT_NOT_FOUND", "Аудит не найден");
    return pdfResponse({
      locale: restored.locale,
      normalizedDomain: restored.normalizedDomain,
      score: restored.result.score,
      grade: restored.result.grade,
      partial: restored.result.partial,
      pagesChecked: restored.result.pagesChecked,
      pagesDiscovered: restored.result.pagesDiscovered,
      completedAt: restored.completedAt,
      publicResult: restored.result,
    });
  }
  if (audit.status !== "completed" && audit.status !== "partial") {
    return apiError(409, "AUDIT_NOT_READY", audit.locale === "en" ? "The report is not ready yet" : "Отчёт ещё не готов");
  }

  const publicResult = sanitizePublicAuditResult(safeJsonParse(audit.publicResultJson));
  return pdfResponse({
    locale: audit.locale,
    normalizedDomain: audit.normalizedDomain,
    score: audit.overallScore,
    grade: audit.grade,
    partial: Boolean(audit.partial),
    pagesChecked: audit.pagesChecked,
    pagesDiscovered: audit.pagesDiscovered,
    completedAt: audit.completedAt,
    publicResult,
  });
}

async function pdfResponse(input: Parameters<typeof createPublicAuditPdf>[0]): Promise<Response> {
  try {
    const bytes = await createPublicAuditPdf(input);
    return new Response(Uint8Array.from(bytes), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": 'attachment; filename="kileni-seo-check.pdf"',
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[KILENI PDF]", error instanceof Error ? error.message : "Unknown PDF error");
    return apiError(500, "PDF_EXPORT_FAILED", input.locale === "en" ? "Could not create the PDF report" : "Не удалось сформировать PDF-отчёт");
  }
}
