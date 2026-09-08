import { describe, expect, it } from "vitest";

import { buildBriefExport, buildLeadExport } from "@/app/api/admin/_lib/entity-export";

describe("экспорт заявок и брифов", () => {
  it("exports a lead with workflow history and without hidden database JSON fields", () => {
    const exported = buildLeadExport({
      lead: { id: "lead-1", name: "Анна", contact: "anna@example.ru", utm: { utm_source: "search" } },
      calculations: [{ id: "calc-1", answers: { pages: 10 } }],
      notes: [{ id: "note-1", note: "Перезвонить во вторник" }],
      notifications: [],
      metadata: { qaLabel: null, offerSnapshot: null, archivedAt: null, updatedAt: null },
    }, "2026-08-30T10:00:00.000Z");

    expect(exported).toMatchObject({
      kind: "lead",
      exportedAt: "2026-08-30T10:00:00.000Z",
      record: { id: "lead-1", name: "Анна" },
      calculations: [{ id: "calc-1", answers: { pages: 10 } }],
      notes: [{ note: "Перезвонить во вторник" }],
    });
    expect(JSON.stringify(exported)).not.toContain("answersJson");
    expect(JSON.stringify(exported)).not.toContain("utmJson");
  });

  it("exports a brief with offer snapshot, notes and attachment metadata but not private storage names", () => {
    const exported = buildBriefExport({
      brief: {
        id: "brief-1",
        name: "Илья",
        answers: {
          sourceOffer: "seo-audit-200",
          selectedOfferTitle: "Полный SEO-аудит",
          selectedOfferPrice: "39 900 ₽",
        },
      },
      attachments: [{ id: "file-1", originalName: "brief.pdf", mime: "application/pdf", size: 1200 }],
      notes: [{ id: "note-1", note: "Смета отправлена" }],
      notifications: [],
      metadata: { qaLabel: "Ручная QA-проверка", offerSnapshot: null, archivedAt: null, updatedAt: 1 },
    }, "2026-08-30T10:00:00.000Z");

    expect(exported).toMatchObject({
      kind: "brief",
      record: { id: "brief-1" },
      offerSnapshot: {
        id: "seo-audit-200",
        title: "Полный SEO-аудит",
        price: "39 900 ₽",
      },
      attachments: [{ id: "file-1", originalName: "brief.pdf" }],
      notes: [{ note: "Смета отправлена" }],
    });
    expect(JSON.stringify(exported)).not.toContain("storageName");
  });
});
