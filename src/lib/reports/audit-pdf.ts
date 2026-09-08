import { readFile } from "node:fs/promises";
import { join } from "node:path";

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import {
  auditCheckCopy,
  auditIssueCopy,
  auditObservationCopy,
  auditPageFindings,
  auditTermDefinitions,
  type AuditReportLocale,
} from "../audit/report-content";
import { buildAuditClientPresentation, type AuditClientPresentation } from "../audit/client-presentation";
import { derivePublicAuditCoverage } from "../audit/public-coverage";
import { PUBLIC_AUDIT_PAGE_LIMIT } from "../../config/public-audit";

type AuditPdfInput = {
  audit: {
    id: string;
    normalizedDomain: string;
    originalUrl: string;
    name: string;
    contact: string;
    status: string;
    overallScore: number | null;
    grade: string | null;
    partial: number;
    pagesChecked: number;
    pagesDiscovered: number;
    createdAt: number;
    completedAt: number | null;
  };
  fullResult: unknown;
  issues: readonly Record<string, unknown>[];
  pages: readonly Record<string, unknown>[];
};

export type PublicAuditPdfInput = {
  locale: "ru" | "en";
  normalizedDomain: string;
  score: number | null;
  grade: string | null;
  partial: boolean;
  pagesChecked: number;
  pagesDiscovered: number;
  completedAt: number | null;
  publicResult: unknown;
};

type PrintableAuditCheck = {
  checkId: string;
  checkVersion: number;
  category: string;
  title: string;
  status: string;
  expected: string;
  explanation: string;
  automationLimit: string;
  severity: string;
  evidence: Array<{ url: string; observation: string }>;
};

type PrintableSelectedPage = {
  url: string;
  pageType: string;
  selectionReason: string;
  templateFamily: string;
  classificationConfidence: number | null;
  classificationReasons: string[];
};

type PublicAuditPdfModel = {
  isLegacy: boolean;
  contractVersion: number | null;
  engineVersion: string;
  coverageStatus: string;
  inventorySummary: { objectsFound: number; htmlFound: number; eligibleHtml: number; selected: number; checked: number; representedPageTypes: number };
  statusCounts: { pass: number; warning: number; fail: number; not_applicable: number; not_run: number; insufficient_data: number };
  checks: PrintableAuditCheck[];
  selectedPages: PrintableSelectedPage[];
  unchecked: { total: number; returned: number; truncated: boolean; urls: string[] };
  summary: { headline: string; facts: string[]; risks: string[]; strengths: string[] };
  indexability: {
    status: string;
    checked: number;
    technicallyIndexable: number;
    noindexPages: number;
    httpErrorPages: number;
    limitation: string;
    stages: Array<{ label: string; count: number; explanation: string }>;
  };
  issues: Array<{
    code: string;
    severity: string;
    title: string;
    observation: string;
    whyItMatters: string;
    recommendation: string;
    acceptance: string;
    affectedCount: number;
    affectedUrls: string[];
    evidence: string[];
  }>;
  pages: Array<{
    url: string;
    finalUrl: string;
    status: number;
    title: string;
    description: string;
    h1: string;
    noindex: boolean;
    canonical: string;
    inSitemap: boolean | null;
    outgoingLinks: number;
    incomingFromCheckedPages: number;
    findings: string[];
  }>;
  technicalResources: Array<{
    url: string;
    resourceType: string;
    statusCode: number | null;
    contentType: string;
    classificationReasons: string[];
  }>;
  limitations: string[];
  clientPresentation: AuditClientPresentation;
};

const PAGE: [number, number] = [595.28, 841.89];
const MARGIN = 48;
const CONTENT_WIDTH = PAGE[0] - MARGIN * 2;

export const PUBLIC_AUDIT_DISCLAIMER = {
  ru: "Это предварительная внутренняя оценка KILENI публичной части сайта, а не официальный показатель Яндекса, Google или PageSpeed.",
  en: "This is a preliminary internal KILENI assessment of the site's public pages, not an official Yandex, Google or PageSpeed metric.",
} as const;

export async function createAdminAuditPdf(input: AuditPdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fontBytes = await readReportFont(false);
  const boldBytes = await readReportFont(true);
  const font = await pdf.embedFont(fontBytes, { subset: true });
  const bold = await pdf.embedFont(boldBytes, { subset: true });
  pdf.setTitle(`KILENI SEO audit — ${input.audit.normalizedDomain}`);
  pdf.setAuthor("KILENI");
  pdf.setSubject("Полный административный SEO-отчёт");
  pdf.setCreationDate(new Date());

  const writer = new PdfWriter(pdf, font, bold);
  writer.cover(input.audit.normalizedDomain);
  const contractSnapshot = auditContractSnapshot(input.fullResult);
  if (contractSnapshot) {
    renderAdminContractSnapshot(writer, input, contractSnapshot);
    writer.finish();
    return pdf.save({ useObjectStreams: false });
  }

  writer.heading("Сводка", 18);
  writer.keyValue("URL", input.audit.originalUrl);
  writer.keyValue("Статус", input.audit.status);
  writer.keyValue("Формат", "Сохранённые факты прежней версии без общего балла");
  writer.keyValue("Охват", `${input.audit.pagesChecked} из ${input.audit.pagesDiscovered} найденных страниц${input.audit.partial ? " · частичная проверка" : ""}`);
  writer.keyValue("Заявка", `${input.audit.name} · ${input.audit.contact}`);
  writer.keyValue("Создан", new Date(input.audit.createdAt).toISOString());
  writer.keyValue("Завершён", input.audit.completedAt ? new Date(input.audit.completedAt).toISOString() : "—");

  writer.heading(`Проблемы · ${input.issues.length}`, 18);
  if (!input.issues.length) writer.paragraph("Зафиксированных проблем нет.");
  input.issues.forEach((issue, index) => {
    writer.paragraph(`${index + 1}. [${text(issue.severity).toUpperCase()}] ${text(issue.code)}`, { bold: true, color: severityColor(text(issue.severity)) });
    if (issue.url) writer.paragraph(`URL: ${text(issue.url)}`, { size: 8.5 });
    if (issue.evidence) writer.paragraph(`Доказательство: ${text(issue.evidence)}`);
    if (issue.recommendation) writer.paragraph(`Рекомендация: ${text(issue.recommendation)}`);
    writer.rule();
  });

  writer.heading(`Проверенные страницы · ${input.pages.length}`, 18);
  for (const [index, page] of input.pages.entries()) {
    const data = record(page.data);
    const title = record(data.title);
    writer.paragraph(`${index + 1}. ${text(page.url)}`, { bold: true, size: 9.5 });
    writer.paragraph(`HTTP ${number(page.statusCode) || number(data.status) || "—"} · Title: ${text(title.value) || "—"}`, { size: 8.5, color: rgb(.33, .36, .42) });
    writer.space(5);
  }

  writer.finish();
  return pdf.save({ useObjectStreams: false });
}

