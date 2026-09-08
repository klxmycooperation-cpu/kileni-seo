import { describe, expect, it } from "vitest";

import { buildDashboardDailySeries } from "../../app/admin/_lib/data";
import { moscowDayKey, normalizeCountedPublicPath } from "../../src/lib/analytics/page-views";

describe("анонимная статистика просмотров", () => {
  it("принимает только публичный путь без параметров и закрытых идентификаторов", () => {
    expect(normalizeCountedPublicPath("/blog/seo-audit-when-you-need-it/")).toBe("/blog/seo-audit-when-you-need-it");
    expect(normalizeCountedPublicPath("/en/glossary/lighthouse")).toBe("/en/glossary/lighthouse");
    expect(normalizeCountedPublicPath("/checks/http-status")).toBe("/checks/http-status");
    expect(normalizeCountedPublicPath("/fake-analytics-path")).toBeNull();
    expect(normalizeCountedPublicPath("/blog/not-a-real-article")).toBeNull();
    expect(normalizeCountedPublicPath("/blog?email=private@example.ru")).toBeNull();
    expect(normalizeCountedPublicPath("/admin/leads")).toBeNull();
    expect(normalizeCountedPublicPath("/audit/private-token")).toBeNull();
    expect(normalizeCountedPublicPath("https://example.ru/blog")).toBeNull();
  });

  it("формирует непрерывные семь дней и честно заполняет отсутствующие дни нулями", () => {
    const now = Date.parse("2026-08-31T09:00:00.000Z");
    expect(moscowDayKey(now)).toBe("2026-08-31");
    const series = buildDashboardDailySeries([{ day: "2026-08-31", count: 4 }], 7, now);
    expect(series).toHaveLength(7);
    expect(series.at(-1)).toMatchObject({ day: "2026-08-31", count: 4 });
    expect(series.slice(0, -1).every((point) => point.count === 0)).toBe(true);
  });
});
