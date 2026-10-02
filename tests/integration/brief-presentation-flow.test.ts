import { describe, expect, it } from "vitest";

import { briefAnswerEntries, serviceLabel } from "@/app/admin/_lib/presentation";
import { canonicalizeBriefOffer } from "@/src/lib/brief/offer-payload";
import { formatBriefEmailCopy } from "@/src/lib/brief/presentation";

describe("отображение сохранённого брифа", () => {
  it("использует одинаковые понятные названия в карточке и письме", () => {
    const canonical = canonicalizeBriefOffer({
      locale: "ru",
      service: "audit",
      offerId: "seo-audit-200",
      answers: {
        company: "ООО Пример",
        concern: "Часть страниц не находится в поиске",
      },
    });
    expect(canonical.ok).toBe(true);
    if (!canonical.ok) return;

    const adminEntries = briefAnswerEntries(canonical.answers, "audit", "ru");
    const email = formatBriefEmailCopy("ru", "audit", canonical.answers);

    expect(serviceLabel("audit")).toBe("SEO-аудит");
    expect(adminEntries).toContainEqual({
      key: "selectedOffer",
      label: "Выбранное предложение",
      value: "Технический SEO-аудит",
    });
    expect(email).toContain("Выбранное предложение: Технический SEO-аудит");
    expect(JSON.stringify(adminEntries)).not.toContain("seo-audit-200");
    expect(email).not.toContain("seo-audit-200");
  });
});
