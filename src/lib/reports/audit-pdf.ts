import { readFile } from "node:fs/promises";
import { join } from "node:path";

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { auditIssueCopy, auditPageFindings, auditTermDefinitions, type AuditReportLocale } from "../audit/report-content";

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
  writer.heading("Сводка", 18);
  writer.keyValue("URL", input.audit.originalUrl);
  writer.keyValue("Статус", input.audit.status);
  writer.keyValue("Оценка", input.audit.overallScore === null ? "—" : `${input.audit.overallScore}/100 · ${input.audit.grade ?? "—"}`);
  writer.keyValue("Охват", `${input.audit.pagesChecked} из ${input.audit.pagesDiscovered} найденных страниц${input.audit.partial ? " · частичная проверка" : ""}`);
  writer.keyValue("Заявка", `${input.audit.name} · ${input.audit.contact}`);
  writer.keyValue("Создан", new Date(input.audit.createdAt).toISOString());
  writer.keyValue("Завершён", input.audit.completedAt ? new Date(input.audit.completedAt).toISOString() : "—");

  const categories = categoryEntries(input.fullResult);
  if (categories.length) {
    writer.heading("Категории и формула", 18);
    for (const [name, value] of categories) {
      writer.paragraph(`${name}: ${number(value.score)}/${number(value.maxScore)} · покрытие ${percent(value.coverage)}${value.partial ? " · partial" : ""}`, { bold: true });
      for (const check of recordArray(value.checks)) {
        writer.paragraph(`— ${text(check.label) || text(check.id)}: ${check.value === null ? "нет данных" : number(check.value).toFixed(2)} · вес ${number(check.weight)}`, { size: 8.5, color: rgb(.33, .36, .42) });
      }
      writer.space(6);
    }
  }

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

  const writer = new PublicPdfWriter(pdf, font, bold, ru);
  writer.cover(input);
  writer.heading(ru ? "Охват проверки" : "Audit coverage");
  writer.keyValue(ru ? "URL обнаружено" : "URLs discovered", `${input.pagesDiscovered}`);
  writer.keyValue(ru ? "Подробно проверено" : "Checked in detail", `${input.pagesChecked} ${ru ? "из максимум 10 страниц" : "of up to 10 pages"}`);
  writer.keyValue(ru ? "Не вошло в выборку" : "Outside the sample", `${Math.max(0, input.pagesDiscovered - input.pagesChecked)}`);
  writer.keyValue(ru ? "Статус" : "Status", input.partial ? (ru ? "Проверка завершилась раньше запланированного лимита" : "The check ended before its planned limit") : (ru ? "Запланированная выборка проверена" : "The planned sample was checked"));
  if (input.completedAt) writer.keyValue(ru ? "Дата" : "Date", new Intl.DateTimeFormat(ru ? "ru-RU" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Moscow" }).format(input.completedAt));
  writer.paragraph(ru
    ? "Остальные обнаруженные адреса не считаются проверенными: по ним отчёт не делает выводов, пока страница не была загружена и разобрана."
    : "Other discovered addresses are not treated as checked. No conclusions are made until a page has been loaded and analysed.", { size: 8.5, color: rgb(.33, .36, .42) });
  writer.paragraph(ru ? PUBLIC_AUDIT_DISCLAIMER.ru : PUBLIC_AUDIT_DISCLAIMER.en, { size: 8.5, color: rgb(.33, .36, .42) });

  const snapshot = buildPublicAuditPdfModel(input.publicResult, input.locale);
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
      writer.heading(ru ? "Сводка предыдущей версии" : "Legacy summary");
      writer.paragraph(ru ? "Этот сохранённый результат не содержит URL-доказательств. Запустите проверку снова, чтобы получить новый формат." : "This saved result does not contain URL evidence. Run the audit again to receive the new format.", { size: 8.5, color: rgb(.33, .36, .42) });
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
    ? "Балл относится только к проверенным страницам и помогает определить порядок исправлений. Это не оценка поисковой системы и не прогноз позиций, посещаемости или продаж."
    : "The score applies only to the checked sample and helps prioritize technical work. It is not a search-engine score and does not predict rankings, traffic, or sales.");
  snapshot.limitations.forEach((item) => writer.paragraph(`• ${item}`, { size: 8.5 }));

  writer.heading(ru ? "Следующий шаг" : "Next step");
  writer.paragraph(ru
    ? "Сначала исправьте замечания высокого приоритета и проверьте те же страницы повторно. Для полного аудита заранее согласуются число страниц, состав проверки и результат, который можно проверить после исправлений."
    : "Fix the priority causes and repeat the same checks. In the extended audit, KILENI checks the agreed scope and prepares an actionable fix queue.");
  writer.finish();
  return pdf.save({ useObjectStreams: false });
}

class PublicPdfWriter {
  private page!: PDFPage;
  private y = 0;
  private readonly pages: PDFPage[] = [];

