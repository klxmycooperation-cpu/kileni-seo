import { describe, expect, it } from "vitest";

import { briefStepIssue, isValidBriefContact } from "@/src/components/forms/BriefWizard";

describe("пошаговая проверка брифа", () => {
  it("не пропускает обязательный контекст задачи", () => {
    expect(briefStepIssue(1, "seo", { company: "KILENI", problem: "", result: "Нужны заявки" }, "ru")).toMatchObject({ key: "problem" });
  });

  it("проверяет обязательные поля выбранного направления", () => {
    expect(briefStepIssue(2, "audit", { url: "https://example.ru", concern: "" }, "ru")).toMatchObject({ key: "concern" });
    expect(briefStepIssue(2, "custom", { context: "Нужно связать формы с CRM" }, "ru")).toBeNull();
  });

  it("принимает e-mail и отклоняет телефон", () => {
    expect(isValidBriefContact("name@example.ru")).toBe(true);
    expect(isValidBriefContact("+7 925 225-60-20")).toBe(false);
    expect(isValidBriefContact("@kileni_team")).toBe(false);
    expect(isValidBriefContact("просто текст")).toBe(false);
  });

  it("требует контакт и согласие перед отправкой", () => {
    expect(briefStepIssue(3, "seo", { name: "Анна", contact: "bad", consent: "yes" }, "ru")).toMatchObject({ key: "contact" });
    expect(briefStepIssue(3, "seo", { name: "Анна", contact: "anna@example.ru", consent: "" }, "ru")).toMatchObject({ key: "consent" });
    expect(briefStepIssue(3, "seo", { name: "Анна", contact: "anna@example.ru", consent: "yes" }, "ru")).toBeNull();
  });
});
