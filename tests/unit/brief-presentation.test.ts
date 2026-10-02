import { describe, expect, it } from "vitest";

import {
  briefPresentationEntries,
  briefServiceName,
  formatBriefEmailCopy,
} from "@/src/lib/brief/presentation";

describe("понятное представление брифа", () => {
  it("заменяет коды направлений понятными названиями", () => {
    expect(briefServiceName("audit", "ru")).toBe("SEO-аудит");
    expect(briefServiceName("web-development", "ru")).toBe("Разработка сайта");
  });

  it("показывает выбранное предложение без sourceOffer, slug и camelCase", () => {
    const entries = briefPresentationEntries({
      sourceOffer: "seo-audit-200",
      selectedOfferTitle: "Технический SEO-аудит",
      selectedOfferPrice: "29 000 ₽",
      selectedOfferScope: "До 200 страниц",
      selectedOfferDuration: "5–7 рабочих дней",
      selectedOfferResult: "Подробный список задач с доказательствами",
      auditComment: "Нужно проверить каталог",
    }, "audit", "ru");

    expect(entries).toContainEqual({
      key: "selectedOffer",
      label: "Выбранное предложение",
      value: "Технический SEO-аудит",
    });
    expect(entries).toContainEqual({
      key: "auditComment",
      label: "Комментарий",
      value: "Нужно проверить каталог",
    });
    expect(entries.map((entry) => entry.label).join(" ")).not.toMatch(/sourceOffer|selectedOffer|[a-z][A-Z]/u);
    expect(entries.map((entry) => entry.value).join(" ")).not.toContain("seo-audit-200");
  });

  it("не выводит служебные данные повторно на экране проверки", () => {
    const entries = briefPresentationEntries({
      company: "KILENI",
      sourceOffer: "seo-audit-200",
      selectedOfferPrice: "29 000 ₽",
    }, "audit", "ru", { offerDetails: "exclude" });

    expect(entries).toEqual([
      { key: "company", label: "Компания или проект", value: "KILENI" },
    ]);
  });

  it("собирает письмо без внутренних кодов и технических имён полей", () => {
    const copy = formatBriefEmailCopy("ru", "audit", {
      sourceOffer: "seo-audit-200",
      selectedOfferTitle: "Технический SEO-аудит",
      selectedOfferPrice: "29 000 ₽",
      generatedLooks: "yes",
    });

    expect(copy).toContain("направлению «SEO-аудит»");
    expect(copy).toContain("Выбранное предложение: Технический SEO-аудит");
    expect(copy).toContain("Стоимость: 29 000 ₽");
    expect(copy).not.toMatch(/sourceOffer|selectedOffer|generatedLooks|seo-audit-200/u);
  });

  it("сохраняет понятные подписи для legacy-ответов маркетплейс-брифа", () => {
    const entries = briefPresentationEntries({
      sourcePhotos: "yes",
      images: "no",
      infographics: "yes",
      generatedLooks: "unknown",
      video: "no",
      publishing: "yes",
      scheduledReplacement: "yes",
      ongoing: "no",
    }, "marketplaces", "ru");

    expect(entries.map((entry) => entry.label)).toEqual([
      "Есть исходные фотографии?",
      "Нужны новые изображения?",
      "Нужна инфографика?",
      "Нужна генерация образов?",
      "Нужно видео?",
      "Нужна публикация карточек?",
      "Нужна замена материалов по расписанию?",
      "Нужно регулярное сопровождение?",
    ]);
    expect(entries.map((entry) => entry.value)).toEqual([
      "Да",
      "Нет",
      "Да",
      "Не знаю",
      "Нет",
      "Да",
      "Да",
      "Нет",
    ]);
  });
});
