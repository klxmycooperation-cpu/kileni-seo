import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFName, rgb } from "pdf-lib";
import {
  AlignmentType, BorderStyle, CheckBox, Document, Footer, Header, HeadingLevel,
  ImportedXmlComponent, PageNumber, Packer, Paragraph, TextRun, convertInchesToTwip,
} from "docx";
import { commonBriefQuestions, serviceQuestions } from "../src/content/brief.ts";

const outDir = resolve("public/downloads/generated");
await mkdir(outDir, { recursive: true });

const palette = { night: "0B0D10", ink: "111318", muted: "69707D", blue: "2867F0", violet: "7457F5", line: "DDE2E9", paper: "F6F7F9" };
const regularFontPath = process.env.BRIEF_FONT_REGULAR || "/System/Library/Fonts/Supplemental/Arial.ttf";
const boldFontPath = process.env.BRIEF_FONT_BOLD || "/System/Library/Fonts/Supplemental/Arial Bold.ttf";
if (!existsSync(regularFontPath) || !existsSync(boldFontPath)) throw new Error("Set BRIEF_FONT_REGULAR and BRIEF_FONT_BOLD to Cyrillic-capable TTF files");
const [regularFontBytes, boldFontBytes] = await Promise.all([readFile(regularFontPath), readFile(boldFontPath)]);

const common = {
  ru: [
    { key: "name", label: "Ваше имя", hint: "Как к вам обращаться", type: "text", options: [] },
    { key: "contact", label: "Телефон или e-mail", hint: "Укажите один удобный способ связи", type: "text", options: [] },
    ...questionRows(commonBriefQuestions, "ru"),
  ],
  en: [
    { key: "name", label: "Your name", hint: "How should we address you", type: "text", options: [] },
    { key: "contact", label: "Phone or email", hint: "One preferred contact is enough", type: "text", options: [] },
    ...questionRows(commonBriefQuestions, "en"),
  ],
};

const briefs = {
  seo: {
    ru: { title: "Бриф: SEO и продвижение", subtitle: "Регулярная техническая, структурная и контентная работа", questions: questionRows(serviceQuestions.seo, "ru") },
    en: { title: "Brief: SEO growth", subtitle: "Ongoing technical, structural and content delivery", questions: questionRows(serviceQuestions.seo, "en") },
  },
  audit: {
    ru: { title: "Бриф: SEO-аудит", subtitle: "Короткая диагностика перед подробной проверкой", questions: questionRows(serviceQuestions.audit, "ru") },
    en: { title: "Brief: SEO audit", subtitle: "A short diagnostic intake before the full review", questions: questionRows(serviceQuestions.audit, "en") },
  },
  marketplaces: {
    ru: { title: "Бриф: маркетплейсы", subtitle: "Карточки для Wildberries, Ozon и Яндекс Маркета", questions: questionRows(serviceQuestions.marketplaces, "ru") },
    en: { title: "Brief: marketplaces", subtitle: "Product cards for Wildberries, Ozon and Yandex Market", questions: questionRows(serviceQuestions.marketplaces, "en") },
  },
  development: {
    ru: { title: "Бриф: разработка сайта", subtitle: "От бизнес-задачи до сайта, который можно поддерживать и развивать", questions: questionRows(serviceQuestions.development, "ru") },
    en: { title: "Brief: web development", subtitle: "From a business need to a website that can be maintained and improved", questions: questionRows(serviceQuestions.development, "en") },
  },
  ads: {
    ru: { title: "Бриф: Яндекс Реклама", subtitle: "Настройка и ведение рекламных кампаний в Яндексе", questions: questionRows(serviceQuestions.ads, "ru") },
    en: { title: "Brief: Yandex Ads", subtitle: "Yandex campaign setup and ongoing management", questions: questionRows(serviceQuestions.ads, "en") },
  },
  custom: {
    ru: { title: "Бриф: нестандартная задача", subtitle: "Сначала определим состав и порядок работ, затем подготовим предложение", questions: questionRows(serviceQuestions.custom, "ru") },
    en: { title: "Brief: custom project", subtitle: "We will define the scope and work order before preparing a proposal", questions: questionRows(serviceQuestions.custom, "en") },
  },
};

function questionRows(questions, locale) {
  return questions.map((question) => ({
    key: question.key,
    label: question[locale],
    hint: "",
    type: question.type ?? "text",
    options: question.options?.map((option) => ({ value: option.value, label: option[locale] })) ?? [],
  }));
}

