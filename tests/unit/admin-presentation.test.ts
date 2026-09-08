import { describe, expect, it } from "vitest";

import {
  briefAnswerEntries,
  contactAction,
  notificationLabel,
  serviceLabel,
  sourceLabel,
  submissionStatusLabel,
} from "@/app/admin/_lib/presentation";

describe("понятное представление заявок в админке", () => {
  it("строит безопасные действия для поддерживаемых контактов", () => {
    expect(contactAction("manager@example.ru")).toMatchObject({ kind: "email", href: "mailto:manager@example.ru", actionLabel: "Написать письмо" });
    expect(contactAction("@kileni_team")).toMatchObject({ kind: "telegram", href: "https://t.me/kileni_team", actionLabel: "Открыть Telegram" });
    expect(contactAction("+7 (999) 123-45-67", "phone")).toMatchObject({ kind: "phone", href: "tel:+79991234567", actionLabel: "Позвонить" });
  });

  it("не делает неизвестный или опасный контакт ссылкой", () => {
    expect(contactAction("javascript:alert(1)")).toMatchObject({ kind: "unknown", href: null });
    expect(contactAction("https://example.ru", "telegram")).toMatchObject({ kind: "unknown", href: null });
  });

  it("заменяет внутренние коды понятными названиями", () => {
    expect(submissionStatusLabel("proposal_sent")).toBe("Предложение отправлено");
    expect(serviceLabel("web-development")).toBe("Разработка сайта");
    expect(sourceLabel("service-form")).toBe("Форма на странице услуги");
  });

  it("не выдаёт передачу письма SMTP-серверу за подтверждённую доставку", () => {
    expect(notificationLabel("sent")).toBe("Передано почтовому серверу");
  });

  it("показывает ответы брифа с вопросами и расшифровывает варианты", () => {
    expect(briefAnswerEntries({ url: "https://example.ru", promotion: "yes", consent: "yes" }, "seo", "ru")).toEqual([
      { key: "url", label: "Ссылка на сайт", value: "https://example.ru" },
      { key: "promotion", label: "Продвигался ли сайт раньше?", value: "Да" },
    ]);
  });
});
