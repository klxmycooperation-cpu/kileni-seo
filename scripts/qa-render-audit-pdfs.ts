import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createPublicAuditPdf } from "../src/lib/reports/audit-pdf";
import { auditClientReportSnapshot } from "../tests/unit/fixtures/audit-client-report-snapshot";

const outputDir = resolve("docs/user-audit-evidence/audit-final-2026-09-02/pdf");
await mkdir(outputDir, { recursive: true });

const publicResult = auditClientReportSnapshot();
const bytes = await createPublicAuditPdf({
  locale: "ru",
  normalizedDomain: "example.com",
  score: null,
  grade: null,
  partial: false,
  pagesChecked: publicResult.pagesChecked,
  pagesDiscovered: publicResult.pagesDiscovered,
  completedAt: Date.parse("2026-09-02T10:06:00.000Z"),
  publicResult: publicResult as unknown as Record<string, unknown>,
});

const outputPath = resolve(outputDir, "client-report.pdf");
await writeFile(outputPath, bytes);
console.log(outputPath);
