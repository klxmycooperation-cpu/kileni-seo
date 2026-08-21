export function sanitizePublicAuditResult(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  const result: Record<string, unknown> = {};
  if (finiteNumber(value.score, 0, 100)) result.score = value.score;
  if (typeof value.grade === "string" && /^[A-E]$/u.test(value.grade)) result.grade = value.grade;
  if (typeof value.interpretation === "string") result.interpretation = value.interpretation.slice(0, 500);
  if (finiteNumber(value.pagesChecked, 0, 1_000_000)) result.pagesChecked = Math.floor(value.pagesChecked);
  if (finiteNumber(value.pagesDiscovered, 0, 1_000_000)) result.pagesDiscovered = Math.floor(value.pagesDiscovered);
  if (typeof value.partial === "boolean") result.partial = value.partial;
  if (Array.isArray(value.categories)) {
    result.categories = value.categories.slice(0, 20).flatMap((category) => {
      if (!isRecord(category) || typeof category.name !== "string" ||
          typeof category.explanation !== "string" ||
          (category.risk !== "low" && category.risk !== "medium" && category.risk !== "high" && category.risk !== "unknown")) {
        return [];
      }
      return [{
        name: category.name.slice(0, 160),
        risk: category.risk,
        explanation: category.explanation.slice(0, 1000),
      }];
    });
  }
  return Object.keys(result).length > 0 ? result : null;
}

function finiteNumber(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
