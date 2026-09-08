export type PublicAuditCoverageStatus = "sample_complete" | "sample_partial";

type PublicAuditCoverageInput = {
  readonly result?: unknown;
  readonly pagesChecked?: number | null;
  readonly pagesDiscovered?: number | null;
  readonly pageLimit: number;
};

export type PublicAuditCoverage = {
  readonly pagesChecked: number;
  readonly pagesDiscovered: number;
  readonly pagesSelected: number;
  readonly coverageStatus: PublicAuditCoverageStatus;
};

/**
 * Describes the public sample, not the whole discovered site.
 *
 * Older audit records marked every capped crawl as `partial`, even when all
 * ten pages selected for the free check were successfully processed. This
 * function deliberately compares checked pages with the planned sample.
 */
export function derivePublicAuditCoverage(input: PublicAuditCoverageInput): PublicAuditCoverage {
  const result = record(input.result);
  const pagesChecked = nonNegativeInteger(result.pagesChecked) ?? nonNegativeInteger(input.pagesChecked) ?? 0;
  const pagesDiscovered = Math.max(
    pagesChecked,
    nonNegativeInteger(result.pagesDiscovered) ?? nonNegativeInteger(input.pagesDiscovered) ?? pagesChecked,
  );
  const safeLimit = Math.max(1, nonNegativeInteger(input.pageLimit) ?? 10);
  const coverage = record(result.coverage);
  const requestedSelection = nonNegativeInteger(result.pagesSelected) ?? nonNegativeInteger(coverage.plannedPages);
  const pagesSelected = Math.max(
    pagesChecked,
    Math.min(pagesDiscovered, safeLimit, requestedSelection ?? Math.min(pagesDiscovered, safeLimit)),
  );

  return {
    pagesChecked,
    pagesDiscovered,
    pagesSelected,
    coverageStatus: pagesChecked >= pagesSelected ? "sample_complete" : "sample_partial",
  };
}

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
