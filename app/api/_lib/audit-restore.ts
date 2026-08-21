import { createHmac, timingSafeEqual } from "node:crypto";

import { normalizeAuditDomain } from "@/src/lib/audit";
import { sanitizePublicAuditResult } from "./audit-public";
import { validOpaqueToken } from "./http";

const VERSION = 1;
const SIGNING_CONTEXT = "kileni:audit-restore:v1\0";
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1_000;
const MAX_TTL_MS = 90 * 24 * 60 * 60 * 1_000;
const MAX_ENVELOPE_LENGTH = 20_000;
const EXAMPLE_SECRET = "replace-with-at-least-32-random-characters";

type TerminalStatus = "completed" | "partial";

export type AuditRestoreInput = {
  readonly token: string;
  readonly locale: "ru" | "en";
  readonly normalizedDomain: string;
  readonly status: TerminalStatus;
  readonly createdAt: number;
  readonly completedAt: number;
  readonly result: unknown;
};

export type AuditRestorePublicResult = Record<string, unknown> & {
  readonly score: number;
  readonly grade: "A" | "B" | "C" | "D" | "E";
  readonly interpretation: string;
  readonly pagesChecked: number;
  readonly pagesDiscovered: number;
  readonly partial: boolean;
  readonly categories: unknown[];
};

export type AuditRestoreSnapshot = AuditRestoreInput & {
  readonly version: 1;
  readonly expiresAt: number;
  readonly result: AuditRestorePublicResult;
};

type RestoreOptions = {
  readonly secret?: string;
  readonly now?: number;
  readonly ttlMs?: number;
};

/**
 * Creates a self-contained fallback for ephemeral serverless storage.
 * The payload is deliberately limited to the same redacted DTO as the public
 * result endpoint; applicant data, exact URLs and full issues are never read.
 */
export function createAuditRestoreEnvelope(
  input: AuditRestoreInput,
  options: RestoreOptions = {},
): string | null {
  const secret = signingSecret(options.secret);
  if (!secret) return null;
  const now = safeTimestamp(options.now ?? Date.now());
  const ttlMs = safeTtl(options.ttlMs ?? DEFAULT_TTL_MS);
  if (now === null || ttlMs === null) return null;
  const snapshot = sanitizeSnapshot({
    ...input,
    version: VERSION,
    expiresAt: now + ttlMs,
  });
  if (!snapshot) return null;
  const payload = Buffer.from(JSON.stringify(snapshot), "utf8").toString("base64url");
  const signature = sign(payload, secret);
  const envelope = `${payload}.${signature}`;
  return envelope.length <= MAX_ENVELOPE_LENGTH ? envelope : null;
}

/** Verifies integrity, token binding, expiry and the strict public-only schema. */
export function verifyAuditRestoreEnvelope(
  envelope: string | null | undefined,
  expectedToken: string,
  options: RestoreOptions = {},
): AuditRestoreSnapshot | null {
  const secret = signingSecret(options.secret);
  const now = safeTimestamp(options.now ?? Date.now());
  if (!secret || now === null || !validOpaqueToken(expectedToken) || !envelope || envelope.length > MAX_ENVELOPE_LENGTH) return null;
  const parts = envelope.split(".");
  if (parts.length !== 2) return null;
  const [payload, suppliedSignature] = parts;
  if (!payload || !suppliedSignature || !/^[A-Za-z0-9_-]+$/u.test(payload) || !/^[A-Za-z0-9_-]{43}$/u.test(suppliedSignature)) return null;
  const expectedSignature = sign(payload, secret);
  if (!constantTimeEqual(suppliedSignature, expectedSignature)) return null;

  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as unknown;
  } catch {
    return null;
  }
  const snapshot = sanitizeSnapshot(decoded);
  if (!snapshot || snapshot.token !== expectedToken || snapshot.expiresAt <= now) return null;
  if (snapshot.expiresAt - snapshot.completedAt > MAX_TTL_MS) return null;
  return snapshot;
}

export function auditRestoreIsConfigured(): boolean {
  return signingSecret() !== null;
}

function sanitizeSnapshot(value: unknown): AuditRestoreSnapshot | null {
  if (!isRecord(value) || value.version !== VERSION) return null;
  if (typeof value.token !== "string" || !validOpaqueToken(value.token)) return null;
  if (value.locale !== "ru" && value.locale !== "en") return null;
  if (value.status !== "completed" && value.status !== "partial") return null;
  const domain = sanitizeDomain(value.normalizedDomain);
  const createdAt = safeTimestamp(value.createdAt);
  const completedAt = safeTimestamp(value.completedAt);
  const expiresAt = safeTimestamp(value.expiresAt);
  const result = sanitizePublicAuditResult(value.result);
  if (!domain || createdAt === null || completedAt === null || expiresAt === null || !result) return null;
  if (completedAt < createdAt || expiresAt <= completedAt || !isCompletePublicResult(result)) return null;
  if ((value.status === "partial") !== result.partial) return null;
  return {
    version: VERSION,
    token: value.token,
    locale: value.locale,
    normalizedDomain: domain,
    status: value.status,
    createdAt,
    completedAt,
    expiresAt,
    result,
  };
}

function isCompletePublicResult(value: Record<string, unknown>): value is AuditRestorePublicResult {
  return typeof value.score === "number" &&
    typeof value.grade === "string" && /^[A-E]$/u.test(value.grade) &&
    typeof value.interpretation === "string" &&
    typeof value.pagesChecked === "number" &&
    typeof value.pagesDiscovered === "number" &&
    typeof value.partial === "boolean" &&
    Array.isArray(value.categories) &&
    value.pagesChecked <= value.pagesDiscovered;
}

function sanitizeDomain(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const domain = normalizeAuditDomain(value);
  if (!domain || domain.length > 253 || /[\s/?#@]/u.test(domain)) return null;
  return /^[a-z0-9.:[\]-]+$/iu.test(domain) ? domain : null;
}

function safeTimestamp(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function safeTtl(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1_000 && value <= MAX_TTL_MS ? value : null;
}

function signingSecret(override?: string): string | null {
  const value = override ?? process.env.AUDIT_RESTORE_SECRET;
  return value && value.trim() !== EXAMPLE_SECRET && Buffer.byteLength(value, "utf8") >= 32 ? value : null;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(SIGNING_CONTEXT, "utf8")
    .update(payload, "utf8")
    .digest("base64url");
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
