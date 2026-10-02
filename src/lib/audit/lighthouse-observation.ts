import type { LighthouseRunStatus, PerformanceAuditInput } from "./types";

export type AuditStorageMode = "persistent" | "ephemeral";

const STATUSES = new Set<LighthouseRunStatus>([
  "not_requested",
  "running",
  "completed",
  "failed",
  "timed_out",
  "legacy_summary_only",
  "not_persisted",
  "legacy_unknown",
]);

const MEASUREMENT_FIELDS = ["performance", "accessibility", "fcpMs", "lcpMs", "cls", "tbtMs", "speedIndexMs"] as const;

/**
 * Converts current and legacy Lighthouse payloads into one explicit state.
 * Failure states deliberately discard stray numeric values so an old score
 * can never contradict the current run status.
 */
export function normalizeLighthouseObservation(
  value: unknown,
  options: { storageMode?: AuditStorageMode } = {},
): PerformanceAuditInput {
  const input = record(value);
  const explicitStatus = status(input.status);
  const hasMeasurement = MEASUREMENT_FIELDS.some((field) => number(input[field]) !== undefined);
  const hasDetailedMeasurement = ["fcpMs", "lcpMs", "cls", "tbtMs", "speedIndexMs"].some((field) => number(input[field]) !== undefined)
    || Boolean(text(input.startedAt) && text(input.completedAt));
  let resolvedStatus: LighthouseRunStatus = explicitStatus
    ?? (hasMeasurement ? hasDetailedMeasurement ? "completed" : "legacy_summary_only" : "legacy_unknown");
  if (options.storageMode === "ephemeral" && resolvedStatus === "completed") resolvedStatus = "not_persisted";

  const mayExposeMeasurement = ["completed", "legacy_summary_only", "not_persisted"].includes(resolvedStatus);
  const result: Record<string, unknown> = { status: resolvedStatus };
  if (mayExposeMeasurement) {
    for (const field of MEASUREMENT_FIELDS) {
      const value = number(input[field]);
      if (value !== undefined) result[field] = value;
      else if (input[field] === null) result[field] = null;
    }
  }
  for (const field of ["finalUrl", "capturedAt", "startedAt", "completedAt", "lighthouseVersion", "source", "reason"] as const) {
    const value = text(input[field]);
    if (value) result[field] = value;
  }
  for (const field of ["profile", "strategy"] as const) {
    if (input[field] === "mobile" || input[field] === "desktop") result[field] = input[field];
  }
  for (const field of ["deviceProfile", "networkProfile"] as const) {
    const value = text(input[field]);
    if (value) result[field] = value;
  }
  const durationMs = nonNegativeNumber(input.durationMs);
  if (durationMs !== undefined) result.durationMs = durationMs;
  const runCount = nonNegativeInteger(input.runCount);
  if (runCount !== undefined) result.runCount = runCount;

  if (resolvedStatus === "failed" || resolvedStatus === "timed_out") {
    const errorCode = diagnosticCode(input.errorCode);
    const errorMessage = safeDiagnosticMessage(input.errorMessage);
    if (errorCode) result.errorCode = errorCode;
    if (errorMessage) result.errorMessage = errorMessage;
  }

  if (mayExposeMeasurement && Array.isArray(input.runs)) {
    const runs = input.runs.slice(0, 10).flatMap((entry) => {
      const run = record(entry);
      if (!Object.keys(run).length) return [];
      const safe: Record<string, unknown> = {};
      for (const field of ["finalUrl", "capturedAt", "startedAt", "completedAt"] as const) {
        const value = text(run[field]);
        if (value) safe[field] = value;
      }
      for (const field of ["performance", "fcpMs", "lcpMs", "cls", "tbtMs", "speedIndexMs"] as const) {
        const value = number(run[field]);
        if (value !== undefined) safe[field] = value;
        else if (run[field] === null) safe[field] = null;
      }
      const runDuration = nonNegativeNumber(run.durationMs);
      if (runDuration !== undefined) safe.durationMs = runDuration;
      const runStatus = status(run.status);
      if (runStatus) safe.status = runStatus;
      return Object.keys(safe).length ? [safe] : [];
    });
    if (runs.length) result.runs = runs;
  }

  return result as unknown as PerformanceAuditInput;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function status(value: unknown): LighthouseRunStatus | undefined {
  return typeof value === "string" && STATUSES.has(value as LighthouseRunStatus) ? value as LighthouseRunStatus : undefined;
}

function number(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function nonNegativeNumber(value: unknown): number | undefined {
  const parsed = number(value);
  return parsed !== undefined && parsed >= 0 ? parsed : undefined;
}

function nonNegativeInteger(value: unknown): number | undefined {
  const parsed = number(value);
  return parsed !== undefined && parsed >= 0 && Number.isInteger(parsed) ? parsed : undefined;
}

function text(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 240) : undefined;
}

function diagnosticCode(value: unknown): string | undefined {
  const candidate = text(value)?.toUpperCase().replace(/[^A-Z0-9_-]/gu, "_");
  return candidate?.slice(0, 80);
}

function safeDiagnosticMessage(value: unknown): string | undefined {
  const candidate = text(value);
  if (!candidate) return undefined;
  return /authorization|bearer|cookie|token|password|secret/iu.test(candidate)
    ? "Lighthouse execution failed"
    : candidate;
}
