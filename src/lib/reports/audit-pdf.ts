import { readFile } from "node:fs/promises";
import { join } from "node:path";

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";

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

/**
 * A deliberately small report for an owner who has the opaque audit link.
 * It only contains fields already returned by the public audit endpoint:
 * no applicant details, crawled URLs, internal checks or full issue data.
 */
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
  writer.heading(ru ? "Что проверили" : "What was checked");
  writer.keyValue(ru ? "Страниц проверено" : "Pages checked", `${input.pagesChecked} ${ru ? "из" : "of"} ${input.pagesDiscovered}`);
  writer.keyValue(ru ? "Статус" : "Status", input.partial ? (ru ? "Частичная проверка" : "Partial check") : (ru ? "Проверка завершена" : "Check completed"));
  if (input.completedAt) writer.keyValue(ru ? "Дата" : "Date", new Intl.DateTimeFormat(ru ? "ru-RU" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Moscow" }).format(input.completedAt));
  writer.paragraph(ru ? PUBLIC_AUDIT_DISCLAIMER.ru : PUBLIC_AUDIT_DISCLAIMER.en, { size: 8.5, color: rgb(.33, .36, .42) });

  const categories = publicCategories(input.publicResult);
  writer.heading(ru ? "Направления для внимания" : "Areas to review");
  if (!categories.length) {
    writer.paragraph(ru ? "Подробные результаты ещё подготавливаются." : "Detailed results are still being prepared.");
  } else {
    for (const category of categories) {
      writer.paragraph(`${category.name}${category.risk ? ` · ${category.risk}` : ""}`, { bold: true, size: 11 });
      if (category.explanation) writer.paragraph(category.explanation, { size: 9, color: rgb(.26, .29, .35) });
      writer.rule();
    }
  }
  writer.heading(ru ? "Следующий шаг" : "Next step");
  writer.paragraph(ru
    ? "Сохраните этот отчёт и опишите задачу в брифе. Мы уточним объём работ и порядок исправлений."
    : "Save this report and describe your task in the brief. We will clarify the scope and the order of fixes.");
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
    this.paragraph(this.ru ? "Предварительная SEO-проверка" : "Preliminary SEO check", { size: 26, bold: true, lineHeight: 31 });
    this.paragraph(input.normalizedDomain, { size: 17, color: rgb(.05, .16, .34) });
    this.space(22);
    this.keyValue(this.ru ? "Оценка" : "Assessment", input.score === null ? "—" : `${input.score}/100${input.grade ? ` · ${input.grade}` : ""}`);
    this.keyValue(this.ru ? "Охват" : "Coverage", `${input.pagesChecked} / ${input.pagesDiscovered}${input.partial ? ` · ${this.ru ? "частичная проверка" : "partial check"}` : ""}`);
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

function record(value: unknown): Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function recordArray(value: unknown): Record<string, unknown>[] { return Array.isArray(value) ? value.map(record) : []; }
function text(value: unknown): string { return typeof value === "string" ? clean(value) : value === null || value === undefined ? "" : clean(String(value)); }
function number(value: unknown): number { return typeof value === "number" && Number.isFinite(value) ? value : 0; }
function percent(value: unknown): string { return `${Math.round(number(value) * 100)}%`; }
function clean(value: string): string { return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/gu, " ").slice(0, 20_000); }
function severityColor(value: string) { return value === "critical" || value === "high" ? rgb(.75, .18, .2) : value === "medium" ? rgb(.67, .4, .08) : rgb(.16, .4, .94); }