function renderAdminContractSnapshot(writer: PdfWriter, input: AuditPdfInput, snapshotValue: unknown) {
  const snapshot = buildPublicAuditPdfModel(snapshotValue, "ru");
  const counts = snapshot.statusCounts;

  writer.heading("Сводка сохранённого снимка", 18);
  writer.keyValue("URL", input.audit.originalUrl);
  writer.keyValue("Статус задания", input.audit.status);
  writer.keyValue("Версия проверки", snapshot.engineVersion || "—");
  writer.keyValue("Версия контракта", snapshot.contractVersion ? String(snapshot.contractVersion) : "—");
  writer.keyValue("Охват", `${input.audit.pagesChecked} подробно проверено из ${input.audit.pagesDiscovered} найденных адресов · ${coveragePdfLabel(snapshot.coverageStatus)}`);
  writer.keyValue("Статусы", `ошибки ${counts.fail} · замечания ${counts.warning} · пройдено ${counts.pass} · не относится к объекту ${counts.not_applicable} · замеров не запускалось ${counts.not_run} · результатов не получено ${counts.insufficient_data}`);
  writer.keyValue("Заявка", `${input.audit.name || "—"} · ${input.audit.contact || "контакт не указан"}`);
  writer.keyValue("Создан", new Date(input.audit.createdAt).toISOString());
  writer.keyValue("Завершён", input.audit.completedAt ? new Date(input.audit.completedAt).toISOString() : "—");
  writer.paragraph("Общий балл не рассчитывается: каждый вывод ниже связан с конкретной проверкой и сохранённым доказательством.", { bold: true, color: rgb(.16, .4, .94) });

  writer.heading(`Все проверки · ${snapshot.checks.length}`, 18);
  if (!snapshot.checks.length) writer.paragraph("В сохранённом снимке нет выполненных проверок.");
  const orderedChecks = [
    ...snapshot.checks.filter((check) => check.status === "fail" || check.status === "warning"),
    ...snapshot.checks.filter((check) => check.status === "not_applicable"),
    ...snapshot.checks.filter((check) => check.status === "not_run" || check.status === "insufficient_data"),
    ...snapshot.checks.filter((check) => check.status === "pass"),
  ];
  orderedChecks.forEach((check, index) => {
    writer.paragraph(`${index + 1}. ${checkStatusPdfLabel(check.status, true)} · ${check.title}`, { bold: true, color: checkStatusPdfColor(check.status) });
    writer.paragraph(`Результат проверки: ${check.explanation || "Результат не сохранён."}`);
    writer.paragraph(`Что считается нормой: ${check.expected || "—"}`, { size: 8.8 });
    writer.paragraph(`Что именно проверено: ${check.automationLimit || "—"}`, { size: 8.5, color: rgb(.33, .36, .42) });
    check.evidence.slice(0, 8).forEach((evidence) => writer.paragraph(`Адрес: ${evidence.url} · ${evidence.observation}`, { size: 8.4, color: rgb(.27, .32, .42) }));
    if (check.evidence.length > 8) writer.paragraph(`Ещё фактов: ${check.evidence.length - 8}`, { size: 8.4, color: rgb(.33, .36, .42) });
    writer.rule();
  });

  writer.heading(`Выбранные страницы · ${snapshot.selectedPages.length}`, 18);
  if (!snapshot.selectedPages.length) writer.paragraph("Список выбранных страниц отсутствует.");
  snapshot.selectedPages.forEach((page, index) => {
    writer.paragraph(`${index + 1}. ${page.pageType || "Страница"} · ${page.url}`, { bold: true, size: 9 });
    writer.paragraph(`Почему выбрана: ${page.selectionReason || "Представляет отдельный тип страницы сайта."}`, { size: 8.5, color: rgb(.33, .36, .42) });
    if (page.classificationConfidence !== null) writer.paragraph(`Уверенность классификации: ${Math.round(page.classificationConfidence * 100)}% · ${page.classificationReasons.join("; ") || "причина не сохранена"}`, { size: 8.2, color: rgb(.33, .36, .42) });
  });

  if (snapshot.technicalResources.length) {
    writer.heading(`Технические файлы · ${snapshot.technicalResources.length}`, 18);
    snapshot.technicalResources.forEach((resource, index) => writer.paragraph(`${index + 1}. ${technicalResourcePdfLabel(resource.resourceType, true)} · ${resource.url} · HTTP ${resource.statusCode ?? "—"}${resource.contentType ? ` · ${resource.contentType}` : ""}`, { size: 8.5 }));
  }

  writer.heading(`Факты по проверенным страницам · ${snapshot.pages.length}`, 18);
  if (!snapshot.pages.length) writer.paragraph("В этом снимке нет сохранённых фактов по URL. Это допустимо для отчётов прежней версии.");
  snapshot.pages.forEach((page, index) => {
    writer.paragraph(`${index + 1}. ${page.url}`, { bold: true, size: 9 });
    if (page.finalUrl && page.finalUrl !== page.url) writer.paragraph(`После перенаправления: ${page.finalUrl}`, { size: 8.5 });
    writer.paragraph(`Код ответа сайта: ${page.status || "—"} · Заголовок для поиска: ${page.title || "не заполнен"} · Главный заголовок: ${page.h1 || "не задан"}`, { size: 8.5, color: rgb(.27, .32, .42) });
    writer.paragraph(`Описание для поиска: ${page.description || "не заполнено"} · Запрет на показ в поиске: ${page.noindex ? "есть" : "нет"}`, { size: 8.5, color: rgb(.27, .32, .42) });
    writer.paragraph(`Основной адрес страницы: ${page.canonical || "не указан"} · В файле со списком страниц: ${boolPdf(page.inSitemap, true)}`, { size: 8.5, color: rgb(.27, .32, .42) });
    writer.paragraph(`Ссылки между проверенными страницами: на страницу ${page.incomingFromCheckedPages} · со страницы ${page.outgoingLinks}`, { size: 8.5, color: rgb(.27, .32, .42) });
    page.findings.slice(0, 3).forEach((finding) => writer.paragraph(`• ${finding}`, { size: 8.5 }));
    if (!page.findings.length) writer.paragraph("По сохранённым признакам замечаний нет.", { size: 8.5, color: rgb(.12, .48, .32) });
    writer.space(3);
  });

  writer.heading("Найдены, но не вошли в бесплатную выборку", 18);
  writer.paragraph(`${snapshot.unchecked.total} адресов не были подробно проверены. Это не означает, что на них найдены ошибки или что их нет в поиске.`);
  snapshot.unchecked.urls.slice(0, 20).forEach((url) => writer.paragraph(`• ${url}`, { size: 7.7, color: rgb(.27, .32, .42) }));
  if (snapshot.unchecked.truncated || snapshot.unchecked.total > snapshot.unchecked.urls.slice(0, 20).length) {
    writer.paragraph(`В документе показано ${Math.min(20, snapshot.unchecked.urls.length)} из ${snapshot.unchecked.total} доступных адресов.`, { size: 8, color: rgb(.33, .36, .42) });
  }

  const unavailable = snapshot.checks.filter((check) => check.status === "not_run" || check.status === "insufficient_data");
  writer.heading(`Замеры без результата · ${unavailable.length}`, 18);
  if (!unavailable.length) writer.paragraph("Все проверки текущей версии получили достаточно данных.");
  const shownUnavailable = unavailable.slice(0, 8);
  shownUnavailable.forEach((check) => {
    writer.paragraph(`${checkStatusPdfLabel(check.status, true)} · ${check.title}`, { bold: true, size: 9 });
    writer.paragraph(`${check.explanation} ${check.automationLimit}`, { size: 8, color: rgb(.33, .36, .42) });
  });
  if (unavailable.length > shownUnavailable.length) {
    writer.paragraph(
      `Ещё пунктов: ${unavailable.length - shownUnavailable.length}. Их точные статусы и названия сохранены в сводке выше.`,
      { size: 8, color: rgb(.33, .36, .42) },
    );
  }
}

function auditContractSnapshot(value: unknown): unknown | null {
  const root = record(value);
  const publicResult = record(root.publicResult);
  if (isAuditContractSnapshot(publicResult)) return publicResult;
  if (isAuditContractSnapshot(root)) return root;
  return null;
}

function coveragePdfLabel(value: string): string {
  return value === "sample_complete" ? "вся выбранная выборка проверена" : "часть выбранной выборки не удалось проверить";
}

function checkStatusPdfColor(status: string): ReturnType<typeof rgb> {
  if (status === "fail") return rgb(.74, .16, .2);
  if (status === "warning") return rgb(.68, .43, .08);
  if (status === "pass") return rgb(.08, .48, .32);
  return rgb(.35, .39, .47);
}

