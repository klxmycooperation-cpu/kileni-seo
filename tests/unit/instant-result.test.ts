import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { decodeInstantAuditSnapshot } from "../../src/lib/audit/instant-result";

describe("legacy instant audit snapshots", () => {
  it("never accepts unsigned browser data as an audit result", () => {
    const forged = Buffer.from(JSON.stringify({
      version: 1,
      locale: "ru",
      normalizedDomain: "forged.example",
      completedAt: Date.now(),
      result: {
        score: 99,
        grade: "A",
        interpretation: "Поддельный результат",
        pagesChecked: 100,
        pagesDiscovered: 100,
        partial: false,
        categories: Array.from({ length: 5 }, (_, index) => ({
          name: `Категория ${index + 1}`,
          risk: "low",
          explanation: "Неподписанные данные.",
        })),
      },
    })).toString("base64url");

    expect(decodeInstantAuditSnapshot(forged)).toBeNull();
  });

  it("does not pass an instant query payload into public result components", () => {
    const sources = [
      "app/audit/[publicToken]/page.tsx",
      "app/en/audit/[publicToken]/page.tsx",
      "src/components/pages/AuditProgressPage.tsx",
    ].map((path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"));

    expect(sources.join("\n")).not.toMatch(/\binstant\b/u);
  });
});
