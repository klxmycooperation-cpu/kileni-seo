import { NextResponse } from "next/server";

import { verifyCsrf } from "@/src/lib/security/csrf";
import { requestOriginIsAllowed } from "@/src/lib/security/request";

export type ApiErrorBody = {
  error: string;
  message: string;
  details?: unknown;
};

export function apiError(
  status: number,
  error: string,
  message: string,
  details?: unknown,
  headers?: HeadersInit,
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { error, message, ...(details === undefined ? {} : { details }) },
    { status, headers: { "cache-control": "no-store", ...headers } },
  );
}

export function mutationGuard(request: Request): NextResponse<ApiErrorBody> | null {
  if (!requestOriginIsAllowed(request)) {
    return apiError(403, "ORIGIN_REJECTED", "Источник запроса не разрешён");
  }
  if (!verifyCsrf(request)) {
    return apiError(403, "CSRF_REJECTED", "Защитный токен недействителен");
  }
  return null;
}

export function retryAfterHeaders(retryAfterMs: number): HeadersInit {
  return { "retry-after": String(Math.max(1, Math.ceil(retryAfterMs / 1000))) };
}

export function noStoreJson<T>(body: T, init?: ResponseInit): NextResponse<T> {
  const headers = new Headers(init?.headers);
  headers.set("cache-control", "private, no-store, max-age=0");
  return NextResponse.json(body, { ...init, headers });
}

export function isJsonRequest(request: Request): boolean {
  return (request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json");
}

export function declaredBodyTooLarge(request: Request, limit: number): boolean {
  const value = request.headers.get("content-length");
  if (!value || !/^\d+$/u.test(value)) return false;
  const length = Number(value);
  return Number.isSafeInteger(length) && length > limit;
}

export class RequestBodyTooLargeError extends Error {}

export async function readJson(request: Request, limit = 64 * 1024): Promise<unknown> {
  if (!isJsonRequest(request)) throw new TypeError("UNSUPPORTED_MEDIA_TYPE");
  if (declaredBodyTooLarge(request, limit)) throw new RequestBodyTooLargeError();
  if (!request.body) return JSON.parse("") as unknown;
  const reader = request.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel().catch(() => undefined);
        throw new RequestBodyTooLargeError();
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks, total).toString("utf8")) as unknown;
}

export function jsonReadError(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof RequestBodyTooLargeError) {
    return apiError(413, "PAYLOAD_TOO_LARGE", "Запрос слишком большой");
  }
  return error instanceof TypeError && error.message === "UNSUPPORTED_MEDIA_TYPE"
    ? apiError(415, "UNSUPPORTED_MEDIA_TYPE", "Ожидается JSON")
    : apiError(400, "INVALID_JSON", "Некорректный JSON");
}

export function safeJsonParse(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export function validOpaqueToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/u.test(value);
}

export function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}
