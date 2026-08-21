import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFName, rgb } from "pdf-lib";
import {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, PageNumber,
  Packer, Paragraph, TextRun, convertInchesToTwip,
} from "docx";

const outDir = resolve("public/downloads/generated");
await mkdir(outDir, { recursive: true });

const palette = { night: "0B0D10", ink: "111318", muted: "69707D", blue: "2867F0", violet: "7457F5", line: "DDE2E9", paper: "F6F7F9" };
const regularFontPath = process.env.BRIEF_FONT_REGULAR || "/System/Library/Fonts/Supplemental/Arial.ttf";
const boldFontPath = process.env.BRIEF_FONT_BOLD || "/System/Library/Fonts/Supplemental/Arial Bold.ttf";
if (!existsSync(regularFontPath) || !existsSync(boldFontPath)) throw new Error("Set BRIEF_FONT_REGULAR and BRIEF_FONT_BOLD to Cyrillic-capable TTF files");
const [regularFontBytes, boldFontBytes] = await Promise.all([readFile(regularFontPath), readFile(boldFontPath)]);

const common = {
  ru: [
    ["name", "Ваше имя", "Как к вам обращаться"], ["company", "Компания или проект", "Официальное название необязательно"],
    ["contact", "Телефон, Telegram или e-mail", "Укажите один удобный способ связи"], ["business", "Чем занимается бизнес?", "Товары, услуги и ключевое направление"],
    ["audience", "Кто основной клиент?", "Кто принимает решение о покупке"], ["geography", "География работы", "Город, регионы или страны"],
    ["problem", "Что сейчас не устраивает?", "Опишите ситуацию своими словами"], ["result", "Какой результат нужен?", "Что должно измениться после проекта"],
    ["timeline", "Желаемый срок", "Если точной даты нет, укажите ориентир"], ["budget", "Бюджетный диапазон", "Можно написать «пока не знаю»"],
  ],
  en: [
    ["name", "Your name", "How should we address you"], ["company", "Company or project", "A legal name is not required"],
    ["contact", "Phone, Telegram or email", "One preferred contact is enough"], ["business", "What does the business do?", "Products, services and primary direction"],
    ["audience", "Who is the primary customer?", "Who makes the purchasing decision"], ["geography", "Geography", "Cities, regions or countries"],
    ["problem", "What is not working today?", "Describe the situation in your own words"], ["result", "What outcome do you need?", "What should change after the project"],
    ["timeline", "Preferred timeline", "An approximate target is sufficient"], ["budget", "Budget range", "You can write “not sure yet”"],
  ],
};

