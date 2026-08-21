import type { LookupFunction } from "node:net";

import { Agent, fetch as undiciFetch } from "undici";

import {
  assertPublicUrl,
  type DnsResolver,
  type ResolvedAddress,
  SsrfProtectionError,
  systemDnsResolver,
} from "./ssrf";
import { normalizeTargetUrl } from "./url";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BODY_BYTES = 2 * 1024 * 1024;
const DEFAULT_MAX_REDIRECTS = 5;
const ABSOLUTE_MAX_BODY_BYTES = 5 * 1024 * 1024;
const ABSOLUTE_MAX_TIMEOUT_MS = 30_000;

export type SafeFetchErrorCode =
  | "BODY_TOO_LARGE"
  | "NETWORK_ERROR"
  | "REQUEST_ABORTED"
  | "REQUEST_TIMEOUT"
  | "TOO_MANY_REDIRECTS"
  | "INVALID_REDIRECT";

export class SafeFetchError extends Error {
  constructor(
    readonly code: SafeFetchErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "SafeFetchError";
  }
}

export interface SafeFetchOptions {
  readonly headers?: Readonly<Record<string, string>>;
  readonly maxBodyBytes?: number;
  readonly maxRedirects?: number;
  readonly timeoutMs?: number;
  readonly signal?: AbortSignal;
}

export interface SafeTransportRequest {
  readonly url: URL;
  readonly addresses: readonly ResolvedAddress[];
  readonly headers: Readonly<Record<string, string>>;
  readonly signal: AbortSignal;
}

export interface DisposableTransportResponse {
  readonly response: Response;
  readonly dispose?: () => void | Promise<void>;
}

export type SafeTransport = (
  request: SafeTransportRequest,
) => Promise<Response | DisposableTransportResponse>;

export interface SafeFetchDependencies {
  readonly resolver?: DnsResolver;
  readonly transport?: SafeTransport;
}

export interface SafeFetchResponse {
  readonly requestedUrl: string;
  readonly url: string;
  readonly status: number;
  readonly ok: boolean;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: Uint8Array;
  readonly text: string;
  readonly redirects: readonly string[];
  readonly elapsedMs?: number;
}

export type AuditFetcher = (
  input: string | URL,
  options?: SafeFetchOptions,
) => Promise<SafeFetchResponse>;

export async function safeFetch(
  input: string | URL,
  options: SafeFetchOptions = {},
  dependencies: SafeFetchDependencies = {},
): Promise<SafeFetchResponse> {
  const requested = normalizeTargetUrl(input);
  const startedAt = Date.now();
  const resolver = dependencies.resolver ?? systemDnsResolver;
  const transport = dependencies.transport ?? pinnedUndiciTransport;
  const maxBodyBytes = Math.min(
    positiveInteger(options.maxBodyBytes, DEFAULT_MAX_BODY_BYTES, "maxBodyBytes"),
    ABSOLUTE_MAX_BODY_BYTES,
  );
  const maxRedirects = Math.min(
    nonNegativeInteger(options.maxRedirects, DEFAULT_MAX_REDIRECTS, "maxRedirects"),
    DEFAULT_MAX_REDIRECTS,
  );
  const timeoutMs = Math.min(
    positiveInteger(options.timeoutMs, DEFAULT_TIMEOUT_MS, "timeoutMs"),
    ABSOLUTE_MAX_TIMEOUT_MS,
  );
  const headers = {
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.1",
    "accept-encoding": "gzip, deflate, br",
    "user-agent": process.env.AUDIT_USER_AGENT ?? "KILENI-SEO-Audit/1.0 (public technical check)",
    ...options.headers,
  };

  let current = requested;
  const redirects: string[] = [];

  for (;;) {
    const attempt = createAttemptSignal(timeoutMs, options.signal);
    let disposable: DisposableTransportResponse | undefined;

    try {
      if (attempt.signal.aborted) {
        throw new SafeFetchError("REQUEST_ABORTED", `HTTP-запрос отменён: ${current.href}`);
      }
      // Repeated for every hop. The validated answer is then pinned by the
      // default transport so DNS cannot change between policy check and connect.
      const validated = await settleBeforeAbort(
        assertPublicUrl(current, resolver),
        attempt.signal,
      );
      const result = await settleBeforeAbort(
        transport({
          url: validated.url,
          addresses: validated.addresses,
          headers,
          signal: attempt.signal,
        }),
        attempt.signal,
      );
      disposable = isDisposableResponse(result) ? result : { response: result };
      const response = disposable.response;

      if (isRedirect(response.status)) {
        const location = response.headers.get("location");
        if (location !== null) {
          await response.body?.cancel();
          if (redirects.length >= maxRedirects) {
            throw new SafeFetchError(
              "TOO_MANY_REDIRECTS",
              `Сайт вернул более ${maxRedirects} перенаправлений`,
            );
          }
          let next: URL;
          try {
            next = normalizeTargetUrl(new URL(location, validated.url));
          } catch (cause) {
            throw new SafeFetchError(
              "INVALID_REDIRECT",
              "Сайт вернул некорректный Location",
              { cause },
            );
          }
          redirects.push(next.href);
          current = next;
          continue;
        }
      }

      const body = await settleBeforeAbort(
        readLimitedBody(response, maxBodyBytes),
        attempt.signal,
      );
      return {
        requestedUrl: requested.href,
        url: validated.url.href,
        status: response.status,
        ok: response.ok,
        headers: headersToRecord(response.headers),
        body,
        text: new TextDecoder(resolveCharset(response.headers)).decode(body),
        redirects,
        elapsedMs: Date.now() - startedAt,
      };
    } catch (error) {
      if (error instanceof SafeFetchError) {
        throw error;
      }
      if (error instanceof SsrfProtectionError) {
        throw error;
      }
      if (attempt.signal.aborted) {
        const timedOut = attempt.timedOut();
        throw new SafeFetchError(
          timedOut ? "REQUEST_TIMEOUT" : "REQUEST_ABORTED",
          timedOut ? `Таймаут HTTP-запроса: ${current.href}` : `HTTP-запрос отменён: ${current.href}`,
          { cause: error },
        );
      }
      throw new SafeFetchError("NETWORK_ERROR", `Ошибка HTTP-запроса: ${current.href}`, {
        cause: error,
      });
    } finally {
      attempt.cleanup();
      await disposable?.dispose?.();
    }
  }
}

