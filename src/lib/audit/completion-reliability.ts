export type AuditCompletionReliabilityInput = {
  readonly persist: () => Promise<void>;
  readonly notify: () => Promise<void>;
  readonly signal?: AbortSignal;
  readonly retryDelaysMs?: readonly number[];
};

export type AuditCompletionReliabilityResult = {
  readonly notificationError: unknown | null;
  readonly persistenceAttempts: number;
};

const DEFAULT_RETRY_DELAYS_MS = [300, 900] as const;
const TRANSIENT_ERROR_CODES = new Set([
  "ECONNABORTED",
  "ECONNREFUSED",
  "ECONNRESET",
  "ENETDOWN",
  "ENETUNREACH",
  "EPIPE",
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_SOCKET",
]);
const TRANSIENT_ERROR_NAMES = new Set([
  "TimeoutError",
]);

export async function completeAuditReliably(
  input: AuditCompletionReliabilityInput,
): Promise<AuditCompletionReliabilityResult> {
  const persistenceAttempts = await persistAuditCompletionWithRetry(input.persist, {
    signal: input.signal,
    retryDelaysMs: input.retryDelaysMs,
  });

  try {
    await input.notify();
    return { notificationError: null, persistenceAttempts };
  } catch (notificationError) {
    return { notificationError, persistenceAttempts };
  }
}

export async function persistAuditCompletionWithRetry(
  persist: () => Promise<void>,
  options: {
    readonly signal?: AbortSignal;
    readonly retryDelaysMs?: readonly number[];
  } = {},
): Promise<number> {
  const retryDelaysMs = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  let attempts = 0;

  while (true) {
    attempts += 1;
    throwIfAborted(options.signal);
    try {
      await persist();
      return attempts;
    } catch (error) {
      const retryDelay = retryDelaysMs[attempts - 1];
      if (retryDelay === undefined || !isTransientPersistenceError(error) || options.signal?.aborted) {
        throw error;
      }
      await waitForRetry(retryDelay, options.signal);
    }
  }
}

export function isTransientPersistenceError(error: unknown): boolean {
  const visited = new Set<unknown>();
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current && !visited.has(current); depth += 1) {
    visited.add(current);
    if (current instanceof Error) {
      if (current.message.trim().toLowerCase() === "fetch failed") return true;
      if (TRANSIENT_ERROR_NAMES.has(current.name)) return true;
    }
    if (typeof current === "object") {
      const candidate = current as { code?: unknown; cause?: unknown };
      if (typeof candidate.code === "string" && TRANSIENT_ERROR_CODES.has(candidate.code.toUpperCase())) return true;
      current = candidate.cause;
      continue;
    }
    break;
  }
  return false;
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (!signal?.aborted) return;
  throw signal.reason instanceof Error ? signal.reason : new Error("Audit completion aborted");
}

function waitForRetry(delayMs: number, signal: AbortSignal | undefined): Promise<void> {
  if (delayMs <= 0) {
    throwIfAborted(signal);
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(done, delayMs);
    signal?.addEventListener("abort", aborted, { once: true });

    function done() {
      signal?.removeEventListener("abort", aborted);
      resolve();
    }

    function aborted() {
      clearTimeout(timer);
      signal?.removeEventListener("abort", aborted);
      reject(signal?.reason instanceof Error ? signal.reason : new Error("Audit completion aborted"));
    }
  });
}
