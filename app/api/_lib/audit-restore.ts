import { createHmac, timingSafeEqual } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";

import { normalizeAuditDomain } from "@/src/lib/audit";
import { derivePublicAuditCoverage } from "@/src/lib/audit/public-coverage";
import { PUBLIC_AUDIT_PAGE_LIMIT } from "@/src/config/public-audit";
import { sanitizePublicAuditResult } from "./audit-public";
import { validOpaqueToken } from "./http";

const LEGACY_VERSION = 1 as const;
const CONTRACT_V3_VERSION = 2 as const;
const CONTRACT_V4_VERSION = 3 as const;
const SIGNING_CONTEXT = "kileni:audit-restore:v1\0";
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1_000;
const MAX_TTL_MS = 90 * 24 * 60 * 60 * 1_000;
const MAX_ENVELOPE_LENGTH = 20_000;
const MAX_DECOMPRESSED_LENGTH = 256_000;
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
  readonly resultVersion: number;
  readonly pagesChecked: number;
  readonly pagesDiscovered: number;
  readonly pagesSelected: number;
  readonly coverageStatus: "sample_complete" | "sample_partial";
};

export type AuditRestoreSnapshot = AuditRestoreInput & {
  readonly version: typeof LEGACY_VERSION | typeof CONTRACT_V3_VERSION | typeof CONTRACT_V4_VERSION;
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
    version: restoreVersionForResult(input.result),
    expiresAt: now + ttlMs,
  });
  if (!snapshot) return null;
  const serialized = Buffer.from(JSON.stringify(snapshot), "utf8");
  if (serialized.byteLength > MAX_DECOMPRESSED_LENGTH) return null;
  const payload = snapshot.version === LEGACY_VERSION
    ? serialized.toString("base64url")
    : `z${deflateRawSync(serialized).toString("base64url")}`;
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
    const bytes = payload.startsWith("z")
      ? inflateRawSync(Buffer.from(payload.slice(1), "base64url"), { maxOutputLength: MAX_DECOMPRESSED_LENGTH })
      : Buffer.from(payload, "base64url");
    if (bytes.byteLength > MAX_DECOMPRESSED_LENGTH) return null;
    decoded = JSON.parse(bytes.toString("utf8")) as unknown;
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
  if (!isRecord(value) || (value.version !== LEGACY_VERSION && value.version !== CONTRACT_V3_VERSION && value.version !== CONTRACT_V4_VERSION)) return null;
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
  if (value.version !== restoreVersionForResult(result)) return null;
  const coverage = derivePublicAuditCoverage({ result, pageLimit: PUBLIC_AUDIT_PAGE_LIMIT });
  return {
    version: value.version,
    token: value.token,
    locale: value.locale,
    normalizedDomain: domain,
    status: coverage.coverageStatus === "sample_partial" ? "partial" : "completed",
    createdAt,
    completedAt,
    expiresAt,
    result,
  };
}

function isCompletePublicResult(value: Record<string, unknown>): value is AuditRestorePublicResult {
  if (isResultV4(value)) {
    return typeof value.pagesChecked === "number" &&
      typeof value.pagesSelected === "number" &&
      typeof value.pagesEligible === "number" &&
      typeof value.pagesDiscovered === "number" &&
      (value.coverageStatus === "sample_complete" || value.coverageStatus === "sample_partial") &&
      value.pagesChecked <= value.pagesSelected &&
      value.pagesSelected <= value.pagesEligible &&
      value.pagesEligible <= value.pagesDiscovered;
  }
  if (isResultV3(value)) {
    return typeof value.pagesChecked === "number" &&
      typeof value.pagesSelected === "number" &&
      typeof value.pagesDiscovered === "number" &&
      (value.coverageStatus === "sample_complete" || value.coverageStatus === "sample_partial") &&
      value.pagesChecked <= value.pagesSelected &&
      value.pagesSelected <= value.pagesDiscovered;
  }
  return typeof value.resultVersion === "number" && value.resultVersion < 3 &&
    typeof value.pagesChecked === "number" &&
    typeof value.pagesDiscovered === "number" &&
    typeof value.pagesSelected === "number" &&
    (value.coverageStatus === "sample_complete" || value.coverageStatus === "sample_partial") &&
    value.pagesChecked <= value.pagesSelected &&
    value.pagesSelected <= value.pagesDiscovered;
}

function isResultV4(value: unknown): value is Record<string, unknown> & {
  readonly resultVersion: 4;
  readonly contractVersion: 3;
  readonly pagesChecked: number;
  readonly pagesSelected: number;
  readonly pagesEligible: number;
  readonly pagesDiscovered: number;
  readonly coverageStatus: "sample_complete" | "sample_partial";
} {
  return isRecord(value) && value.resultVersion === 4 && value.contractVersion === 3;
}

function isResultV3(value: unknown): value is Record<string, unknown> & {
  readonly resultVersion: 3;
  readonly contractVersion: 2;
  readonly pagesChecked: number;
  readonly pagesSelected: number;
  readonly pagesDiscovered: number;
  readonly coverageStatus: "sample_complete" | "sample_partial";
} {
  return isRecord(value) && value.resultVersion === 3 && value.contractVersion === 2;
}

function restoreVersionForResult(value: unknown): AuditRestoreSnapshot["version"] {
  if (isResultV4(value)) return CONTRACT_V4_VERSION;
  if (isResultV3(value)) return CONTRACT_V3_VERSION;
  return LEGACY_VERSION;
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