const briefs = {
  seo: {
    ru: { title: "Бриф: SEO и продвижение", subtitle: "Регулярная техническая, структурная и контентная работа", questions: [["url", "Ссылка на сайт", ""], ["priorities", "Приоритетные услуги и регионы", ""], ["history", "Продвигался ли сайт и что уже пробовали?", ""], ["competitors", "Известные конкуренты", "Ссылки или названия"], ["analytics", "Есть ли аналитика и поисковые кабинеты?", "Да / Нет / Не знаю"], ["developer", "Есть ли разработчик?", "Да / Нет / Не знаю"]] },
    en: { title: "Brief: SEO growth", subtitle: "Ongoing technical, structural and content delivery", questions: [["url", "Website URL", ""], ["priorities", "Priority services and regions", ""], ["history", "Has SEO been attempted and what was tried?", ""], ["competitors", "Known competitors", "Names or links"], ["analytics", "Are analytics and search consoles available?", "Yes / No / Not sure"], ["developer", "Is a developer available?", "Yes / No / Not sure"]] },
  },
  audit: {
    ru: { title: "Бриф: SEO-аудит", subtitle: "Короткая диагностика перед подробной проверкой", questions: [["url", "Ссылка на сайт", ""], ["concern", "Что именно беспокоит?", ""], ["changes", "Что недавно изменилось на сайте?", ""], ["promotion", "Проводилось ли продвижение?", "Да / Нет / Не знаю"], ["access", "Какие доступы можно предоставить позже?", "Аналитика / Вебмастер / Search Console / Не знаю"]] },
    en: { title: "Brief: SEO audit", subtitle: "A short diagnostic intake before the full review", questions: [["url", "Website URL", ""], ["concern", "What is the main concern?", ""], ["changes", "What changed recently?", ""], ["promotion", "Has SEO been attempted?", "Yes / No / Not sure"], ["access", "Which access can be provided later?", "Analytics / Search consoles / Not sure"]] },
  },
  marketplaces: {
    ru: { title: "Бриф: Wildberries и Ozon", subtitle: "Карточки товаров, визуальная упаковка и сопровождение", questions: [["platform", "Площадка", "Wildberries / Ozon"], ["cards", "Ссылки, артикулы и количество карточек", ""], ["scope", "Только тексты или полная упаковка?", ""], ["photos", "Есть ли исходные фотографии?", "Да / Нет / Не знаю"], ["visuals", "Нужны изображения, инфографика, генерация образов или видео?", ""], ["publishing", "Нужна публикация и замена по расписанию?", ""], ["support", "Требуется регулярная аналитика и сопровождение?", ""]] },
    en: { title: "Brief: Wildberries and Ozon", subtitle: "Product cards, visual packaging and ongoing support", questions: [["platform", "Platform", "Wildberries / Ozon"], ["cards", "Links, SKUs and card count", ""], ["scope", "Copy only or full packaging?", ""], ["photos", "Are source product photos available?", "Yes / No / Not sure"], ["visuals", "Are images, infographics, generated scenes or video required?", ""], ["publishing", "Is publishing and scheduled replacement required?", ""], ["support", "Is recurring analytics and support required?", ""]] },
  },
  development: {
    ru: { title: "Бриф: разработка сайта", subtitle: "От бизнес-задачи до поддерживаемого digital-продукта", questions: [["existing", "Есть ли действующий сайт?", "Ссылка или «нет»"], ["siteType", "Какой сайт нужен?", "Лендинг / корпоративный / каталог / магазин / сервис / не знаю"], ["goal", "Основная цель сайта", ""], ["pages", "Какие страницы и разделы нужны?", ""], ["functions", "Какие функции обязательны?", ""], ["commerce", "Нужны каталог, корзина или оплата?", ""], ["account", "Нужен личный кабинет?", ""], ["integrations", "Нужны интеграции?", "Если термин незнаком, напишите «не знаю»"], ["brand", "Есть логотип и фирменный стиль?", ""], ["content", "Готовы тексты и фотографии?", ""], ["references", "Понравившиеся сайты", "Ссылки и что именно нравится"]] },
    en: { title: "Brief: web development", subtitle: "From business problem to a maintainable digital product", questions: [["existing", "Is there an existing website?", "Link or “no”"], ["siteType", "What kind of website is needed?", "Landing / corporate / catalogue / commerce / service / not sure"], ["goal", "Primary website goal", ""], ["pages", "Required pages and sections", ""], ["functions", "Essential functions", ""], ["commerce", "Are catalogue, cart or payment required?", ""], ["account", "Is a user account required?", ""], ["integrations", "Are integrations required?", "Write “not sure” if the term is unfamiliar"], ["brand", "Are logo and visual identity available?", ""], ["content", "Are copy and photos ready?", ""], ["references", "Website references", "Links and what you like about them"]] },
  },
};