for (const locale of ["ru"]) {
  for (const [type, localized] of Object.entries(briefs)) {
    const content = localized[locale];
    const fileBase = `${locale}-${type}-brief`;
    await writeFile(resolve(outDir, `${fileBase}.docx`), await buildDocx(locale, type, content));
    await writeFile(resolve(outDir, `${fileBase}.pdf`), await buildPdf(locale, type, content));
  }
}

async function buildDocx(locale, type, content) {
  const ru = locale === "ru";
  const answerBorder = { style: BorderStyle.SINGLE, size: 6, color: palette.line };
  let controlIndex = 0;
  const commonControls = common[locale].flatMap((question) => questionBlock(question, answerBorder, locale, type, controlIndex++));
  const serviceControls = content.questions.flatMap((question) => questionBlock(question, answerBorder, locale, type, controlIndex++));
  const notesControl = answerControl({ key: "notes", label: "", hint: "", type: "textarea", options: [], rows: 14 }, answerBorder, locale, type, controlIndex++);
  const children = [
    new Paragraph({ spacing: { before: 180, after: 0 }, children: [new TextRun({ text: "KILENI", bold: true, size: 22, color: palette.blue, font: "Arial", characterSpacing: 80 }), new TextRun({ text: "  SEO", bold: true, size: 14, color: palette.muted, font: "Arial" })] }),
    new Paragraph({ spacing: { before: 240, after: 100 }, children: [new TextRun({ text: content.title, bold: true, size: 56, color: palette.ink, font: "Arial" })] }),
    new Paragraph({ spacing: { after: 300, line: 300 }, children: [new TextRun({ text: content.subtitle, size: 25, color: palette.muted, font: "Arial" })] }),
    noteParagraph(ru ? "Как заполнять" : "How to complete", ru ? "Отвечайте простыми словами. Если не знаете ответа, напишите «не знаю». После заполнения загрузите файл через форму «Бриф» на сайте KILENI или отправьте по согласованному контакту." : "Use plain language. If you do not know an answer, write “not sure”. Upload the completed file through the Brief form on the KILENI website or send it through the agreed contact."),
    heading(ru ? "1. Контакт и контекст" : "1. Contact and context", 1),
    ...commonControls,
    heading(ru ? "2. Вопросы по направлению" : "2. Service questions", 1),
    ...serviceControls,
    heading(ru ? "3. Дополнительные материалы" : "3. Additional materials", 1, true),
    new Paragraph({ spacing: { after: 90, line: 300 }, children: [new TextRun({ text: ru ? "Перечислите файлы, ссылки, примеры и пожелания. Не отправляйте пароли и секретные ключи в этом документе." : "List files, links, examples and preferences. Do not include passwords or secret keys in this document.", font: "Arial", size: 22, color: palette.muted })] }),
    notesControl,
    new Paragraph({ spacing: { before: 160, after: 120, line: 300 }, children: [new CheckBox({ alias: `${locale}_${type}_consent` }), new TextRun({ text: ru ? "  Я согласен(на) на обработку указанных данных и получение ответа по выбранному контакту." : "  I agree to processing the provided data and receiving a response through the selected contact.", font: "Arial", size: 22 })] }),
  ];
  const doc = new Document({
    title: content.title,
    subject: content.subtitle,
    creator: "KILENI",
    keywords: `KILENI, ${type}, brief`,
    description: ru ? "Заполняемый рабочий бриф KILENI" : "KILENI editable working brief",
    styles: { default: { document: { run: { font: "Arial", size: 22, color: palette.ink }, paragraph: { spacing: { after: 120, line: 300 } } } }, paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: "Arial", size: 32, bold: true, color: palette.blue }, paragraph: { spacing: { before: 360, after: 200, line: 300 }, keepNext: true, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: "Arial", size: 26, bold: true, color: palette.blue }, paragraph: { spacing: { before: 280, after: 140, line: 300 }, keepNext: true, outlineLevel: 1 } },
    ] },
    sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440, header: 708, footer: 708 } } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 0 }, children: [new TextRun({ text: `${content.title} · ${ru ? "рабочий бриф" : "working brief"}`, font: "Arial", size: 16, color: palette.muted })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 0 }, children: [new TextRun({ text: "KILENI · ", font: "Arial", size: 16, color: palette.muted }), new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: palette.muted })] })] }) }, children }],
  });
  return Packer.toBuffer(doc);
}