export function createSafeFetcher(
  dependencies: SafeFetchDependencies = {},
  defaults: SafeFetchOptions = {},
): AuditFetcher {
  return (input, options = {}) =>
    safeFetch(
      input,
      {
        ...defaults,
        ...options,
        headers: { ...defaults.headers, ...options.headers },
      },
      dependencies,
    );
}

async function pinnedUndiciTransport(
  request: SafeTransportRequest,
): Promise<DisposableTransportResponse> {
  const pinned = choosePinnedAddresses(request.addresses);
  const lookup: LookupFunction = (_hostname, options, callback) => {
    if (options.all) {
      callback(null, pinned.map(({ address, family }) => ({ address, family })));
      return;
    }
    const requestedFamily = options.family === 4 || options.family === 6
      ? options.family
      : undefined;
    const selected = pinned.find((address) => address.family === requestedFamily) ?? pinned[0];
    callback(null, selected.address, selected.family);
  };
  const dispatcher = new Agent({ connect: { lookup } });
  try {
    const response = await undiciFetch(request.url, {
      method: "GET",
      headers: request.headers,
      redirect: "manual",
      signal: request.signal,
      dispatcher,
    });
    return {
      response: response as unknown as Response,
      dispose: () => dispatcher.close(),
    };
  } catch (error) {
    await dispatcher.close();
    throw error;
  }
}

function choosePinnedAddresses(
  addresses: readonly ResolvedAddress[],
): readonly ResolvedAddress[] {
  if (addresses.length === 0) {
    // assertPublicUrl guarantees this; retaining the guard makes the boundary
    // safe for separately supplied transports and future refactors.
    throw new SafeFetchError("NETWORK_ERROR", "Нет IP-адреса для HTTP-соединения");
  }
  return addresses;
}

async function readLimitedBody(
  response: Response,
  limit: number,
): Promise<Uint8Array> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > limit) {
    await response.body?.cancel();
    throw new SafeFetchError("BODY_TOO_LARGE", `Тело ответа превышает ${limit} байт`);
  }
  if (!response.body) {
    return new Uint8Array();
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new SafeFetchError(
          "BODY_TOO_LARGE",
          `Тело ответа превышает ${limit} байт`,
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function createAttemptSignal(timeoutMs: number, parent?: AbortSignal): {
  readonly signal: AbortSignal;
  readonly timedOut: () => boolean;
  readonly cleanup: () => void;
} {
  const controller = new AbortController();
  let timeoutReached = false;
  const timeout = setTimeout(() => {
    timeoutReached = true;
    controller.abort(new Error("HTTP timeout"));
  }, timeoutMs);
  const abortFromParent = () => controller.abort(parent?.reason);
  if (parent?.aborted) {
    abortFromParent();
  } else {
    parent?.addEventListener("abort", abortFromParent, { once: true });
  }
  return {
    signal: controller.signal,
    timedOut: () => timeoutReached,
    cleanup: () => {
      clearTimeout(timeout);
      parent?.removeEventListener("abort", abortFromParent);
    },
  };
}

function settleBeforeAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

function headersToRecord(headers: Headers): Readonly<Record<string, string>> {
  return Object.fromEntries(headers.entries());
}

function resolveCharset(headers: Headers): string {
  const charset = headers
    .get("content-type")
    ?.match(/charset\s*=\s*["']?([^;\s"']+)/i)?.[1]
    ?.toLowerCase();
  // TextDecoder supports a broad WHATWG label set; invalid labels must not
  // make an otherwise useful audit fail.
  try {
    if (charset) new TextDecoder(charset);
    return charset ?? "utf-8";
  } catch {
    return "utf-8";
  }
}

function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function isDisposableResponse(
  value: Response | DisposableTransportResponse,
): value is DisposableTransportResponse {
  return typeof value === "object" && value !== null && "response" in value;
}

function positiveInteger(
  value: number | undefined,
  fallback: number,
  name: string,
): number {
  const resolved = value ?? fallback;
  if (!Number.isSafeInteger(resolved) || resolved <= 0) {
    throw new RangeError(`${name} must be a positive integer`);
  }
  return resolved;
}

function nonNegativeInteger(
  value: number | undefined,
  fallback: number,
  name: string,
): number {
  const resolved = value ?? fallback;
  if (!Number.isSafeInteger(resolved) || resolved < 0) {
    throw new RangeError(`${name} must be a non-negative integer`);
  }
  return resolved;
}
