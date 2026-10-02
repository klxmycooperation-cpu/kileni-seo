import { getAuditByToken, getAuditEvents } from "@/src/db/queries";
import { mergePublicAuditProgressPayloads, sanitizePublicAuditProgressPayload } from "@/src/lib/audit/public-progress";
import { apiError, noStoreJson, safeJsonParse, validOpaqueToken } from "../../_lib/http";
import { verifyAuditRestoreEnvelope } from "../../_lib/audit-restore";
import { buildRestoredPublicAuditSnapshot, buildStoredPublicAuditSnapshot } from "../../_lib/audit-snapshot";

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
    if (!restored) return apiError(404, "AUDIT_NOT_FOUND", "Снимок аудита не найден. Если проверка выполнялась без постоянного хранилища, запустите её повторно.");
    return noStoreJson(buildRestoredPublicAuditSnapshot(restored));
  }

  const baseSnapshot = buildStoredPublicAuditSnapshot(audit);
  const terminal = baseSnapshot.terminal;
  const eventRows = terminal ? [] : await getAuditEvents(audit.id, 0);
  const safeEventPayloads = eventRows.map((row) => sanitizePublicAuditProgressPayload(
    safeJsonParse(row.payloadJson),
    audit.normalizedDomain,
    baseSnapshot.pageLimit,
  ));
  const liveProgress = mergePublicAuditProgressPayloads(safeEventPayloads);
  const recentEvents = eventRows.flatMap((row, index) => {
    const payload = safeEventPayloads[index] ?? {};
    if (typeof payload.eventKind !== "string") return [];
    return [{
      kind: payload.eventKind,
      ...(typeof payload.currentUrl === "string" ? { path: progressPath(payload.currentUrl) } : {}),
      ...(typeof payload.currentPageType === "string" ? { pageType: payload.currentPageType } : {}),
      createdAt: new Date(row.createdAt).toISOString(),
    }];
  }).slice(-3);
  const latestEvent = recentEvents.at(-1);
  const liveEventPath = typeof liveProgress.currentUrl === "string" ? progressPath(liveProgress.currentUrl) : undefined;
  const eventCreatedAt = latestEvent
    && latestEvent.kind === liveProgress.eventKind
    && (liveEventPath === undefined || latestEvent.path === liveEventPath)
    ? latestEvent.createdAt
    : undefined;
  return noStoreJson({
    ...baseSnapshot,
    ...liveProgress,
    ...(eventCreatedAt ? { eventCreatedAt } : {}),
    pagesDiscovered: Math.max(baseSnapshot.pagesDiscovered, typeof liveProgress.pagesDiscovered === "number" ? liveProgress.pagesDiscovered : 0),
    pagesChecked: Math.max(baseSnapshot.pagesChecked, typeof liveProgress.pagesChecked === "number" ? liveProgress.pagesChecked : 0),
    ...(recentEvents.length ? { recentEvents } : {}),
    result: baseSnapshot.result,
    ...(audit.status === "failed" ? {
      message: audit.locale === "en"
        ? "The report could not be prepared. Run the check again."
        : "Отчёт не удалось подготовить. Повторите проверку.",
      errorSummary: audit.locale === "en" ? "Technical failure while preparing the report" : "Технический сбой при подготовке отчёта",
    } : {}),
  });
}

function progressPath(value: string): string {
  try {
    return new URL(value).pathname || "/";
  } catch {
    return "/";
  }
}