function heading(text, level, pageBreakBefore = false) { return new Paragraph({ text, heading: level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2, pageBreakBefore }); }
function noteParagraph(label, text) { return new Paragraph({ shading: { type: "clear", fill: "EAF0FF", color: "auto" }, indent: { left: 240, right: 240 }, spacing: { before: 120, after: 220, line: 300 }, children: [new TextRun({ text: `${label}. `, bold: true, font: "Arial", size: 21, color: palette.blue }), new TextRun({ text, font: "Arial", size: 21, color: palette.ink })] }); }
function questionBlock(question, border, locale, type, index) {
  const block = [
    new Paragraph({ spacing: { before: 120, after: 30 }, keepNext: true, children: [new TextRun({ text: question.label, bold: true, size: 22, font: "Arial" })] }),
  ];
  if (question.hint) {
    block.push(new Paragraph({ spacing: { after: 50 }, keepNext: true, children: [new TextRun({ text: question.hint, italics: true, size: 18, color: palette.muted, font: "Arial" })] }));
  }
  block.push(answerControl(question, border, locale, type, index));
  return block;
}

function answerControl(question, border, locale, type, index) {
  const tag = `${locale}_${type}_${String(index).padStart(2, "0")}_${question.key}`;
  const prompt = question.type === "select"
    ? (locale === "ru" ? "Выберите один вариант" : "Select one option")
    : (locale === "ru" ? "Введите ответ" : "Enter your answer");
  const properties = question.type === "select"
    ? `<w:dropDownList>${[
      { value: "", label: prompt },
      ...question.options,
    ].map((option) => `<w:listItem w:displayText="${xmlEscape(option.label)}" w:value="${xmlEscape(option.value)}"/>`).join("")}</w:dropDownList>`
    : `<w:text${question.type === "textarea" ? ' w:multiLine="1"' : ""}/>`;
  const breaks = question.type === "textarea" ? "<w:br/>".repeat(question.rows ?? 2) : "";
  const xml = `<w:sdt><w:sdtPr><w:alias w:val="${xmlEscape(question.label || prompt)}"/><w:tag w:val="${xmlEscape(tag)}"/><w:id w:val="${1000 + index}"/>${properties}</w:sdtPr><w:sdtContent><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:color w:val="${palette.muted}"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${xmlEscape(prompt)}</w:t>${breaks}</w:r></w:sdtContent></w:sdt>`;
  return new Paragraph({
    border: { bottom: border },
    spacing: { after: 170, line: 300 },
    children: [ImportedXmlComponent.fromXmlString(xml)],
  });
}