/** Public report generated from the same redacted evidence snapshot as the web result. */
export async function createPublicAuditPdf(input: PublicAuditPdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(await readReportFont(false), { subset: true });
  const bold = await pdf.embedFont(await readReportFont(true), { subset: true });
  const ru = input.locale === "ru";
  pdf.setTitle(`${ru ? "Предварительная SEO-проверка" : "Preliminary SEO check"} — ${clean(input.normalizedDomain)}`);
  pdf.setAuthor("KILENI");
  pdf.setSubject(ru ? "Публичный результат предварительной SEO-проверки" : "Public preliminary SEO check result");
  pdf.setCreationDate(new Date());

  const snapshot = buildPublicAuditPdfModel(input.publicResult, input.locale);
  const coverage = derivePublicAuditCoverage({
    result: input.publicResult,
    pagesChecked: input.pagesChecked,
    pagesDiscovered: input.pagesDiscovered,
    pageLimit: PUBLIC_AUDIT_PAGE_LIMIT,
  });
  const writer = new PublicPdfWriter(pdf, font, bold, ru);
  writer.cover(input);

  if (snapshot.contractVersion === 2 || snapshot.contractVersion === 3) {
    writeContractAuditPdf(writer, snapshot, ru);
    writer.finish();
    return pdf.save({ useObjectStreams: false });
  }

  if (snapshot.isLegacy) {
    writer.heading(ru ? "Сохранённый отчёт прежней версии" : "Saved report from an earlier version");
    writer.paragraph(ru
      ? "Мы показываем только факты, которые были сохранены при той проверке. Старый общий балл скрыт: без полного набора исходных фактов его нельзя проверить повторно. Чтобы получить текущий набор проверок и пояснений, запустите проверку ещё раз."
      : "Only facts saved by that check are shown. The old aggregate score is hidden because it cannot be reproduced without the full evidence set. Run the check again to receive the current checks and explanations.", { size: 9, color: rgb(.33, .36, .42) });
  }

  writer.heading(ru ? "Охват проверки" : "Audit coverage");
  writer.keyValue(ru ? "URL обнаружено" : "URLs discovered", `${input.pagesDiscovered}`);
  writer.keyValue(ru ? "Подробно проверено" : "Checked in detail", `${input.pagesChecked} ${ru ? "из максимум 10 страниц" : "of up to 10 pages"}`);
  writer.keyValue(ru ? "Не вошло в выборку" : "Outside the sample", `${Math.max(0, input.pagesDiscovered - input.pagesChecked)}`);
  writer.keyValue(ru ? "Статус" : "Status", coverage.coverageStatus === "sample_partial" ? (ru ? "Не все выбранные страницы удалось проверить" : "Not every selected page could be checked") : (ru ? "Все выбранные страницы проверены" : "All selected pages were checked"));
  if (input.completedAt) writer.keyValue(ru ? "Дата" : "Date", new Intl.DateTimeFormat(ru ? "ru-RU" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Moscow" }).format(input.completedAt));
  writer.paragraph(ru
    ? "Остальные обнаруженные адреса не считаются проверенными: по ним отчёт не делает выводов, пока страница не была загружена и разобрана."
    : "Other discovered addresses are not treated as checked. No conclusions are made until a page has been loaded and analysed.", { size: 8.5, color: rgb(.33, .36, .42) });
  writer.paragraph(ru ? PUBLIC_AUDIT_DISCLAIMER.ru : PUBLIC_AUDIT_DISCLAIMER.en, { size: 8.5, color: rgb(.33, .36, .42) });

  if (snapshot.summary.headline || snapshot.summary.risks.length || snapshot.summary.strengths.length || snapshot.summary.facts.length) {
    writer.heading(ru ? "Главное по проверенным страницам" : "Summary of checked pages");
    if (snapshot.summary.headline) writer.paragraph(snapshot.summary.headline, { bold: true, size: 13, lineHeight: 17 });
    if (snapshot.summary.risks.length) {
      writer.paragraph(ru ? "Сначала исправить" : "Fix first", { bold: true, size: 10.5 });
      snapshot.summary.risks.slice(0, 5).forEach((item) => writer.paragraph(`• ${item}`, { size: 9 }));
    }
    if (snapshot.summary.strengths.length) {
      writer.paragraph(ru ? "Уже работает" : "Already working", { bold: true, size: 10.5 });
      snapshot.summary.strengths.slice(0, 5).forEach((item) => writer.paragraph(`• ${item}`, { size: 9 }));
    }
    snapshot.summary.facts.slice(0, 5).forEach((item) => writer.paragraph(`• ${item}`, { size: 9 }));
  }

  if (snapshot.indexability.checked > 0 || snapshot.indexability.status === "not_checked" || snapshot.indexability.stages.length) {
    writer.heading(ru ? "Может ли поисковик обработать страницы" : "Can search engines process the pages" );
    if (snapshot.indexability.status === "not_checked") {
      writer.paragraph(snapshot.indexability.limitation || (ru
        ? "Не удалось загрузить ни одной страницы, поэтому вывод о доступности для поиска не сделан."
        : "No page could be loaded, so no conclusion about search accessibility was made."), { bold: true, size: 11 });
    } else {
      writer.paragraph(ru
        ? `${snapshot.indexability.technicallyIndexable} из ${snapshot.indexability.checked || input.pagesChecked} проверенных страниц открылись без ошибки и не имеют найденного запрета noindex.`
        : `${snapshot.indexability.technicallyIndexable} of ${snapshot.indexability.checked || input.pagesChecked} checked pages opened without an error and have no detected noindex rule.`, { bold: true, size: 11 });
    }
    snapshot.indexability.stages.forEach((stage, index) => {
      writer.paragraph(`${index + 1}. ${stage.label}: ${stage.count}/${snapshot.indexability.checked || input.pagesChecked}`, { bold: true, size: 9.5 });
      if (stage.explanation) writer.paragraph(stage.explanation, { size: 8.5, color: rgb(.33, .36, .42) });
    });
    if (snapshot.indexability.status !== "not_checked") {
      writer.paragraph(snapshot.indexability.limitation || (ru
        ? "Этот результат не подтверждает, что страница уже показывается в поиске. Это можно увидеть только в Яндекс Вебмастере или Google Search Console."
        : "This result does not confirm that a page already appears in search. That can only be checked in Yandex Webmaster or Google Search Console."), { size: 8.5, color: rgb(.33, .36, .42) });
    }
  }

  if (snapshot.issues.length) {
    writer.heading(`${ru ? "Очередь исправлений" : "Fix queue"} · ${snapshot.issues.length}`);
    snapshot.issues.forEach((issue, index) => {
      writer.paragraph(`${index + 1}. ${severityPdfLabel(issue.severity, ru)} · ${issue.title || issue.code || (ru ? "Замечание" : "Finding")}`, { bold: true, size: 11, color: severityColor(issue.severity) });
      writer.paragraph(`${ru ? "Что найдено" : "Finding"}: ${issue.observation}`, { size: 9 });
      writer.paragraph(`${ru ? "Почему важно" : "Why it matters"}: ${issue.whyItMatters}`, { size: 9 });
      writer.paragraph(`${ru ? "Что сделать" : "Action"}: ${issue.recommendation}`, { size: 9 });
      writer.paragraph(`${ru ? "Как проверить исправление" : "How to verify the fix"}: ${issue.acceptance}`, { size: 9 });
      if (issue.evidence.length) {
        writer.paragraph(ru ? "Факты из проверки" : "Observed evidence", { bold: true, size: 8.5 });
        issue.evidence.slice(0, 5).forEach((item) => writer.paragraph(`• ${item}`, { size: 8 }));
      }
      if (issue.affectedUrls.length) {
        writer.paragraph(`${ru ? "Затронутые URL" : "Affected URLs"} · ${issue.affectedCount || issue.affectedUrls.length}`, { bold: true, size: 8.5 });
        issue.affectedUrls.slice(0, 12).forEach((url) => writer.paragraph(url, { size: 7.5, color: rgb(.27, .32, .42) }));
        if (issue.affectedUrls.length > 12) writer.paragraph(ru ? `Ещё ${issue.affectedUrls.length - 12} URL показаны в веб-отчёте.` : `${issue.affectedUrls.length - 12} more URLs are shown in the web report.`, { size: 8 });
      }
      writer.rule();
    });
  } else if (snapshot.isLegacy) {
    const categories = publicCategories(input.publicResult);
    if (categories.length) {
      writer.heading(ru ? "Сохранённая сводка" : "Saved summary");
      writer.paragraph(ru ? "Ниже показаны только данные, сохранённые прежней версией. Мы не добавляем к ним предположения." : "Only data saved by the previous version is shown below. No assumptions are added.", { size: 8.5, color: rgb(.33, .36, .42) });
      for (const category of categories) {
        writer.paragraph(`${category.name}${category.risk ? ` · ${category.risk}` : ""}`, { bold: true, size: 11 });
        if (category.explanation) writer.paragraph(category.explanation, { size: 9, color: rgb(.26, .29, .35) });
        writer.rule();
      }
    }
  } else {
    writer.heading(ru ? "Замечания по проверенной выборке" : "Findings in the checked sample");
    writer.paragraph(ru
      ? `В сохранённых данных нет замечаний по ${input.pagesChecked} подробно проверенным страницам. Этот вывод не относится к адресам, которые не вошли в бесплатную проверку.`
      : `The saved result has no findings for the ${input.pagesChecked} pages checked in detail. This conclusion does not cover addresses outside the free check.`, { size: 9 });
  }

  if (snapshot.pages.length) {
    writer.heading(`${ru ? "Проверенные страницы" : "Checked pages"} · ${snapshot.pages.length}`);
    snapshot.pages.forEach((page, index) => {
      writer.paragraph(`${index + 1}. ${page.url || "—"}`, { bold: true, size: 9.5 });
      if (page.finalUrl && page.finalUrl !== page.url) writer.paragraph(`${ru ? "После перенаправления" : "After redirects"}: ${page.finalUrl}`, { size: 8 });
      writer.paragraph(`${ru ? "Код ответа страницы" : "Page response code"}: ${page.status || "—"}`, { size: 8.5, color: rgb(.33, .36, .42) });
      writer.paragraph(`${ru ? "Заголовок для поисковой выдачи (title)" : "Search-result title"}: ${page.title || "—"}`, { size: 8.5 });
      writer.paragraph(`${ru ? "Главный заголовок страницы (H1)" : "Main page heading (H1)"}: ${page.h1 || "—"}`, { size: 8.5 });
      writer.paragraph(`${ru ? "Основной адрес (canonical)" : "Preferred address (canonical)"}: ${page.canonical || "—"}`, { size: 8 });
      writer.paragraph(`${ru ? "В файле страниц (sitemap.xml)" : "In the page-list file (sitemap.xml)"}: ${boolPdf(page.inSitemap, ru)}`, { size: 8 });
      if (page.findings.length) {
        writer.paragraph(ru ? "Замечания по странице" : "Page findings", { bold: true, size: 8.5, color: rgb(.67, .4, .08) });
        page.findings.forEach((finding) => writer.paragraph(`• ${finding}`, { size: 8 }));
      } else {
        writer.paragraph(ru ? "По сохранённым признакам замечаний нет." : "No findings in the saved signals.", { size: 8, color: rgb(.12, .48, .32) });
      }
      writer.space(4);
    });
  }

  writer.heading(ru ? "Пояснения к словам в отчёте" : "Terms used in this report");
  auditTermDefinitions(input.locale).forEach((item) => writer.paragraph(`${item.term} — ${item.meaning}.`, { size: 8.5 }));

  writer.heading(ru ? "Ограничения метода" : "Method limitations");
  writer.paragraph(ru
    ? "Отчёт относится только к проверенным страницам. Это не оценка поисковой системы и не прогноз позиций, посещаемости или продаж."
    : "The report applies only to checked pages. It is not a search-engine score and does not predict rankings, traffic, or sales.");
  snapshot.limitations.forEach((item) => writer.paragraph(`• ${item}`, { size: 8.5 }));

  writer.heading(ru ? "Следующий шаг" : "Next step");
  writer.paragraph(ru
    ? "Сначала исправьте замечания высокого приоритета и проверьте те же страницы повторно. Для полного аудита заранее согласуются число страниц, состав проверки и результат, который можно проверить после исправлений."
    : "Fix the priority causes and repeat the same checks. In the extended audit, KILENI checks the agreed scope and prepares an actionable fix queue.");
  writer.finish();
  return pdf.save({ useObjectStreams: false });
}

function writeContractAuditPdf(
  writer: PublicPdfWriter,
  snapshot: PublicAuditPdfModel,
  ru: boolean,
) {
  const client = snapshot.clientPresentation;
  const attentionIssues = client.issues.filter((issue) => issue.kind !== "optional");
  const optionalIssues = client.issues.filter((issue) => issue.kind === "optional");

  writer.heading(ru ? "Итог" : "Summary");
  writer.paragraph(ru
    ? `${client.summary.scopeLabel}: ${client.summary.scopeValue} · подходят для выборки: ${client.summary.eligible} · исключено до выборки: ${client.summary.excluded}.`
    : `${client.summary.scopeLabel}: ${client.summary.scopeValue} · eligible for sampling: ${client.summary.eligible} · excluded before sampling: ${client.summary.excluded}.`, { bold: true, size: 9.4, lineHeight: 11.5 });
  writer.paragraph(ru
    ? `Выбрано: ${client.summary.selected} · ${client.summary.checkedLabel}: ${client.summary.checked} · не завершено: ${client.summary.notCompleted} · не вошло в выборку: ${client.summary.outsideSample}.`
    : `Selected: ${client.summary.selected} · ${client.summary.checkedLabel}: ${client.summary.checked} · not completed: ${client.summary.notCompleted} · outside the sample: ${client.summary.outsideSample}.`, { size: 8.4, lineHeight: 10.2 });
  writer.paragraph(ru
    ? client.summary.critical === 0
      ? `На ${client.summary.checked} подробно проверенных страницах критических проблем не найдено. ${client.summary.findingsLabel}.`
      : `На ${client.summary.checked} подробно проверенных страницах найдено критических проблем: ${client.summary.critical}. ${client.summary.findingsLabel}.`
    : `Critical problems on the ${client.summary.checked} pages checked in detail: ${client.summary.critical}. ${client.summary.findingsLabel}.`, { size: 8.4, lineHeight: 10.2 });

  writer.compactHeading(ru ? "Что стоит проверить" : "What needs a closer look");
  if (!attentionIssues.length) writer.paragraph(ru ? "В проверенной выборке пунктов, требующих действий, не найдено." : "No action items were found in the checked sample.", { bold: true });
  attentionIssues.forEach((issue, index) => writeClientIssue(issue, index));

  if (optionalIssues.length) {
    writer.keepTogether(150);
    writer.paragraph(ru ? "Можно улучшить" : "Possible improvement", { bold: true, size: 12, lineHeight: 14 });
    writer.paragraph(ru ? "Это не поломка и не срочная проблема." : "This is not a fault or an urgent issue.", { size: 8, lineHeight: 9.6, color: rgb(.33, .36, .42) });
    optionalIssues.forEach((issue, index) => writeClientIssue(issue, index));
  }

  function writeClientIssue(issue: AuditClientPresentation["issues"][number], index: number) {
    writer.keepTogether(126);
    writer.paragraph(`${index + 1}. ${clientIssuePdfLabel(issue.kind, ru)} · ${issue.title}`, { bold: true, size: 9.2, lineHeight: 11.2, color: clientIssuePdfColor(issue.kind) });
    writer.paragraph(`${ru ? "Страница" : "Page"}: ${issue.url}`, { size: 7.6, lineHeight: 9.1, color: rgb(.33, .36, .42) });
    writer.paragraph(`${ru ? "Что нашли" : "What was found"}: ${issue.whatFound}`, { size: 8, lineHeight: 9.6 });
    writer.paragraph(`${ru ? "Почему это важно" : "Why it matters"}: ${issue.whyImportant}`, { size: 8, lineHeight: 9.6 });
    writer.paragraph(`${ru ? "Как проверили" : "How it was checked"}: ${issue.howChecked}`, { size: 8, lineHeight: 9.6 });
    writer.paragraph(`${ru ? "Насколько надёжен вывод" : "How reliable it is"}: ${issue.reliability}`, { size: 8, lineHeight: 9.6 });
    writer.paragraph(`${ru ? "Что делать дальше" : "What to do next"}: ${issue.nextStep}`, { size: 8, lineHeight: 9.6 });
    if (issue.details?.length) writer.paragraph(issue.details.map((detail) => `${detail.label}: ${detail.value}`).join(" · "), { size: 7.5, lineHeight: 9, color: rgb(.33, .36, .42) });
    writer.rule();
  }

  writer.compactHeading(ru ? "Что уже в порядке" : "What already works");
  client.strengths.forEach((strength) => writer.paragraph(`• ${strength}`, { size: 8.2, lineHeight: 9.9 }));

  writer.pageBreak();

  writer.heading(ru ? "Проверенные страницы и ограничения" : "Checked pages and limits");
  client.pages.forEach((page, index) => {
    const pageStatus = clientPagePdfStatus(page, ru);
    const issueTitles = page.issues.map((issue) => issue.title).join("; ");
    writer.paragraph(
      `${String(index + 1).padStart(2, "0")} · ${page.typeLabel} · ${page.url} · ${page.selectionReason} · ${pageStatus.label}${issueTitles ? `: ${issueTitles}` : ""}`,
      { bold: pageStatus.kind !== "none", size: 7.6, lineHeight: 9, color: pageStatus.kind === "none" ? rgb(.16, .2, .27) : clientIssuePdfColor(pageStatus.kind) },
    );
  });
  const explicitIndexingBlocks = client.pages.filter((page) => page.indexability.includes(ru ? "найден явный запрет" : "explicit indexing block was found")).length;
  writer.paragraph(explicitIndexingBlocks === 0
    ? (ru ? `Явный запрет на индексирование не обнаружен на всех ${client.pages.length} проверенных страницах.` : `No explicit indexing block was found on any of the ${client.pages.length} checked pages.`)
    : (ru ? `Явный запрет на индексирование найден на ${explicitIndexingBlocks} из ${client.pages.length} проверенных страниц.` : `An explicit indexing block was found on ${explicitIndexingBlocks} of ${client.pages.length} checked pages.`),
  { size: 8.2, lineHeight: 10.3, color: explicitIndexingBlocks === 0 ? rgb(.08, .43, .28) : rgb(.72, .12, .16) });
  writer.paragraph(ru
    ? `Ещё ${client.summary.outsideSample} страниц не вошли в бесплатную выборку. По ним отчёт не делает выводов.`
    : `${client.summary.outsideSample} more pages were outside the free sample. The report makes no claims about them.`, { bold: true, size: 8, lineHeight: 9.6 });
  if (client.summary.excluded > 0) writer.paragraph(ru
    ? `До выборки исключено: ${client.summary.excluded}. ${client.exclusions.map((item) => `${item.label}: ${item.count}`).join(" · ")}.`
    : `Excluded before sampling: ${client.summary.excluded}. ${client.exclusions.map((item) => `${item.label}: ${item.count}`).join(" · ")}.`, { size: 7.8, lineHeight: 9.4 });
  if (client.additionalFiles > 0) writer.paragraph(ru
    ? `Дополнительные изображения, скрипты и документы: ${client.additionalFiles}. Они не входят в бесплатную проверку и не загружались${client.additionalDocuments > 0 ? `; среди них документов: ${client.additionalDocuments}` : ""}.`
    : `Additional images, scripts and documents: ${client.additionalFiles}. They are outside the free check and were not loaded${client.additionalDocuments > 0 ? `; documents among them: ${client.additionalDocuments}` : ""}.`, { size: 7.8, lineHeight: 9.4 });

  writer.compactHeading(ru ? "Технические файлы, проверенные отдельно" : "Technical files checked separately");
  client.publicTechnicalResources.forEach((resource) => writer.paragraph(`• ${resource.label} · ${resource.url} · ${ru ? "код ответа сервера" : "server response code"} ${resource.statusCode}${resource.details.length ? ` · ${resource.details.join(" ")}` : ""}`, { size: 7.8, lineHeight: 9.4 }));

  writer.compactHeading(ru ? "Чего бесплатная проверка не определяет" : "What the free check cannot determine");
  client.limitations.forEach((limitation) => writer.paragraph(`• ${limitation}`, { size: 7.8, lineHeight: 9.4 }));

  writer.compactHeading(ru ? "Следующий шаг" : "Next step");
  writer.paragraph(`${client.nextStep.primary}. ${client.nextStep.secondary}.`, { bold: true, size: 8.2, lineHeight: 10 });
  writer.paragraph(client.nextStep.note, { size: 7.8, lineHeight: 9.4 });
  writer.paragraph(client.disclaimer, { size: 7.6, lineHeight: 9.1, color: rgb(.33, .36, .42) });
}

export function clientPagePdfStatus(
  page: AuditClientPresentation["pages"][number],
  ru: boolean,
): { readonly label: string; readonly kind: "critical" | "review" | "optional" | "none" } {
  const attention = page.issues.find((issue) => issue.kind !== "optional");
  if (attention) return {
    label: ru ? "требует внимания" : "needs attention",
    kind: attention.kind,
  };
  if (page.issues.some((issue) => issue.kind === "optional")) return {
    label: ru ? "можно улучшить" : "can be improved",
    kind: "optional",
  };
  return { label: ru ? "замечаний нет" : "no findings", kind: "none" };
}

function clientIssuePdfLabel(kind: "critical" | "review" | "optional", ru: boolean): string {
  if (!ru) return kind === "critical" ? "Critical" : kind === "review" ? "Review" : "Optional improvement";
  return kind === "critical" ? "Критично" : kind === "review" ? "Стоит проверить" : "Необязательное улучшение";
}

function clientIssuePdfColor(kind: "critical" | "review" | "optional") {
  if (kind === "critical") return rgb(.72, .12, .16);
  if (kind === "review") return rgb(.66, .38, .04);
  return rgb(.08, .43, .28);
}

function technicalResourcePdfLabel(value: string, ru: boolean): string {
  const labels: Readonly<Record<string, readonly [string, string]>> = {
    robots: ["robots.txt", "robots.txt"], sitemap: ["sitemap.xml", "sitemap.xml"], xml_feed: ["XML-фид", "XML feed"], document: ["документ", "document"], image: ["изображение", "image"], script: ["скрипт", "script"], stylesheet: ["таблица стилей", "stylesheet"], api: ["ответ API", "API response"], unknown: ["неизвестный ресурс", "unknown resource"],
  };
  return labels[value]?.[ru ? 0 : 1] ?? value;
}

class PublicPdfWriter {
  private page!: PDFPage;
  private y = 0;
  private readonly pages: PDFPage[] = [];

  constructor(private readonly pdf: PDFDocument, private readonly font: PDFFont, private readonly bold: PDFFont, private readonly ru: boolean) {}

  cover(input: PublicAuditPdfInput) {
    this.newPage();
    this.y = PAGE[1] - 116;
    this.paragraph(this.ru ? "Проверка сайта завершена" : "Website check complete", { size: 22, bold: true, lineHeight: 26 });
    this.paragraph(input.normalizedDomain, { size: 13.5, color: rgb(.05, .16, .34), lineHeight: 17 });
  }

  keepTogether(height: number) { this.ensure(height); }

  pageBreak() { this.newPage(); }

  heading(value: string) {
    this.ensure(54);
    this.space(18);
    this.paragraph(value, { size: 17, bold: true, lineHeight: 21, color: rgb(.05, .08, .16) });
    this.rule(rgb(.72, .75, .8));
    this.space(7);
  }

  compactHeading(value: string) {
    this.ensure(38);
    this.space(8);
    this.paragraph(value, { size: 12.5, bold: true, lineHeight: 15.5, color: rgb(.05, .08, .16) });
    this.rule(rgb(.78, .8, .84));
    this.space(3);
  }

  keyValue(label: string, value: string) {
    this.ensure(32);
    this.page.drawText(clean(label), { x: MARGIN, y: this.y, size: 8.6, font: this.bold, color: rgb(.35, .39, .47) });
    const lines = wrap(clean(value), this.font, 10.2, CONTENT_WIDTH - 130);
    for (const line of lines) {
      this.page.drawText(line || " ", { x: MARGIN + 130, y: this.y, size: 10.2, font: this.font, color: rgb(.07, .08, .1) });
      this.y -= 14.5;
    }
    this.y -= 4;
  }

  paragraph(value: string, options: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; lineHeight?: number } = {}) {
    const size = options.size ?? 9.8;
    const lineHeight = options.lineHeight ?? size * 1.42;
    const selectedFont = options.bold ? this.bold : this.font;
    const lines = wrap(clean(value), selectedFont, size, CONTENT_WIDTH);
    this.ensure(lines.length * lineHeight + 4);
    for (const line of lines) {
      this.page.drawText(line || " ", { x: MARGIN, y: this.y, size, font: selectedFont, color: options.color ?? rgb(.1, .11, .13) });
      this.y -= lineHeight;
    }
    this.y -= 4;
  }

  rule(color = rgb(.84, .86, .9)) {
    this.ensure(12);
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: PAGE[0] - MARGIN, y: this.y }, thickness: .7, color });
    this.y -= 11;
  }

  space(points: number) { this.y -= points; }

  finish() {
    for (const [index, page] of this.pages.entries()) {
      page.drawText(`KILENI · ${index + 1}/${this.pages.length}`, { x: PAGE[0] - MARGIN - 60, y: 24, size: 7, font: this.font, color: rgb(.45, .48, .53) });
    }
  }

  private ensure(height: number) {
    if (this.y - height < 45) this.newPage();
  }

  private newPage() {
    this.page = this.pdf.addPage(PAGE);
    this.pages.push(this.page);
    this.page.drawRectangle({ x: 0, y: PAGE[1] - 82, width: PAGE[0], height: 82, color: rgb(.043, .051, .063) });
    this.page.drawText("KILENI", { x: MARGIN, y: PAGE[1] - 49, size: 14, font: this.bold, color: rgb(1, 1, 1) });
    this.page.drawText(this.ru ? "SEO-ПРОВЕРКА" : "SEO CHECK", { x: MARGIN + 73, y: PAGE[1] - 47, size: 6.5, font: this.font, color: rgb(.65, .7, .78) });
    this.y = PAGE[1] - 108;
  }
}

