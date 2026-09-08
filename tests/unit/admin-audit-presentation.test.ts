import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("представление аудита без старой оценки", () => {
  it("не показывает старый балл и grade в списке и обзоре", () => {
    const list = readFileSync("app/admin/audits/page.tsx", "utf8");
    const overview = readFileSync("app/admin/audits/_components/AuditOverview.tsx", "utf8");

    expect(list).not.toMatch(/Оценка|overallScore|audit\.grade|admin-score-cell/u);
    expect(overview).not.toMatch(/overallScore|audit\.grade|Сохранённый уровень/u);
  });
});
