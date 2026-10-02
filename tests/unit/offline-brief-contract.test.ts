import { readFile } from "node:fs/promises";
import { inflateRawSync } from "node:zlib";
import { PDFCheckBox, PDFDocument, PDFDropdown, PDFTextField } from "pdf-lib";
import { describe, expect, test } from "vitest";
import { commonBriefQuestions, serviceQuestions, type BriefService } from "../../src/content/brief";

const locales = ["ru"] as const;
const services = Object.keys(serviceQuestions) as BriefService[];

describe("offline brief contract", () => {
  test("provides DOCX and PDF for every interactive direction", async () => {
    for (const locale of locales) {
      for (const service of services) {
        for (const extension of ["docx", "pdf"] as const) {
          const bytes = await readFile(assetPath(locale, service, extension));
          expect(bytes.byteLength, `${locale}-${service}.${extension}`).toBeGreaterThan(1_000);
        }
      }
    }
  });

  test("keeps every web question and its input type in each fillable PDF", async () => {
    for (const locale of locales) {
      for (const service of services) {
        const document = await PDFDocument.load(await readFile(assetPath(locale, service, "pdf")));
        const fields = document.getForm().getFields();
        const questions = [...commonBriefQuestions, ...serviceQuestions[service]];

        expect(fields).toHaveLength(questions.length + 4);
        expect(fields[0]).toBeInstanceOf(PDFTextField);
        expect(fields[1]).toBeInstanceOf(PDFTextField);

        for (const question of questions) {
          const field = fields.find((item) => item.getName().endsWith(`_${question.key}`));
          expect(field, `${locale}/${service}/${question.key}`).toBeDefined();
          if (question.type === "select") {
            expect(field).toBeInstanceOf(PDFDropdown);
            expect((field as PDFDropdown).getOptions()).toEqual([
              "",
              ...(question.options ?? []).map((option) => option[locale]),
            ]);
          } else {
            expect(field).toBeInstanceOf(PDFTextField);
            expect((field as PDFTextField).isMultiline()).toBe(question.type === "textarea");
          }
        }

        expect(fields.find((field) => field.getName() === `${locale}_${service}_notes`)).toBeInstanceOf(PDFTextField);
        expect(fields.find((field) => field.getName() === `${locale}_${service}_consent`)).toBeInstanceOf(PDFCheckBox);
      }
    }
  });

  test("prints every web question and every select option in each DOCX", async () => {
    for (const locale of locales) {
      for (const service of services) {
        const archive = await readFile(assetPath(locale, service, "docx"));
        const xml = readZipEntry(archive, "word/document.xml").toString("utf8");
        const visibleText = decodeXml(xml.replace(/<[^>]+>/gu, " "));
        const expectedQuestions = [
          { key: "name", type: "text" },
          { key: "contact", type: "text" },
          ...commonBriefQuestions,
          ...serviceQuestions[service],
          { key: "notes", type: "textarea" },
        ];
        const controls = [...xml.matchAll(/<w:sdt>([\s\S]*?)<\/w:sdt>/gu)]
          .map((match) => match[0])
          .filter((block) => block.includes("<w:tag "));

        expect(controls).toHaveLength(expectedQuestions.length);
        expect(controls.map(controlKey)).toEqual(expectedQuestions.map((question) => question.key));

        for (const question of [...commonBriefQuestions, ...serviceQuestions[service]]) {
          expect(visibleText, `${locale}/${service}/${question.key}`).toContain(question[locale]);
        }

        for (const [index, question] of expectedQuestions.entries()) {
          const control = controls[index];
          if (question.type === "select") {
            expect(control).toContain("<w:dropDownList>");
            const options = "options" in question ? question.options ?? [] : [];
            for (const option of options) {
              expect(control).toContain(`w:value="${escapeXml(option.value)}"`);
              expect(control).toContain(`w:displayText="${escapeXml(option[locale])}"`);
            }
          } else if (question.type === "textarea") {
            expect(control).toContain('<w:text w:multiLine="1"/>');
          } else {
            expect(control).toContain("<w:text/>");
          }
        }
        expect(xml).toContain(`<w:alias w:val="${locale}_${service}_consent"/>`);
      }
    }
  });
});

function assetPath(locale: typeof locales[number], service: BriefService, extension: "docx" | "pdf") {
  return new URL(`../../public/downloads/generated/${locale}-${service}-brief.${extension}`, import.meta.url);
}

function readZipEntry(archive: Buffer, expectedName: string): Buffer {
  const endSignature = 0x06054b50;
  let end = archive.length - 22;
  while (end >= 0 && archive.readUInt32LE(end) !== endSignature) end -= 1;
  if (end < 0) throw new Error("ZIP end record not found");

  const entries = archive.readUInt16LE(end + 10);
  let cursor = archive.readUInt32LE(end + 16);
  for (let index = 0; index < entries; index += 1) {
    if (archive.readUInt32LE(cursor) !== 0x02014b50) throw new Error("Invalid ZIP directory record");
    const method = archive.readUInt16LE(cursor + 10);
    const compressedSize = archive.readUInt32LE(cursor + 20);
    const nameLength = archive.readUInt16LE(cursor + 28);
    const extraLength = archive.readUInt16LE(cursor + 30);
    const commentLength = archive.readUInt16LE(cursor + 32);
    const localOffset = archive.readUInt32LE(cursor + 42);
    const name = archive.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");

    if (name === expectedName) {
      if (archive.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("Invalid ZIP local record");
      const localNameLength = archive.readUInt16LE(localOffset + 26);
      const localExtraLength = archive.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = archive.subarray(dataStart, dataStart + compressedSize);
      if (method === 0) return compressed;
      if (method === 8) return inflateRawSync(compressed);
      throw new Error(`Unsupported ZIP compression method: ${method}`);
    }

    cursor += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error(`ZIP entry not found: ${expectedName}`);
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&quot;/gu, '"')
    .replace(/&apos;/gu, "'")
    .replace(/&amp;/gu, "&")
    .replace(/\s+/gu, " ");
}

function controlKey(control: string): string {
  const tag = control.match(/<w:tag w:val="[^"]+_\d+_([^"]+)"\/>/u)?.[1];
  if (!tag) throw new Error("Tagged DOCX content control has no stable key");
  return tag;
}

function escapeXml(value: string): string {
  return value.replace(/&/gu, "&amp;").replace(/"/gu, "&quot;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");
}