class PdfWriter {
  private page!: PDFPage;
  private y = 0;
  private pageNumber = 0;
  private readonly pages: PDFPage[] = [];

  constructor(private readonly pdf: PDFDocument, private readonly font: PDFFont, private readonly bold: PDFFont) {}

  cover(domain: string) {
    this.newPage();
    this.page.drawText("KILENI", { x: MARGIN, y: PAGE[1] - 54, size: 16, font: this.bold, color: rgb(1, 1, 1) });
    this.page.drawText("SEO", { x: 116, y: PAGE[1] - 52, size: 7, font: this.bold, color: rgb(.16, .4, .94) });
    this.y = PAGE[1] - 135;
    this.paragraph("Полный административный SEO-отчёт", { size: 26, bold: true });
    this.paragraph(domain, { size: 17, color: rgb(.16, .4, .94) });
    this.paragraph("Сформировано из сохранённого полного результата KILENI. Документ предназначен только для администратора.", { size: 9, color: rgb(.4, .44, .5) });
    this.space(22);
  }

  heading(value: string, size: number) {
    this.ensure(48);
    this.space(16);
    this.paragraph(value, { size, bold: true, color: rgb(.07, .08, .1), lineHeight: size * 1.16 });
    this.rule(rgb(.16, .4, .94));
    this.space(7);
  }

