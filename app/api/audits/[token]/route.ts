import { getAuditByToken } from "@/src/db/queries";
import { siteConfig } from "@/src/config/site";
import { apiError, noStoreJson, safeJsonParse, validOpaqueToken } from "../../_lib/http";
import { sanitizePublicAuditResult } from "../../_lib/audit-public";
import { verifyAuditRestoreEnvelope } from "../../_lib/audit-restore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  if (!validOpaqueToken(token)) return apiError(400, "INVALID_TOKEN", "Некорректный токен аудита");

  const audit = await getAuditByToken(token);
  if (!audit) {
    const restored = verifyAuditRestoreEnvelope(new URL(request.url).searchParams.get("restore"), token);
    if (!restored) return apiError(404, "AUDIT_NOT_FOUND", "Аудит не найден");
    return noStoreJson({
      token: restored.token,
      normalizedDomain: restored.normalizedDomain,
      status: restored.status,
      terminal: true,
      cached: false,
      createdAt: restored.createdAt,
      completedAt: restored.completedAt,
      consentRecorded: true,
      pagesDiscovered: restored.result.pagesDiscovered,
      pagesChecked: restored.result.pagesChecked,
      pageLimit: siteConfig.audit.pageLimit,
      overallScore: restored.result.score,
      progress: {
        pagesDiscovered: restored.result.pagesDiscovered,
        pagesChecked: restored.result.pagesChecked,
        pageLimit: siteConfig.audit.pageLimit,
      },
      score: restored.result.score,
      grade: restored.result.grade,
      partial: restored.result.partial,
      result: restored.result,
    });
  }

  const terminal = audit.status === "completed" || audit.status === "partial" || audit.status === "failed";
  return noStoreJson({
    token: audit.publicToken,
    normalizedDomain: audit.normalizedDomain,
    status: audit.status,
    terminal,
    cached: audit.startedAt === audit.createdAt && audit.completedAt === audit.createdAt,
    createdAt: audit.createdAt,
    completedAt: audit.completedAt,
    consentRecorded: true,
    pagesDiscovered: audit.pagesDiscovered,
    pagesChecked: audit.pagesChecked,
    pageLimit: Math.min(siteConfig.audit.pageLimit, audit.pageLimit),
    overallScore: audit.overallScore,
    progress: {
      pagesDiscovered: audit.pagesDiscovered,
      pagesChecked: audit.pagesChecked,
      pageLimit: Math.min(siteConfig.audit.pageLimit, audit.pageLimit),
    },
    score: audit.overallScore,
    grade: audit.grade,
    partial: Boolean(audit.partial),
    result: sanitizePublicAuditResult(safeJsonParse(audit.publicResultJson)),
    ...(audit.status === "failed" ? {
      message: audit.locale === "en"
        ? "The audit could not be completed. Please try again later."
        : "Аудит не удалось завершить. Попробуйте повторить позже.",
      errorSummary: audit.locale === "en" ? "The audit ended with an error" : "Проверка завершилась с ошибкой",
    } : {}),
  });
}
