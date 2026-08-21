import { describe, expect, it } from "vitest";

import { getDictionary } from "../../src/content/dictionary";
import { getCase } from "../../src/content/cases";

describe("public copy", () => {
  it("uses the approved plain-language Russian hero copy", () => {
    const dictionary = getDictionary("ru");

    expect(dictionary.hero.title).toBe(
      "Сайт есть. Пора сделать так, чтобы его находили.",
    );
    expect(dictionary.hero.eyebrow).toBe("Бесплатная SEO-проверка до 10 страниц");
    expect(dictionary.hero.text).toBe(
      "Бесплатно проверим до 10 страниц, оценим техническое состояние сайта и покажем основные зоны риска. Без доступа к админке.",
    );
    expect(dictionary.process.map((step) => step.title)).toEqual([
      "Проверяем",
      "Объясняем",
      "Исправляем",
      "Перепроверяем",
    ]);
  });

  it("leads cases with externally checkable evidence and keeps the project score secondary", () => {
    const eco = getCase("ru", "eco-santeh");
    const zasorservice = getCase("ru", "zasorservice");

    expect(eco?.previewFacts.slice(0, 3)).toEqual([
      { value: "509/509", label: "страниц открылись без ошибки" },
      { value: "36 → 57", label: "мобильный лабораторный тест Lighthouse" },
      { value: "99/100", label: "десктопный лабораторный тест Lighthouse" },
    ]);
    expect(eco?.previewFacts.at(-1)).toEqual({ value: "35 → 93", label: "внутренняя шкала проекта" });
    expect(eco?.evidence.find((row) => row.metric.includes("чек-листу"))).toMatchObject({
      before: "35/100",
      after: "93/100",
    });

    expect(zasorservice?.previewFacts.slice(0, 2)).toEqual([
      { value: "575/575", label: "страниц открылись без ошибки" },
      { value: "0,519 → 0,0001", label: "сдвиг главного экрана (CLS) в двух тестах" },
    ]);
    expect(zasorservice?.previewFacts.at(-1)).toEqual({ value: "37 → 80", label: "внутренняя шкала проекта" });

    expect(eco?.fixes.join(" ")).not.toContain("Устранили точные дубли");
    expect(zasorservice?.evidence.find((row) => row.metric.includes("JSON-LD"))).toMatchObject({
      before: "0 из 606",
      after: "575 из 575",
    });
  });

  it("does not use decorative technical or agency jargon in Russian home copy", () => {
    const dictionary = getDictionary("ru");
    const copy = JSON.stringify(dictionary);

    for (const phrase of [
      "Digital-агентство",
      "подтверждённый технический результат",
      "управляемая динамика",
      "digital-система",
    ]) {
      expect(copy).not.toContain(phrase);
    }
  });
});