  keyValue(label: string, value: string) {
    this.ensure(28);
    this.page.drawText(label, { x: MARGIN, y: this.y, size: 8, font: this.bold, color: rgb(.4, .44, .5) });
    this.drawWrapped(value, MARGIN + 118, CONTENT_WIDTH - 118, 9.5, this.font, rgb(.07, .08, .1), 13);
    this.y -= 7;
  }

  paragraph(value: string, options: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; lineHeight?: number } = {}) {
    const size = options.size ?? 9.5;
    const lineHeight = options.lineHeight ?? size * 1.45;
    const selectedFont = options.bold ? this.bold : this.font;
    const lines = wrap(clean(value), selectedFont, size, CONTENT_WIDTH);
    for (const line of lines) {
      this.ensure(lineHeight + 2);
      this.page.drawText(line || " ", { x: MARGIN, y: this.y, size, font: selectedFont, color: options.color ?? rgb(.1, .11, .13) });
      this.y -= lineHeight;
    }
    this.y -= 3;
  }

  rule(color = rgb(.86, .88, .91)) {
    this.ensure(10);
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: PAGE[0] - MARGIN, y: this.y }, thickness: .7, color });
    this.y -= 10;
  }

  space(points: number) { this.y -= points; }

  finish() {
    for (const [index, page] of this.pages.entries()) {
      page.drawText(`KILENI · ${index + 1}/${this.pages.length}`, { x: PAGE[0] - MARGIN - 65, y: 24, size: 7, font: this.font, color: rgb(.45, .48, .53) });
    }
  }

  private ensure(height: number) {
    if (this.y - height < 45) this.newPage();
  }

  private newPage() {
    this.page = this.pdf.addPage(PAGE);
    this.pages.push(this.page);
    this.pageNumber += 1;
    this.page.drawRectangle({ x: 0, y: PAGE[1] - 82, width: PAGE[0], height: 82, color: rgb(.043, .051, .063) });
    if (this.pageNumber > 1) {
      this.page.drawText("KILENI", { x: MARGIN, y: PAGE[1] - 49, size: 12, font: this.bold, color: rgb(1, 1, 1) });
      this.page.drawText("ADMIN SEO REPORT", { x: MARGIN + 74, y: PAGE[1] - 47, size: 6.5, font: this.font, color: rgb(.55, .61, .7) });
    }
    this.y = PAGE[1] - 108;
  }

  private drawWrapped(value: string, x: number, width: number, size: number, font: PDFFont, color: ReturnType<typeof rgb>, lineHeight: number) {
    const lines = wrap(clean(value), font, size, width);
    for (const line of lines) {
      this.ensure(lineHeight + 2);
      this.page.drawText(line || " ", { x, y: this.y, size, font, color });
      this.y -= lineHeight;
    }
  }
}