for (const locale of ["ru", "en"]) {
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
  const children = [
    new Paragraph({ spacing: { before: 180, after: 0 }, children: [new TextRun({ text: "KILENI", bold: true, size: 22, color: palette.blue, font: "Arial", characterSpacing: 80 }), new TextRun({ text: "  SEO", bold: true, size: 14, color: palette.muted, font: "Arial" })] }),
    new Paragraph({ spacing: { before: 240, after: 100 }, children: [new TextRun({ text: content.title, bold: true, size: 56, color: palette.ink, font: "Arial" })] }),
    new Paragraph({ spacing: { after: 300, line: 300 }, children: [new TextRun({ text: content.subtitle, size: 25, color: palette.muted, font: "Arial" })] }),
    noteParagraph(ru ? "Как заполнять" : "How to complete", ru ? "Пишите простыми словами. Технические поля необязательны: если ответа нет, укажите «не знаю». После заполнения загрузите файл через форму «Бриф» на сайте KILENI или отправьте по согласованному контакту." : "Use plain language. Technical questions are optional: write “not sure” whenever needed. Upload the completed file through the Brief form on the KILENI website or send it through the agreed contact."),
    heading(ru ? "1. Контакт и контекст" : "1. Contact and context", 1),
    ...common[locale].flatMap((question) => questionBlock(question, answerBorder)),
    heading(ru ? "2. Вопросы по направлению" : "2. Service questions", 1),
    ...content.questions.flatMap((question) => questionBlock(question, answerBorder)),
    heading(ru ? "3. Дополнительные материалы" : "3. Additional materials", 1),
    new Paragraph({ spacing: { after: 90, line: 300 }, children: [new TextRun({ text: ru ? "Перечислите файлы, ссылки, примеры и пожелания. Не отправляйте пароли и секретные ключи в этом документе." : "List files, links, examples and preferences. Do not include passwords or secret keys in this document.", font: "Arial", size: 22, color: palette.muted })] }),
    blankAnswer(answerBorder, 3),
    heading(ru ? "4. Согласие" : "4. Consent", 1),
    new Paragraph({ spacing: { after: 120, line: 300 }, children: [new TextRun({ text: "☐ ", font: "Arial", size: 22, color: palette.blue }), new TextRun({ text: ru ? "Я согласен(на) на обработку указанных данных и получение ответа по выбранному контакту." : "I agree to processing the provided data and receiving a response through the selected contact.", font: "Arial", size: 22 })] }),
    new Paragraph({ spacing: { before: 160, after: 60 }, children: [new TextRun({ text: ru ? "Свободный комментарий" : "Additional comment", bold: true, font: "Arial", size: 22 })] }),
    blankAnswer(answerBorder, 4),
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

function heading(text, level) { return new Paragraph({ text, heading: level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2 }); }
function noteParagraph(label, text) { return new Paragraph({ shading: { type: "clear", fill: "EAF0FF", color: "auto" }, indent: { left: 240, right: 240 }, spacing: { before: 120, after: 220, line: 300 }, children: [new TextRun({ text: `${label}. `, bold: true, font: "Arial", size: 21, color: palette.blue }), new TextRun({ text, font: "Arial", size: 21, color: palette.ink })] }); }
function questionBlock([key, label, hint], border) { return [new Paragraph({ spacing: { before: 120, after: 30 }, keepNext: true, children: [new TextRun({ text: label, bold: true, size: 22, font: "Arial" })] }), ...(hint ? [new Paragraph({ spacing: { after: 50 }, keepNext: true, children: [new TextRun({ text: hint, italics: true, size: 18, color: palette.muted, font: "Arial" })] })] : []), blankAnswer(border, ["business", "problem", "result", "priorities", "history", "concern", "changes", "cards", "visuals", "goal", "pages", "functions", "integrations", "references"].includes(key) ? 3 : 1)]; }
function blankAnswer(border, lines) { return new Paragraph({ border: { bottom: border }, spacing: { after: 170, line: 300 }, children: [new TextRun({ text: Array.from({ length: lines }, () => "\n").join(""), font: "Arial", size: 22 })] }); }

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
    if (question.section !== currentSection) { currentSection = question.section; if (y < 150) { page = pdf.addPage([612,792]); y = drawPdfHeader(page, content.title, "", regular, bold, false); } page.drawText(currentSection, { x: 54, y, size: 14, font: bold, color: color(palette.blue) }); y -= 27; }
    const multiline = ["business", "problem", "result", "priorities", "history", "concern", "changes", "cards", "visuals", "goal", "pages", "functions", "integrations", "references"].includes(question[0]); const height = multiline ? 58 : 30;
    if (y - height < 70) { page = pdf.addPage([612,792]); y = drawPdfHeader(page, content.title, "", regular, bold, false); currentSection = ""; }
    page.drawText(question[1], { x: 54, y, size: 9.5, font: bold, color: color(palette.ink), maxWidth: 500 }); y -= 13;
    if (question[2]) { page.drawText(question[2], { x: 54, y, size: 7.5, font: regular, color: color(palette.muted), maxWidth: 500 }); y -= 11; }
    const field = form.createTextField(`${locale}_${type}_${String(fieldIndex++).padStart(2,"0")}_${question[0]}`); if (multiline) field.enableMultiline(); field.addToPage(page, { x: 54, y: y - height, width: 504, height, borderWidth: 1, borderColor: color(palette.line), backgroundColor: rgb(.98,.985,.99), textColor: color(palette.ink), font: regular }); field.setFontSize(9); y -= height + 20;
  }
  if (y < 190) { page = pdf.addPage([612,792]); y = drawPdfHeader(page, content.title, "", regular, bold, false); }
  page.drawText(ru ? "Дополнительный комментарий" : "Additional comment", { x:54, y, size:14, font:bold, color:color(palette.blue) }); y -= 20;
  const notes = form.createTextField(`${locale}_${type}_notes`); notes.enableMultiline(); notes.addToPage(page, { x:54, y:y-76, width:504, height:76, borderWidth:1, borderColor:color(palette.line), backgroundColor:rgb(.98,.985,.99), textColor:color(palette.ink), font:regular }); notes.setFontSize(9); y -= 105;
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

console.log(`Generated 16 briefs in ${outDir}`);