function xmlEscape(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function buildPdf(locale, type, content) {
  const ru = locale === "ru"; const pdf = await PDFDocument.create(); pdf.registerFontkit(fontkit);
  const regular = await pdf.embedFont(regularFontBytes, { subset: true }); const bold = await pdf.embedFont(boldFontBytes, { subset: true }); const form = pdf.getForm();
  pdf.setTitle(content.title); pdf.setAuthor("KILENI"); pdf.setSubject(content.subtitle); pdf.setKeywords(["KILENI", type, "brief"]);
  let page = pdf.addPage([612, 792]); let y = drawPdfHeader(page, content.title, content.subtitle, regular, bold, true); let fieldIndex = 0;
  page.drawText(ru ? "Заполните простыми словами и загрузите через форму «Бриф» на сайте KILENI. Не указывайте пароли и секретные ключи." : "Use plain language and upload the file through the Brief form on the KILENI website. Do not include passwords or secret keys.", { x: 54, y, size: 8, font: regular, color: color(palette.muted), maxWidth: 504, lineHeight: 11 });
  y -= 29;
  const allQuestions = [...common[locale].map((q) => ({ ...q, section: ru ? "Контакт и контекст" : "Contact and context" })), ...content.questions.map((q) => ({ ...q, section: ru ? "Вопросы по направлению" : "Service questions" }))];
  let currentSection = "";
  for (const question of allQuestions) {
    const multiline = question.type === "textarea"; const height = multiline ? 58 : 30;
    const sectionHeight = question.section === currentSection ? 0 : 27;
    const blockHeight = 13 + (question.hint ? 11 : 0) + height + 20;
    if (y - sectionHeight - blockHeight < 70) {
      page = pdf.addPage([612,792]);
      y = drawPdfHeader(page, content.title, "", regular, bold, false);
      currentSection = "";
    }
    if (question.section !== currentSection) {
      currentSection = question.section;
      page.drawText(currentSection, { x: 54, y, size: 14, font: bold, color: color(palette.blue) });
      y -= 27;
    }
    page.drawText(question.label, { x: 54, y, size: 9.5, font: bold, color: color(palette.ink), maxWidth: 500 }); y -= 13;
    if (question.hint) { page.drawText(question.hint, { x: 54, y, size: 7.5, font: regular, color: color(palette.muted), maxWidth: 500 }); y -= 11; }
    const fieldName = `${locale}_${type}_${String(fieldIndex++).padStart(2,"0")}_${question.key}`;
    const field = question.type === "select" ? form.createDropdown(fieldName) : form.createTextField(fieldName);
    if (question.type === "select") field.addOptions(["", ...question.options.map((option) => option.label)]);
    if (multiline) field.enableMultiline();
    field.addToPage(page, { x: 54, y: y - height, width: 504, height, borderWidth: 1, borderColor: color(palette.line), backgroundColor: rgb(.98,.985,.99), textColor: color(palette.ink), font: regular }); field.setFontSize(9); y -= height + 20;
  }
  if (y < 190) { page = pdf.addPage([612,792]); y = drawPdfHeader(page, content.title, "", regular, bold, false); }
  page.drawText(ru ? "Дополнительные материалы и комментарии" : "Additional materials and comments", { x:54, y, size:14, font:bold, color:color(palette.blue) }); y -= 20;
  const notesHeight = Math.min(400, Math.max(76, y - 150));
  const notes = form.createTextField(`${locale}_${type}_notes`); notes.enableMultiline(); notes.addToPage(page, { x:54, y:y-notesHeight, width:504, height:notesHeight, borderWidth:1, borderColor:color(palette.line), backgroundColor:rgb(.98,.985,.99), textColor:color(palette.ink), font:regular }); notes.setFontSize(9); y -= notesHeight + 29;
  const consent = form.createCheckBox(`${locale}_${type}_consent`); consent.addToPage(page, { x:54, y:y-2, width:14, height:14, borderWidth:1, borderColor:color(palette.blue), backgroundColor:rgb(1,1,1) });
  page.drawText(ru ? "Согласен(на) на обработку указанных данных и получение ответа." : "I agree to processing the provided data and receiving a response.", { x:76, y, size:8.5, font:regular, color:color(palette.ink), maxWidth:470 });
  for (const [index, item] of pdf.getPages().entries()) { item.drawText(`KILENI · ${index + 1}/${pdf.getPageCount()}`, { x: 492, y: 28, size: 7.5, font: regular, color: color(palette.muted) }); }
  form.updateFieldAppearances(regular); const bytes = await pdf.save({ useObjectStreams: false, addDefaultPage: false });
  const reopened = await PDFDocument.load(bytes); const expected = fieldIndex + 2; if (reopened.getForm().getFields().length !== expected) throw new Error(`${type}/${locale}: expected ${expected} fields`);
  const acroForm = reopened.catalog.lookup(PDFName.of("AcroForm")); if (!acroForm) throw new Error(`${type}/${locale}: AcroForm missing`);
  return bytes;
}

function drawPdfHeader(page, title, subtitle, regular, bold, first) { page.drawRectangle({ x:0,y:704,width:612,height:88,color:color(palette.night) }); page.drawText("KILENI", { x:54,y:745,size:16,font:bold,color:rgb(1,1,1) }); page.drawText("SEO", { x:125,y:748,size:7,font:bold,color:color(palette.blue) }); page.drawLine({ start:{x:54,y:731},end:{x:180,y:731},thickness:1,color:color(palette.blue) }); const titleY=first?664:672; page.drawText(title,{x:54,y:titleY,size:first?24:17,font:bold,color:color(palette.ink),maxWidth:504}); if(first&&subtitle)page.drawText(subtitle,{x:54,y:625,size:10,font:regular,color:color(palette.muted),maxWidth:504}); return first?590:635; }
function color(hex) { const value = hex.replace("#", ""); return rgb(parseInt(value.slice(0,2),16)/255,parseInt(value.slice(2,4),16)/255,parseInt(value.slice(4,6),16)/255); }

console.log(`Generated ${Object.keys(briefs).length * 4} briefs in ${outDir}`);
