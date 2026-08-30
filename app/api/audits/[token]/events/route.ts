import { siteConfig } from "@/src/config/site";
import { getAuditByToken, getAuditEvents, type AuditRow } from "@/src/db/queries";
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
    const snapshot = {
      status: restored.status,
      pagesChecked: restored.result.pagesChecked,
      pagesDiscovered: restored.result.pagesDiscovered,
      pageLimit: siteConfig.audit.pageLimit,
      overallScore: restored.result.score,
      grade: restored.result.grade,
      partial: restored.result.partial,
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
    const events = await publicEvents(audit.id, after);
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
          const events = await publicEvents(audit.id, cursor);
          for (const event of events) {
            cursor = event.id;
            const current = (await getAuditByToken(token)) ?? audit;
            controller.enqueue(encoder.encode(
              `id: ${event.id}\ndata: ${JSON.stringify({ ...publicSnapshot(current), event: safeEventName(event.event), payload: event.payload, eventCreatedAt: event.createdAt })}\n\n`,
            ));
          }
          const current = await getAuditByToken(token);
          if (!current || TERMINAL.has(current.status)) {
            controller.enqueue(encoder.encode(
              `event: done\ndata: ${JSON.stringify({ status: current?.status ?? "not_found", lastEventId: cursor })}\n\n`,
            ));
            close();
            return;
          }
          if (Date.now() - lastKeepAlive >= 15_000) {
            controller.enqueue(encoder.encode(`: keepalive ${Date.now()}\n\n`));
            lastKeepAlive = Date.now();
          }
          await waitFor(1_000, request.signal);
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

async function publicEvents(auditId: string, after: number) {
  return (await getAuditEvents(auditId, after)).map((row) => ({
    id: row.id,
    event: row.event,
    payload: publicEventPayload(safeJsonParse(row.payloadJson)),
    createdAt: new Date(row.createdAt).toISOString(),
  }));
}

function publicEventPayload(value: unknown): Record<string, number | boolean> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const result: Record<string, number | boolean> = {};
  for (const key of ["pagesChecked", "pagesDiscovered", "pageLimit", "score"] as const) {
    const candidate = source[key];
    if (typeof candidate === "number" && Number.isFinite(candidate)) result[key] = candidate;
  }
  for (const key of ["partial", "cached", "queued"] as const) {
    if (typeof source[key] === "boolean") result[key] = source[key];
  }
  return result;
}

function eventCursor(value: string | null): number {
  if (!value || !/^\d{1,15}$/u.test(value)) return 0;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function safeEventName(value: string): string {
  return /^[a-z0-9:_-]{1,80}$/iu.test(value) ? value : "progress";
}

function publicSnapshot(audit: AuditRow) {
  return {
    status: audit.status,
    pagesChecked: audit.pagesChecked,
    pagesDiscovered: audit.pagesDiscovered,
    pageLimit: Math.min(siteConfig.audit.pageLimit, audit.pageLimit),
    overallScore: audit.overallScore,
    grade: audit.grade,
    partial: Boolean(audit.partial),
  };
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