  constructor(private readonly pdf: PDFDocument, private readonly font: PDFFont, private readonly bold: PDFFont, private readonly ru: boolean) {}

  cover(input: PublicAuditPdfInput) {
    this.newPage();
    this.y = PAGE[1] - 145;
    this.paragraph(this.ru ? "SEO-проверка с доказательствами" : "Evidence-based SEO check", { size: 26, bold: true, lineHeight: 31 });
    this.paragraph(input.normalizedDomain, { size: 17, color: rgb(.05, .16, .34) });
    this.space(22);
    this.keyValue(this.ru ? "Техническая оценка выборки" : "Technical sample score", input.score === null ? "—" : `${input.score}/100${input.grade ? ` · ${input.grade}` : ""}`);
    this.keyValue(this.ru ? "Охват" : "Coverage", `${this.ru ? "найдено" : "discovered"} ${input.pagesDiscovered} · ${this.ru ? "проверено" : "checked"} ${input.pagesChecked}`);
  }

  heading(value: string) {
    this.ensure(54);
    this.space(18);
    this.paragraph(value, { size: 17, bold: true, lineHeight: 21, color: rgb(.05, .08, .16) });
    this.rule(rgb(.72, .75, .8));
    this.space(7);
  }

  keyValue(label: string, value: string) {
    this.ensure(32);
    this.page.drawText(clean(label), { x: MARGIN, y: this.y, size: 8, font: this.bold, color: rgb(.35, .39, .47) });
    const lines = wrap(clean(value), this.font, 10, CONTENT_WIDTH - 130);
    for (const line of lines) {
      this.page.drawText(line || " ", { x: MARGIN + 130, y: this.y, size: 10, font: this.font, color: rgb(.07, .08, .1) });
      this.y -= 14;
    }
    this.y -= 4;
  }

  paragraph(value: string, options: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; lineHeight?: number } = {}) {
    const size = options.size ?? 9.5;
    const lineHeight = options.lineHeight ?? size * 1.42;
    const selectedFont = options.bold ? this.bold : this.font;
    for (const line of wrap(clean(value), selectedFont, size, CONTENT_WIDTH)) {
      this.ensure(lineHeight + 3);
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

function categoryEntries(value: unknown): Array<[string, Record<string, unknown>]> {
  const categories = record(record(value).score).categories;
  return Object.entries(record(categories)).map(([key, item]) => [key, record(item)]);
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

/** Normalizes the current public audit DTO (and legacy snapshots) for the printable report. */
export function buildPublicAuditPdfModel(value: unknown, locale: AuditReportLocale) {
  const root = record(value);
  const resultVersion = number(root.resultVersion);
  const summary = record(root.summary);
  const indexability = record(root.indexability);
  const methodology = record(root.methodology);
  const rawIssues = recordArray(root.issueGroups).length ? recordArray(root.issueGroups) : recordArray(root.issues);
  const pages = recordArray(root.checkedPages).map((page) => {
    const http = record(page.http);
    const titleSignal = record(page.title);
    const descriptionSignal = record(page.description);
    const h1Signal = record(page.h1);
    const canonicalSignal = record(page.canonical);
    const sitemapSignal = record(page.sitemap);
    const status = number(http.status) || number(page.status);
    const title = text(titleSignal.value) || nullableText(page.title);
    const description = text(descriptionSignal.value) || nullableText(page.description);
    const h1 = stringArray(h1Signal.values).join(" · ") || nullableText(page.h1);
    const canonical = text(canonicalSignal.url) || nullableText(page.canonical);
    const incomingFromCheckedPages = optionalNumber(record(page.internalLinks).incomingFromCheckedPages);
    const inSitemap = typeof sitemapSignal.included === "boolean"
      ? sitemapSignal.included
      : typeof page.inSitemap === "boolean" ? page.inSitemap : null;
    return {
      url: text(page.url),
      finalUrl: text(page.finalUrl),
      status,
      title,
      h1,
      canonical,
      inSitemap,
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
    isLegacy: resultVersion < 2,
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
    limitations: stringArray(methodology.limitations),
  };
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

function severityPdfLabel(value: string, ru: boolean): string {
  const severity = value.toLowerCase();
  if (severity === "critical") return ru ? "Критично" : "Critical";
  if (severity === "high") return ru ? "Высокий приоритет" : "High priority";
  if (severity === "medium") return ru ? "Средний приоритет" : "Medium priority";
  if (severity === "low") return ru ? "Низкий приоритет" : "Low priority";
  return ru ? "Наблюдение" : "Observation";
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
function percent(value: unknown): string { return `${Math.round(number(value) * 100)}%`; }
function clean(value: string): string { return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/gu, " ").slice(0, 20_000); }
function severityColor(value: string) { return value === "critical" || value === "high" ? rgb(.75, .18, .2) : value === "medium" ? rgb(.67, .4, .08) : rgb(.16, .4, .94); }
