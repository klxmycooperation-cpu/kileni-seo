import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AuditResultReport, type PublicAuditResultView } from "../../src/components/pages/AuditResultReport";
import { buildAuditClientPresentation } from "../../src/lib/audit/client-presentation";
import { normalizeLighthouseObservation } from "../../src/lib/audit/lighthouse-observation";
import { auditClientReportSnapshot } from "./fixtures/audit-client-report-snapshot";

const completedObservation = {
  status: "completed" as const,
  performance: 62,
  fcpMs: 1_200,
  lcpMs: 2_400,
  cls: 0.04,
  tbtMs: 120,
  speedIndexMs: 2_800,
  accessibility: 96,
  finalUrl: "https://example.com/",
  strategy: "mobile" as const,
  profile: "mobile" as const,
  startedAt: "2026-09-17T00:00:00.000Z",
  completedAt: "2026-09-17T00:00:08.000Z",
  capturedAt: "2026-09-17T00:00:08.000Z",
  durationMs: 8_000,
  lighthouseVersion: "12.8.2",
  source: "lighthouse",
  runCount: 1,
};

function snapshotWithPerformance(performanceObservation: unknown) {
  const source = auditClientReportSnapshot();
  return { ...source, performanceObservation };
}

function reportMarkup(result: Record<string, unknown>) {
  return renderToStaticMarkup(createElement(AuditResultReport, {
    locale: "ru",
    domain: "example.com",
    pagesChecked: 10,
    pagesDiscovered: 100,
    reportHref: "/report.pdf",
    copied: false,
    onCopy: () => undefined,
    offerHref: () => "/brief",
    result: result as PublicAuditResultView,
  }));
}

describe("explicit Lighthouse lifecycle", () => {
  it("uses one completed result for the summary, issue and detail card", () => {
    const presentation = buildAuditClientPresentation(snapshotWithPerformance(completedObservation), "ru");

    expect(presentation.performance).toMatchObject({ status: "completed", score: 62 });
    expect(presentation.performance.reason).toBe("Лабораторная проверка Lighthouse выполнена в мобильном профиле. Итоговый балл: 62 из 100. Это предварительный результат: он зависит от условий запуска и не заменяет данные реальных пользователей.");
    expect(presentation.issues.find((issue) => issue.checkId === "performance")?.whatFound).toContain("62 из 100");
  });

  it("does not turn a failed run into a score or a speed recommendation", () => {
    const failed = normalizeLighthouseObservation({
      status: "failed",
      startedAt: "2026-09-17T00:00:00.000Z",
      completedAt: "2026-09-17T00:00:03.000Z",
      durationMs: 3_000,
      errorCode: "CHROME_LAUNCH_FAILED",
      errorMessage: "Browser process could not start",
      source: "lighthouse",
    });
    const presentation = buildAuditClientPresentation(snapshotWithPerformance(failed), "ru");

    expect(presentation.performance).toMatchObject({ status: "failed", score: null });
    expect(presentation.issues.some((issue) => issue.checkId === "performance")).toBe(false);
    expect(presentation.performance.reason).toBe("Проверку скорости не удалось завершить. Это не означает, что страница медленная. Повторите запуск; если ошибка повторится, используйте код диагностики из технического журнала.");
  });

  it("keeps a timed-out run distinct and scoreless", () => {
    const timedOut = normalizeLighthouseObservation({
      status: "timed_out",
      startedAt: "2026-09-17T00:00:00.000Z",
      completedAt: "2026-09-17T00:00:30.000Z",
      durationMs: 30_000,
      errorCode: "LIGHTHOUSE_TIMEOUT",
      source: "lighthouse",
    });
    const presentation = buildAuditClientPresentation(snapshotWithPerformance(timedOut), "ru");

    expect(presentation.performance).toMatchObject({ status: "timed_out", score: null });
    expect(presentation.issues.some((issue) => issue.checkId === "performance")).toBe(false);
    expect(presentation.performance.reason).toBe("Проверка скорости не завершилась за отведённое время. Результат не получен и не должен влиять на итог аудита.");
  });

  it("recognises a legacy score without inventing missing details", () => {
    const presentation = buildAuditClientPresentation(snapshotWithPerformance({ performance: 62 }), "ru");

    expect(presentation.performance).toMatchObject({ status: "legacy_summary_only", score: 62, lcpMs: null, durationMs: null });
    expect(presentation.performance.reason).toBe("Сохранён итог ранее выполненного запуска Lighthouse: 62 из 100. В этом снимке не сохранены подробные метрики, время и условия запуска. Чтобы получить полный результат, повторите проверку.");
  });

  it("describes an old snapshot without Lighthouse data as unknown", () => {
    const source = auditClientReportSnapshot();
    const legacy: Record<string, unknown> = { ...source };
    delete legacy.performanceObservation;
    const presentation = buildAuditClientPresentation(legacy, "ru");

    expect(presentation.performance).toMatchObject({ status: "legacy_unknown", score: null });
    expect(presentation.performance.reason).toBe("В этом сохранённом результате нет данных о проверке Lighthouse. Неизвестно, запускалась ли она. Повторите проверку, чтобы получить актуальное измерение.");
  });

  it("marks a successful ephemeral result as not persisted while keeping its measurement", () => {
    const observation = normalizeLighthouseObservation(completedObservation, { storageMode: "ephemeral" });
    const presentation = buildAuditClientPresentation(snapshotWithPerformance(observation), "ru");

    expect(presentation.performance).toMatchObject({ status: "not_persisted", score: 62 });
    expect(presentation.performance.reason).toBe("Lighthouse успешно выполнился в текущем локальном сеансе, но результат не сохраняется без подключённого хранилища. После обновления страницы или открытия ссылки подробные данные будут недоступны.");
    expect(reportMarkup(snapshotWithPerformance(observation))).toContain("Локальный несохранённый запуск");
  });

  it("does not render a table of zeroes when coverage distribution was not saved", () => {
    const markup = reportMarkup(auditClientReportSnapshot());

    expect(markup).toContain("Данные о покрытии не сохранены");
    expect(markup).not.toContain("Нули сохранены");
  });
});
