import { describe, expect, it } from "vitest";

import { auditMainFindings, briefOfferHref } from "../../src/components/pages/AuditProgressPage";
import { auditV4Snapshot } from "./fixtures/audit-v4-snapshot";

describe("audit result offer links", () => {
  it("carries only the public audit token needed for same-browser prefill", () => {
    const href = briefOfferHref("ru", "example.com", "seo-audit-implementation", "public-token-123");
    const url = new URL(href, "https://kileni.example");

    expect(url.pathname).toBe("/brief");
    expect(url.searchParams.get("audit")).toBe("public-token-123");
    expect(url.searchParams.get("domain")).toBe("example.com");
    expect(url.searchParams.get("offer")).toBe("seo-audit-implementation");
    expect(url.searchParams.has("discount")).toBe(false);
    expect(url.searchParams.has("name")).toBe(false);
    expect(url.searchParams.has("contact")).toBe(false);
  });
});

describe("audit result first-screen findings", () => {
  it("uses the deduplicated v4 findings before individual check rows", () => {
    const findings = auditMainFindings(auditV4Snapshot(), "ru", 2, 2, 0);

    expect(findings[0]).toMatchObject({
      status: "warning",
      title: "Главный заголовок",
      detail: "Главный заголовок H1 не найден",
    });
    expect(findings.filter((finding) => finding.title === "Главный заголовок")).toHaveLength(1);
  });

  it("keeps concrete problems first and adds honest coverage context", () => {
    const findings = auditMainFindings({
      contractVersion: 2,
      coverageStatus: "sample_complete",
      checks: [
        { checkId: "h1", checkVersion: 1, category: "structure", title: "Главный заголовок", status: "fail", value: null, expected: "Один H1", severity: "high", urlEvidence: [], explanation: "На двух страницах нет главного заголовка.", automationLimit: "Только выборка." },
        { checkId: "title", checkVersion: 1, category: "structure", title: "Заголовки для поиска", status: "pass", value: null, expected: "Есть title", severity: "high", urlEvidence: [], explanation: "На проверенных страницах заголовки заданы.", automationLimit: "Только выборка." },
      ],
    }, "ru", 10, 10, 14);

    expect(findings).toHaveLength(5);
    expect(findings[0]).toMatchObject({ status: "fail", title: "Главный заголовок" });
    expect(findings.some((finding) => finding.title === "Проверено 10 выбранных страниц")).toBe(true);
    expect(findings.some((finding) => finding.title.includes("14 найденных адресов"))).toBe(true);
  });

  it("does not invent a problem when all completed checks passed", () => {
    const findings = auditMainFindings({
      contractVersion: 2,
      coverageStatus: "sample_complete",
      checks: [{ checkId: "status", checkVersion: 1, category: "technical", title: "Страницы открываются", status: "pass", value: null, expected: "HTTP 200", severity: "critical", urlEvidence: [], explanation: "Все выбранные страницы открылись без ошибки.", automationLimit: "Только выборка." }],
    }, "ru", 1, 1, 0);

    expect(findings[0]).toMatchObject({ status: "pass", title: "Страницы открываются" });
    expect(findings).toHaveLength(3);
    expect(findings.every((finding) => finding.status !== "fail" && finding.status !== "warning")).toBe(true);
  });
});
