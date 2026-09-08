import { siteConfig } from "@/src/config/site";
import { getAuditByToken, getAuditEvents, type AuditRow } from "@/src/db/queries";
import { derivePublicAuditCoverage, type PublicAuditCoverageStatus } from "@/src/lib/audit/public-coverage";
import { sanitizePublicAuditProgressPayload } from "@/src/lib/audit/public-progress";
import { consumeRateLimit } from "@/src/lib/security/rate-limit";
import { clientIp, privateHash } from "@/src/lib/security/request";
import { apiError, noStoreJson, retryAfterHeaders, safeJsonParse, validOpaqueToken } from "../../../_lib/http";
import { verifyAuditRestoreEnvelope } from "../../../_lib/audit-restore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TERMINAL = new Set(["completed", "partial", "failed"]);
const globalStreams = globalThis as typeof globalThis & { __kileniAuditStreams?: Map<string, number> };
const activeStreams = globalStreams.__kileniAuditStreams ?? new Map<string, number>();
if (process.env.NODE_ENV !== "production") globalStreams.__kileniAuditStreams = activeStreams;

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  if (!validOpaqueToken(token)) return apiError(400, "INVALID_TOKEN", "Некорректный токен аудита");
  const url = new URL(request.url);
  const after = eventCursor(request.headers.get("last-event-id") ?? url.searchParams.get("after"));
  const wantsSse = (request.headers.get("accept") ?? "").includes("text/event-stream") && url.searchParams.get("format") !== "json";
  const requester = privateHash(clientIp(request));
  const tokenHash = privateHash(token);
  const rate = await consumeRateLimit(
    `audit-events:${wantsSse ? "sse" : "poll"}:${requester}:${tokenHash}`,
    wantsSse ? { windowMs: 60_000, limit: 10 } : { windowMs: 60_000, limit: 120 },
  );
  if (!rate.allowed) {
    return apiError(429, "RATE_LIMITED", "Слишком много запросов событий", undefined, retryAfterHeaders(rate.retryAfterMs));
  }
  const audit = await getAuditByToken(token);
  if (!audit) {
    const restored = verifyAuditRestoreEnvelope(url.searchParams.get("restore"), token);
    if (!restored) return apiError(404, "AUDIT_NOT_FOUND", "Аудит не найден");
    const coverage = derivePublicAuditCoverage({ result: restored.result, pageLimit: siteConfig.audit.pageLimit });
    const snapshot = {
      normalizedDomain: restored.normalizedDomain,
      status: publicTerminalStatus(restored.status, coverage.coverageStatus),
      pagesChecked: coverage.pagesChecked,
      pagesDiscovered: coverage.pagesDiscovered,
      pagesSelected: coverage.pagesSelected,
      pageLimit: siteConfig.audit.pageLimit,
      coverageStatus: coverage.coverageStatus,
    };
    if (!wantsSse) return noStoreJson({ ...snapshot, terminal: true, events: [], nextEventId: after });
    return new Response(
      `data: ${JSON.stringify(snapshot)}\n\nevent: done\ndata: ${JSON.stringify({ status: restored.status, lastEventId: after })}\n\n`,
      {
        status: 200,
        headers: {
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "private, no-cache, no-transform",
          "x-accel-buffering": "no",
        },
      },
    );
  }
  if (!wantsSse) {
    const events = await publicEvents(audit.id, after, audit.normalizedDomain);
    const current = (await getAuditByToken(token)) ?? audit;
    return noStoreJson({
      ...publicSnapshot(current),
      terminal: TERMINAL.has(current.status),
      events,
      nextEventId: events.at(-1)?.id ?? after,
    });
  }

  const streamKey = `${requester}:${tokenHash}`;
  if (!acquireStream(streamKey)) {
    return apiError(429, "TOO_MANY_STREAMS", "Уже открыто слишком много соединений", undefined, { "retry-after": "5" });
  }

  const encoder = new TextEncoder();
  let cursor = after;
  let closed = false;
  let released = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const close = () => {
        if (closed) return;
        closed = true;
        if (!released) { releaseStream(streamKey); released = true; }
        try { controller.close(); } catch { /* client disconnected */ }
      };
      request.signal.addEventListener("abort", close, { once: true });
      controller.enqueue(encoder.encode(": connected\n\n"));
      const startedAt = Date.now();
      let lastKeepAlive = Date.now();
      try {
        while (!closed && Date.now() - startedAt < 55_000) {
          const events = await publicEvents(audit.id, cursor, audit.normalizedDomain);
          for (const event of events) {
            cursor = event.id;
            const current = (await getAuditByToken(token)) ?? audit;
            controller.enqueue(encoder.encode(
              `id: ${event.id}\ndata: ${JSON.stringify({ ...publicSnapshot(current), ...(event.status ? { status: event.status } : {}), ...event.payload, eventCreatedAt: event.createdAt })}\n\n`,
            ));
          }
          const current = await getAuditByToken(token);
          if (!current || TERMINAL.has(current.status)) {
            const doneStatus = current ? publicSnapshot(current).status : "not_found";
            controller.enqueue(encoder.encode(
              `event: done\ndata: ${JSON.stringify({ status: doneStatus, lastEventId: cursor })}\n\n`,
            ));
            close();
            return;
          }
          if (Date.now() - lastKeepAlive >= 15_000) {
            controller.enqueue(encoder.encode(`: keepalive ${Date.now()}\n\n`));
            lastKeepAlive = Date.now();
          }
          await waitFor(250, request.signal);
        }
        if (!closed) controller.enqueue(encoder.encode("event: reconnect\ndata: {}\n\n"));
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          try { controller.enqueue(encoder.encode("event: reconnect\ndata: {}\n\n")); } catch { /* disconnected */ }
        }
      } finally {
        close();
      }
    },
    cancel() {
      closed = true;
      if (!released) { releaseStream(streamKey); released = true; }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "private, no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}

function acquireStream(key: string): boolean {
  const current = activeStreams.get(key) ?? 0;
  if (current >= 2) return false;
  activeStreams.set(key, current + 1);
  return true;
}

function releaseStream(key: string): void {
  const current = activeStreams.get(key) ?? 0;
  if (current <= 1) activeStreams.delete(key);
  else activeStreams.set(key, current - 1);
}

async function publicEvents(auditId: string, after: number, normalizedDomain: string) {
  return (await getAuditEvents(auditId, after)).map((row) => ({
    id: row.id,
    status: publicEventStatus(row.event),
    payload: sanitizePublicAuditProgressPayload(safeJsonParse(row.payloadJson), normalizedDomain, siteConfig.audit.pageLimit),
    createdAt: new Date(row.createdAt).toISOString(),
  }));
}

function publicEventStatus(value: string): string | null {
  return [
    "queued",
    "validating_target",
    "connecting",
    "checking_robots",
    "checking_sitemaps",
    "discovering_pages",
    "crawling_pages",
    "analyzing_structure",
    "running_performance",
    "finalizing_report",
    "calculating_score",
    "completed",
    "partial",
    "failed",
  ].includes(value) ? value : null;
}

function eventCursor(value: string | null): number {
  if (!value || !/^\d{1,15}$/u.test(value)) return 0;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function publicSnapshot(audit: AuditRow) {
  const common = {
    normalizedDomain: audit.normalizedDomain,
    status: audit.status,
    pagesChecked: audit.pagesChecked,
    pagesDiscovered: audit.pagesDiscovered,
    pageLimit: Math.min(siteConfig.audit.pageLimit, audit.pageLimit),
  };
  const result = safeJsonParse(audit.publicResultJson);
  if (!TERMINAL.has(audit.status) || audit.status === "failed" || !result) return common;
  const coverage = derivePublicAuditCoverage({
    result,
    pagesChecked: audit.pagesChecked,
    pagesDiscovered: audit.pagesDiscovered,
    pageLimit: common.pageLimit,
  });
  return {
    ...common,
    status: publicTerminalStatus(audit.status, coverage.coverageStatus),
    pagesSelected: coverage.pagesSelected,
    coverageStatus: coverage.coverageStatus,
  };
}

function publicTerminalStatus(status: string, coverageStatus: PublicAuditCoverageStatus): string {
  if (status !== "completed" && status !== "partial") return status;
  return coverageStatus === "sample_complete" ? "completed" : "partial";
}

function waitFor(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const aborted = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", aborted);
      resolve();
    }, milliseconds);
    signal.addEventListener("abort", aborted, { once: true });
  });
}
