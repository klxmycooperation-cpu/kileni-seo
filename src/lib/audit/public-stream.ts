import { PUBLIC_AUDIT_PAGE_LIMIT } from "../../config/public-audit";

export type PublicAuditAcceptedEvent = {
  readonly type: "accepted";
  readonly token: string;
  readonly status: "running";
  readonly pageLimit: typeof PUBLIC_AUDIT_PAGE_LIMIT;
};

export type PublicAuditProgressEvent = {
  readonly type: "progress";
  readonly token: string;
  readonly status: string;
  readonly pagesChecked: number;
  readonly pagesDiscovered: number;
  readonly pageLimit: typeof PUBLIC_AUDIT_PAGE_LIMIT;
};

export type PublicAuditCompletedEvent = {
  readonly type: "completed";
  readonly token: string;
  readonly status: "completed" | "partial";
  readonly restore: string;
};

export type PublicAuditFailedEvent = {
  readonly type: "failed";
  readonly token: string;
  readonly code: string;
  readonly message: string;
};

export type PublicAuditStreamEvent =
  | PublicAuditAcceptedEvent
  | PublicAuditProgressEvent
  | PublicAuditCompletedEvent
  | PublicAuditFailedEvent;

export type PublicAuditTerminalEvent = PublicAuditCompletedEvent | PublicAuditFailedEvent;

type StreamProducer = (
  emit: (event: PublicAuditProgressEvent) => void,
) => Promise<PublicAuditTerminalEvent>;

const CONTENT_TYPE = "application/x-ndjson; charset=utf-8";
const MAX_LINE_BYTES = 32 * 1024;

/**
 * Streams observed crawler events in the same serverless invocation. This is
 * deliberately request-scoped: it does not pretend that Vercel's /tmp SQLite
 * file is a durable queue shared by other instances.
 */
export function createPublicAuditStreamResponse(
  accepted: PublicAuditAcceptedEvent,
  produce: StreamProducer,
): Response {
  const encoder = new TextEncoder();
  let writable = true;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (event: PublicAuditStreamEvent) => {
        if (!writable) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          writable = false;
        }
      };
      write(accepted);
      void produce((event) => write(event))
        .then((terminal) => write(terminal))
        .catch(() => write({
          type: "failed",
          token: accepted.token,
          code: "AUDIT_STREAM_FAILED",
          message: "Не удалось завершить проверку. Попробуйте позже.",
        }))
        .finally(() => {
          if (!writable) return;
          writable = false;
          try { controller.close(); } catch { /* The browser may have left after the terminal event. */ }
        });
    },
    cancel() {
      // The audit is allowed to finish and persist its signed terminal result;
      // only writes to a disconnected browser stop.
      writable = false;
    },
  });

  return new Response(stream, {
    status: 202,
    headers: {
      "cache-control": "no-store, no-transform",
      "content-type": CONTENT_TYPE,
      "x-accel-buffering": "no",
    },
  });
}

export class PublicAuditStreamError extends Error {
  constructor(
    message: string,
    readonly code = "AUDIT_STREAM_FAILED",
  ) {
    super(message);
    this.name = "PublicAuditStreamError";
  }
}

export function isPublicAuditStreamResponse(response: Response): boolean {
  return response.headers.get("content-type")?.toLowerCase().includes("application/x-ndjson") ?? false;
}

export async function consumePublicAuditStream(
  response: Response,
  onEvent: (event: PublicAuditStreamEvent) => void,
): Promise<PublicAuditCompletedEvent> {
  if (!response.body) throw new PublicAuditStreamError("Сервер не вернул ход проверки.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";

  for (;;) {
    const { value, done } = await reader.read();
    pending += decoder.decode(value, { stream: !done });
    if (pending.length > MAX_LINE_BYTES) {
      await reader.cancel();
      throw new PublicAuditStreamError("Сервер вернул некорректный ход проверки.");
    }

    let newline = pending.indexOf("\n");
    while (newline >= 0) {
      const line = pending.slice(0, newline).trim();
      pending = pending.slice(newline + 1);
      if (line) {
        const event = parsePublicAuditStreamEvent(line);
        onEvent(event);
        if (event.type === "failed") {
          await reader.cancel();
          throw new PublicAuditStreamError(event.message, event.code);
        }
        if (event.type === "completed") {
          await reader.cancel();
          return event;
        }
      }
      newline = pending.indexOf("\n");
    }
    if (done) break;
  }

  throw new PublicAuditStreamError("Соединение закрылось до завершения проверки.");
}

function parsePublicAuditStreamEvent(line: string): PublicAuditStreamEvent {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    throw new PublicAuditStreamError("Сервер вернул некорректный ход проверки.");
  }
  if (!isRecord(value) || typeof value.type !== "string" || typeof value.token !== "string") {
    throw new PublicAuditStreamError("Сервер вернул некорректный ход проверки.");
  }
  if (value.type === "accepted" && value.status === "running" && value.pageLimit === PUBLIC_AUDIT_PAGE_LIMIT) {
    return value as PublicAuditAcceptedEvent;
  }
  if (
    value.type === "progress" && typeof value.status === "string" &&
    isCount(value.pagesChecked) && isCount(value.pagesDiscovered) && value.pageLimit === PUBLIC_AUDIT_PAGE_LIMIT
  ) {
    return value as PublicAuditProgressEvent;
  }
  if (
    value.type === "completed" && (value.status === "completed" || value.status === "partial") &&
    typeof value.restore === "string" && value.restore.length > 0
  ) {
    return value as PublicAuditCompletedEvent;
  }
  if (value.type === "failed" && typeof value.code === "string" && typeof value.message === "string") {
    return value as PublicAuditFailedEvent;
  }
  throw new PublicAuditStreamError("Сервер вернул некорректный ход проверки.");
}

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 100_000;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