async function readReportFont(bold: boolean): Promise<Uint8Array> {
  // Keep a Unicode font in the deployment bundle. Vercel functions do not
  // provide the system fonts available in local Docker/macOS environments.
  const bundledFont = join(process.cwd(), "public", "fonts", "Bounded-Variable.ttf");
  const candidates = [
    bold ? process.env.ADMIN_PDF_FONT_BOLD_PATH : process.env.ADMIN_PDF_FONT_PATH,
    bundledFont,
    bold ? "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" : "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    bold ? "/System/Library/Fonts/Supplemental/Arial Bold.ttf" : "/System/Library/Fonts/Supplemental/Arial.ttf",
  ].filter((value): value is string => Boolean(value));
  for (const candidate of candidates) {
    try { return await readFile(candidate); } catch { /* try next installed font */ }
  }
  throw new Error(bold ? "ADMIN_PDF_FONT_BOLD_PATH is not configured" : "ADMIN_PDF_FONT_PATH is not configured");
}

function wrap(value: string, font: PDFFont, size: number, width: number): string[] {
  const output: string[] = [];
  for (const paragraph of value.split(/\r?\n/u)) {
    const words = paragraph.split(/\s+/u).filter(Boolean);
    if (!words.length) { output.push(""); continue; }
    let line = "";
    for (const rawWord of words) {
      const chunks = splitWideToken(rawWord, font, size, width);
      for (const word of chunks) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) { line = candidate; continue; }
      if (line) output.push(line);
      line = word;
      }
    }
    if (line) output.push(line);
  }
  return output;
}

