import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { getDictionary } from "../../src/content/dictionary";

describe("free audit promise copy", () => {
  it("keeps the ten-page promise explicit without repeating it in the form title", () => {
    const ru = getDictionary("ru");
    const en = getDictionary("en");

    expect({ eyebrow: ru.hero.eyebrow, title: ru.auditForm.title, limit: ru.auditForm.limit })
      .toEqual({
        eyebrow: "Бесплатная экспресс-проверка до 10 репрезентативных страниц сайта",
        title: "Бесплатная экспресс-проверка",
        limit: "Бесплатно проверим до 10 репрезентативных страниц сайта",
      });
    expect(ru.auditForm.submit).toBe("Проверить бесплатно до 10 репрезентативных страниц сайта");
    expect({ eyebrow: en.hero.eyebrow, title: en.auditForm.title, limit: en.auditForm.limit })
      .toEqual({
        eyebrow: "Free express check of up to 10 representative website pages",
        title: "Free express check",
        limit: "We check up to 10 representative website pages for free",
      });
    expect(en.auditForm.submit).toBe("Check up to 10 representative website pages for free");
  });

  it("does not repeat the free-audit promise above the page heading", () => {
    const page = readFileSync(resolve(process.cwd(), "src/components/pages/FreeAuditPage.tsx"), "utf8");
    const form = readFileSync(resolve(process.cwd(), "src/components/forms/AuditForm.tsx"), "utf8");

    expect(page).not.toContain("{d.hero.eyebrow}");
    expect(form).toContain("{d.limit}");
  });
});