function splitWideToken(value: string, font: PDFFont, size: number, width: number): string[] {
  if (font.widthOfTextAtSize(value, size) <= width) return [value];
  const chunks: string[] = [];
  let chunk = "";
  for (const character of value) {
    const candidate = chunk + character;
    if (chunk && font.widthOfTextAtSize(candidate, size) > width) {
      chunks.push(chunk);
      chunk = character;
    } else {
      chunk = candidate;
    }
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

function publicCategories(value: unknown): Array<{ name: string; risk: string; explanation: string }> {
  const categories = record(value).categories;
  if (!Array.isArray(categories)) return [];
  return categories.map(record).map((category) => ({
    name: text(category.name),
    risk: text(category.risk),
    explanation: text(category.explanation),
  })).filter((category) => Boolean(category.name));
}

function buildPrintablePages(value: unknown, locale: AuditReportLocale): PublicAuditPdfModel["pages"] {
  return recordArray(value).map((page) => {
    const http = record(page.http);
    const titleSignal = record(page.title);
    const descriptionSignal = record(page.description);
    const h1Signal = record(page.h1);
    const canonicalSignal = record(page.canonical);
    const sitemapSignal = record(page.sitemap);
    const status = number(http.status) || number(page.status) || number(page.statusCode);
    const title = text(titleSignal.value) || nullableText(page.title);
    const description = text(descriptionSignal.value) || nullableText(page.description);
    const h1 = stringArray(h1Signal.values).join(" · ") || nullableText(page.h1);
    const canonical = text(canonicalSignal.url) || nullableText(page.canonical);
    const incomingFromCheckedPages = optionalNumber(record(page.internalLinks).incomingFromCheckedPages);
    const outgoingLinks = optionalNumber(record(page.internalLinks).outgoing) ?? 0;
    const inSitemap = typeof sitemapSignal.included === "boolean"
      ? sitemapSignal.included
      : typeof page.inSitemap === "boolean" ? page.inSitemap : null;
    return {
      url: text(page.url),
      finalUrl: text(page.finalUrl),
      status,
      title,
      description,
      h1,
      noindex: page.noindex === true,
      canonical,
      inSitemap,
      outgoingLinks,
      incomingFromCheckedPages: incomingFromCheckedPages ?? 0,
      findings: auditPageFindings(locale, {
        http: { status, redirectCount: number(http.redirectCount) },
        title: {
          value: title || null,
          present: typeof titleSignal.present === "boolean" ? titleSignal.present : Boolean(title),
          length: number(titleSignal.length) || title.length,
          optimal: typeof titleSignal.optimal === "boolean" ? titleSignal.optimal : undefined,
        },
        description: {
          value: description || null,
          present: typeof descriptionSignal.present === "boolean" ? descriptionSignal.present : Boolean(description),
          length: optionalNumber(descriptionSignal.length) ?? description.length,
          optimal: typeof descriptionSignal.optimal === "boolean" ? descriptionSignal.optimal : undefined,
        },
        h1: {
          count: number(h1Signal.count) || (h1 ? 1 : 0),
          values: stringArray(h1Signal.values),
        },
        noindex: page.noindex === true,
        canonical: {
          url: canonical || null,
          valid: typeof canonicalSignal.valid === "boolean" ? canonicalSignal.valid : page.canonicalValid !== false,
        },
        sitemap: {
          status: text(sitemapSignal.status),
          included: inSitemap,
          reason: text(sitemapSignal.reason),
        },
        inSitemap,
        ...(incomingFromCheckedPages === undefined ? {} : {
          internalLinks: { incomingFromCheckedPages },
        }),
      }),
    };
  }).filter((page) => Boolean(page.url));
}

/** Normalizes the current public audit DTO (and legacy snapshots) for the printable report. */
export function buildPublicAuditPdfModel(value: unknown, locale: AuditReportLocale): PublicAuditPdfModel {
  const root = record(value);
  if (isAuditContractSnapshot(root)) return buildContractPdfModel(root, locale);
  const summary = record(root.summary);
  const indexability = record(root.indexability);
  const methodology = record(root.methodology);
  const rawIssues = recordArray(root.issueGroups).length ? recordArray(root.issueGroups) : recordArray(root.issues);
  const pages = buildPrintablePages(root.checkedPages, locale);
  const issues = rawIssues.map((issue) => {
    const evidenceRecords = recordArray(issue.evidence);
    const prepared = auditIssueCopy(locale, {
      code: text(issue.code),
      title: text(issue.title),
      description: text(issue.description),
      why: text(issue.why),
      whyItMatters: text(issue.whyItMatters),
      fix: text(issue.fix),
      recommendation: text(issue.recommendation),
      acceptance: text(issue.acceptance),
      evidence: evidenceRecords,
    });
    return {
      code: text(issue.code),
      severity: text(issue.severity),
      title: prepared.title,
      observation: prepared.observation,
      whyItMatters: prepared.why,
      recommendation: prepared.action,
      acceptance: prepared.acceptance,
      affectedCount: number(issue.affectedCount),
      affectedUrls: stringArray(issue.affectedUrls),
      evidence: evidenceRecords.map((item) => {
        const observation = text(item.observation) || text(item.value) || text(item.label);
        const url = text(item.url);
        return url && observation ? `${observation} — ${url}` : observation || url;
      }).filter(Boolean),
    };
  });
  const checked = number(indexability.checkedPages) || number(indexability.checked);
  const technicallyIndexable = number(indexability.indexablePages) || number(indexability.technicallyIndexable);
  const noindexPages = number(indexability.noindexPages) || number(indexability.blocked);
  const httpErrorPages = number(indexability.httpErrorPages);
  const derivedStrengths: string[] = [];
  const pagesWithoutHttpErrors = pages.filter((page) => page.status >= 200 && page.status < 300).length;
  if (pagesWithoutHttpErrors > 0) derivedStrengths.push(locale === "ru"
    ? `${pagesWithoutHttpErrors} из ${pages.length} проверенных страниц открылись без ошибки сервера.`
    : `${pagesWithoutHttpErrors} of ${pages.length} checked pages opened without a server error.`);
  if (technicallyIndexable > 0) derivedStrengths.push(locale === "ru"
    ? `${technicallyIndexable} страниц не имеют найденного технического запрета для поискового робота.`
    : `${technicallyIndexable} pages have no detected technical crawler block.`);
  const plainFacts = checked > 0 ? [locale === "ru"
    ? `Без найденного технического запрета для поиска: ${technicallyIndexable} из ${checked}. Закрыто правилом noindex: ${noindexPages}; страниц с ошибкой сервера: ${httpErrorPages}.`
    : `No detected technical search block: ${technicallyIndexable} of ${checked}. Blocked by noindex: ${noindexPages}; pages with a server error: ${httpErrorPages}.`] : [];
  return {
    isLegacy: true,
    contractVersion: null,
    engineVersion: "",
    coverageStatus: "",
    inventorySummary: { objectsFound: 0, htmlFound: 0, eligibleHtml: 0, selected: 0, checked: 0, representedPageTypes: 0 },
    statusCounts: { pass: 0, warning: 0, fail: 0, not_applicable: 0, not_run: 0, insufficient_data: 0 },
    checks: [],
    selectedPages: [],
    unchecked: { total: 0, returned: 0, truncated: false, urls: [] },
    summary: {
      headline: text(summary.headline),
      facts: plainFacts,
      risks: stringArray(summary.risks).length
        ? stringArray(summary.risks)
        : issues.filter((issue) => issue.severity === "critical" || issue.severity === "high" || issue.severity === "medium").slice(0, 5).map((issue) => issue.title),
      strengths: stringArray(summary.strengths).length ? stringArray(summary.strengths) : derivedStrengths,
    },
    indexability: {
      status: text(indexability.status),
      checked,
      technicallyIndexable,
      noindexPages,
      httpErrorPages,
      limitation: text(indexability.reason) || text(indexability.limitation),
      stages: recordArray(indexability.stages).map((stage) => ({
        label: text(stage.label),
        count: number(stage.count),
        explanation: text(stage.explanation),
      })).filter((stage) => Boolean(stage.label)),
    },
    issues,
    pages,
    technicalResources: [],
    limitations: stringArray(methodology.limitations),
    clientPresentation: buildAuditClientPresentation(root, locale),
  };
}

function isAuditContractSnapshot(value: Record<string, unknown>): boolean {
  const resultVersion = number(value.resultVersion);
  const contractVersion = number(value.contractVersion);
  return (resultVersion === 4 && contractVersion === 3) || ((resultVersion === 0 || resultVersion === 3) && contractVersion === 2);
}

function buildContractPdfModel(root: Record<string, unknown>, locale: AuditReportLocale): PublicAuditPdfModel {
  const contractVersion = number(root.contractVersion);
  const isV4 = contractVersion === 3;
  const summary = record(root.resultSummary);
  const inventory = record(root.inventorySummary);
  const checks: PrintableAuditCheck[] = recordArray(root.checks).map((check) => {
    const checkId = text(check.checkId);
    const status = auditCheckStatus(text(check.status));
    const evidence = recordArray(isV4 ? check.evidence : check.urlEvidence).map((item) => ({
      url: text(item.url),
      observation: auditObservationCopy(locale, text(item.observation)),
    })).filter((item) => Boolean(item.url || item.observation));
    const copy = isV4 ? {
      title: text(check.title),
      expected: text(check.publicExplanation),
      explanation: text(check.reason),
      automationLimit: text(check.automationLimit),
    } : auditCheckCopy(locale, {
      checkId,
      status,
      value: check.value,
      title: text(check.title),
      expected: text(check.expected),
      explanation: text(check.explanation),
      automationLimit: text(check.automationLimit),
      urlEvidence: evidence,
    });
    return {
      checkId,
      checkVersion: number(isV4 ? check.version : check.checkVersion),
      category: text(check.category),
      title: copy.title,
      status,
      expected: copy.expected,
      explanation: copy.explanation,
      automationLimit: copy.automationLimit,
      severity: text(check.severity),
      evidence,
    };
  }).filter((check) => Boolean(check.checkId && check.title));
  const selectedPages = recordArray(root.selectedPages).map((page) => ({
    url: text(page.url),
    pageType: text(page.pageType),
    selectionReason: text(page.selectionReason),
    templateFamily: text(page.templateFamily),
    classificationConfidence: optionalNumber(page.classificationConfidence) ?? null,
    classificationReasons: stringArray(page.classificationReasons),
  })).filter((page) => Boolean(page.url));
  const pages = buildPrintablePages(root.checkedPages, locale);
  const statusCounts = {
    pass: number(summary.pass),
    warning: number(summary.warning),
    fail: number(summary.fail),
    not_applicable: number(summary.not_applicable),
    not_run: number(summary.not_run),
    insufficient_data: number(summary.insufficient_data),
  };
  const findings = checks.filter((check) => check.status === "fail" || check.status === "warning");
  const groupedFindings = recordArray(root.findings).map((finding) => ({
    code: text(finding.checkId),
    severity: text(finding.severity),
    title: text(finding.title),
    observation: text(finding.whatFound),
    whyItMatters: text(finding.whyImportant),
    recommendation: text(finding.nextStep),
    acceptance: locale === "ru" ? "После исправления повторите ту же проверку и сравните сохранённый факт." : "Repeat the same check after the fix and compare the saved evidence.",
    affectedCount: number(finding.affectedCount),
    affectedUrls: recordArray(finding.examples).flatMap((example) => text(example.url) ? [text(example.url)] : []),
    evidence: recordArray(finding.examples).map((example) => {
      const observation = text(example.observation);
      const url = text(example.url);
      return url && observation ? `${observation} — ${url}` : observation || url;
    }).filter(Boolean),
  })).filter((finding) => Boolean(finding.code && finding.title));
  const successful = checks.filter((check) => check.status === "pass");
  const storedLimitations = stringArray(root.limitations);
  const limitations = storedLimitations.length ? storedLimitations : uniqueStrings([
      ...checks.filter((check) => check.status === "not_run" || check.status === "insufficient_data").map((check) => check.automationLimit),
      locale === "ru"
        ? "Выводы относятся только к выбранным и успешно загруженным публичным страницам."
        : "Findings apply only to selected public pages that were loaded successfully.",
    ]);
  const technicalResources = recordArray(root.technicalResources).map((resource) => ({
    url: text(resource.finalUrl) || text(resource.url),
    resourceType: text(resource.resourceType),
    statusCode: optionalNumber(resource.statusCode) ?? null,
    contentType: text(resource.contentType),
    classificationReasons: stringArray(resource.classificationReasons),
  })).filter((resource) => Boolean(resource.url));

  return {
    isLegacy: false,
    contractVersion,
    engineVersion: text(root.engineVersion),
    coverageStatus: text(root.coverageStatus),
    inventorySummary: {
      objectsFound: number(inventory.objectsFound) || number(root.pagesDiscovered),
      htmlFound: number(inventory.htmlFound) || number(root.pagesDiscovered),
      eligibleHtml: number(inventory.eligibleHtml) || number(root.pagesSelected),
      selected: number(inventory.selected) || number(root.pagesSelected),
      checked: number(inventory.checked) || number(root.pagesChecked),
      representedPageTypes: number(inventory.representedPageTypes),
    },
    statusCounts,
    checks,
    selectedPages,
    unchecked: {
      total: number(root.pagesNotCheckedTotal),
      returned: number(root.pagesNotCheckedReturned),
      truncated: root.pagesNotCheckedTruncated === true,
      urls: stringArray(root.pagesNotCheckedUrls),
    },
    summary: {
      headline: text(summary.headline),
      facts: [locale === "ru"
        ? `Выполнено с результатом: ${number(summary.completedChecks)} из ${number(summary.totalChecks)} проверок.`
        : `Checks with a result: ${number(summary.completedChecks)} of ${number(summary.totalChecks)}.`],
      risks: (groupedFindings.length ? groupedFindings : findings).slice(0, 5).map((finding) => finding.title),
      strengths: successful.slice(0, 5).map((check) => check.title),
    },
    indexability: {
      status: "",
      checked: 0,
      technicallyIndexable: 0,
      noindexPages: 0,
      httpErrorPages: 0,
      limitation: "",
      stages: [],
    },
    issues: groupedFindings,
    pages,
    technicalResources,
    limitations,
    clientPresentation: buildAuditClientPresentation(root, locale),
  };
}

function auditCheckStatus(value: string): "pass" | "warning" | "fail" | "not_applicable" | "not_run" | "insufficient_data" {
  if (value === "pass" || value === "warning" || value === "fail" || value === "not_applicable" || value === "not_run") return value;
  return "insufficient_data";
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => typeof item === "string" ? [clean(item)] : []).filter(Boolean);
}

function nullableText(value: unknown): string {
  return typeof value === "string" ? clean(value) : "";
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map(clean).filter(Boolean))];
}

function severityPdfLabel(value: string, ru: boolean): string {
  const severity = value.toLowerCase();
  if (severity === "critical") return ru ? "Критично" : "Critical";
  if (severity === "high") return ru ? "Высокий приоритет" : "High priority";
  if (severity === "medium") return ru ? "Средний приоритет" : "Medium priority";
  if (severity === "low") return ru ? "Низкий приоритет" : "Low priority";
  return ru ? "Наблюдение" : "Observation";
}

function checkStatusPdfLabel(value: string, ru: boolean): string {
  if (value === "pass") return ru ? "Пройдено" : "Passed";
  if (value === "warning") return ru ? "Есть замечание" : "Warning";
  if (value === "fail") return ru ? "Ошибка" : "Failed";
  if (value === "not_applicable") return ru ? "Не относится к объекту" : "Not applicable to the object";
  if (value === "not_run") return ru ? "Замер не запускался" : "Not run";
  if (value === "insufficient_data") return ru ? "Результат не получен" : "No result";
  return ru ? "Статус не определён" : "Unknown status";
}

function boolPdf(value: boolean | null, ru: boolean): string {
  if (value === true) return ru ? "да" : "yes";
  if (value === false) return ru ? "нет" : "no";
  return ru ? "не проверено" : "not checked";
}

function record(value: unknown): Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function recordArray(value: unknown): Record<string, unknown>[] { return Array.isArray(value) ? value.map(record) : []; }
function text(value: unknown): string { return typeof value === "string" ? clean(value) : value === null || value === undefined ? "" : clean(String(value)); }
function number(value: unknown): number { return typeof value === "number" && Number.isFinite(value) ? value : 0; }
function clean(value: string): string { return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/gu, " ").slice(0, 20_000); }
function severityColor(value: string) { return value === "critical" || value === "high" ? rgb(.75, .18, .2) : value === "medium" ? rgb(.67, .4, .08) : rgb(.16, .4, .94); }
