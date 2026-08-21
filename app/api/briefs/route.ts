import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { publicFormsAreEnabled } from "@/src/config/site";
import { sqlite } from "@/src/db/client";
import { createBrief } from "@/src/db/submissions";
import { notifyTelegram } from "@/src/lib/notifications/telegram";
import { sendEmail } from "@/src/lib/notifications/email";
import { briefAnswerLabel, type BriefService } from "@/src/content/brief";
import {
  fileTypeAllowed,
  maxFileCount,
  maxTotalFileBytes,
  safeOriginalFilename,
} from "@/src/lib/security/files";
import { briefRequestSchema } from "@/src/lib/security/inputs";
import { clientIp, privateHash, sanitizeLogValue } from "@/src/lib/security/request";
import { verifyTurnstile } from "@/src/lib/security/turnstile";
import { apiError, mutationGuard } from "../_lib/http";
import { benignBotResponse, consumeRules, isFilledHoneypot, zodError } from "../_lib/submission";
import {
  ensureUploadsRoot,
  extensionForUpload,
  hasOpenXmlSignature,
  removePrivateFiles,
  writePrivateFile,
} from "../_lib/uploads";

export const runtime = "nodejs";

const multipartRequestLimit = maxTotalFileBytes + 1024 * 1024;

type PreparedFile = {
  id: string;
  storageName: string;
  originalName: string;
  mime: string;
  size: number;
  bytes: Uint8Array;
};

export async function POST(request: Request) {
  if (!publicFormsAreEnabled()) return apiError(503, "FORM_SUBMISSIONS_DISABLED", "Приём заявок временно отключён");
  const guard = mutationGuard(request);
  if (guard) return guard;
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("multipart/form-data")) {
    return apiError(415, "UNSUPPORTED_MEDIA_TYPE", "Ожидается multipart/form-data");
  }
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > multipartRequestLimit) {
    return apiError(413, "PAYLOAD_TOO_LARGE", "Файлы вместе не должны превышать 10 МБ");
  }

  const remoteIp = clientIp(request);
  const ipHash = privateHash(remoteIp);
  const limited = consumeRules(sqlite, `brief:${ipHash}`, [
    { suffix: "hour", rule: { windowMs: 60 * 60 * 1000, limit: 3 } },
    { suffix: "day", rule: { windowMs: 24 * 60 * 60 * 1000, limit: 10 } },
  ]);
  if (limited) return limited;

  let form: FormData;
  try {
    form = await readLimitedFormData(request, multipartRequestLimit);
  } catch (error) {
    if (error instanceof MultipartTooLargeError) {
      return apiError(413, "PAYLOAD_TOO_LARGE", "Файлы вместе не должны превышать 10 МБ");
    }
    return apiError(400, "INVALID_MULTIPART", "Не удалось прочитать форму");
  }
  const payloadValue = form.get("payload");
  if (typeof payloadValue !== "string") return apiError(400, "PAYLOAD_REQUIRED", "В форме отсутствует payload");
  if (Buffer.byteLength(payloadValue, "utf8") > 256 * 1024) {
    return apiError(413, "PAYLOAD_TOO_LARGE", "Ответы брифа слишком большие");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(payloadValue) as unknown;
  } catch {
    return apiError(400, "INVALID_JSON", "Некорректный payload");
  }
  if (isRecord(raw) && isFilledHoneypot(raw.honeypot)) return benignBotResponse();
  const parsed = briefRequestSchema.safeParse(raw);
  if (!parsed.success) return zodError(parsed.error);
  const botCheck = await verifyTurnstile(parsed.data.turnstileToken, remoteIp);
  if (!botCheck.ok) return apiError(403, "BOT_VERIFICATION_FAILED", "Не удалось подтвердить, что запрос отправил человек");
  if (Object.keys(parsed.data.answers).length > 100 ||
      Object.values(parsed.data.answers).some((value) => Array.isArray(value) && value.length > 100)) {
    return apiError(422, "VALIDATION_ERROR", "Слишком много ответов в брифе");
  }

  const incomingFiles = form.getAll("files");
  if (incomingFiles.some((file) => !(file instanceof File))) {
    return apiError(400, "INVALID_FILE_FIELD", "Некорректное поле файла");
  }
  const files = incomingFiles as File[];
  if (files.length > maxFileCount) return apiError(413, "TOO_MANY_FILES", "Можно приложить не более 5 файлов");
  if (files.reduce((sum, file) => sum + file.size, 0) > maxTotalFileBytes) {
    return apiError(413, "PAYLOAD_TOO_LARGE", "Файлы вместе не должны превышать 10 МБ");
  }

  const prepared: PreparedFile[] = [];
  for (const file of files) {
    if (file.size <= 0) return apiError(422, "EMPTY_FILE", "Пустые файлы не принимаются");
    const originalName = safeOriginalFilename(file.name);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!fileTypeAllowed(originalName, file.type, bytes) || !hasOpenXmlSignature(bytes, file.type)) {
      return apiError(415, "FILE_TYPE_REJECTED", `Недопустимый тип файла: ${originalName}`);
    }
    const id = randomUUID();
    prepared.push({
      id,
      storageName: `${id}${extensionForUpload(originalName)}`,
      originalName,
      mime: file.type,
      size: file.size,
      bytes,
    });
  }

  let root: string;
  try {
    root = await ensureUploadsRoot();
  } catch {
    return apiError(500, "FILE_STORAGE_FAILED", "Не удалось безопасно сохранить файлы");
  }

  let briefId: string;
  try {
    briefId = sqlite.transaction(() => {
      const id = createBrief(parsed.data, ipHash);
      const insert = sqlite.prepare(`INSERT INTO attachments
        (id, brief_id, storage_name, original_name, mime, size, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`);
      const now = Date.now();
      for (const file of prepared) {
        insert.run(file.id, id, file.storageName, file.originalName, file.mime, file.size, now);
      }
      if (prepared.length > 0) sqlite.prepare("UPDATE brief_submissions SET status='uploading' WHERE id=?").run(id);
      return id;
    })();
  } catch {
    return apiError(500, "BRIEF_CREATE_FAILED", "Не удалось сохранить бриф");
  }

  if (prepared.length > 0) {
    const attempted: string[] = [];
    try {
      for (const file of prepared) {
        attempted.push(file.storageName);
        await writePrivateFile(root, file.storageName, file.bytes);
      }
      const finalized = sqlite.prepare("UPDATE brief_submissions SET status='new' WHERE id=? AND status='uploading'").run(briefId);
      if (finalized.changes !== 1) throw new Error("Brief upload finalization failed");
    } catch {
      const cleaned = await cleanupFiles(attempted);
      if (cleaned) {
        try {
          sqlite.transaction(() => {
            sqlite.prepare("DELETE FROM attachments WHERE brief_id=?").run(briefId);
            sqlite.prepare("DELETE FROM brief_submissions WHERE id=?").run(briefId);
          })();
        } catch {
          return apiError(500, "BRIEF_ROLLBACK_FAILED", "Загрузка не завершена; запись сохранена для безопасной очистки");
        }
        return apiError(500, "FILE_STORAGE_FAILED", "Не удалось безопасно сохранить файлы");
      }
      try { sqlite.prepare("UPDATE brief_submissions SET status='upload_failed' WHERE id=?").run(briefId); } catch { /* record remains traceable as uploading */ }
      return apiError(500, "FILE_CLEANUP_FAILED", "Загрузка не завершена; запись сохранена для безопасной очистки");
    }
  }

  await notifyTelegram({
    entityType: "brief",
    entityId: briefId,
    text: [
      "Новый бриф",
      `Направление: ${parsed.data.service}`,
      `Имя: ${sanitizeLogValue(parsed.data.name)}`,
      `Контакт: ${sanitizeLogValue(parsed.data.contact)}`,
      `Файлов: ${prepared.length}`,
      `Язык: ${parsed.data.locale}`,
      `Источник: brief`,
      `Admin: ${adminUrl(briefId)}`,
    ].join("\n"),
  }).catch(() => undefined);

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(parsed.data.contact)) {
    const emailResult = await sendEmail({
      to: parsed.data.contact,
      subject: parsed.data.locale === "ru" ? "Копия брифа KILENI" : "Your KILENI brief copy",
      text: formatBriefCopy(parsed.data.locale, parsed.data.service, parsed.data.answers),
    });
    const now = Date.now();
    sqlite.prepare("INSERT INTO notification_events(id,entity_type,entity_id,channel,status,error,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)")
      .run(randomUUID(), "brief", briefId, "email", emailResult.sent ? "sent" : emailResult.reason === "not_configured" ? "skipped" : "failed", emailResult.reason?.slice(0, 240) ?? null, now, now);
  }

  return NextResponse.json({ ok: true }, { status: 201, headers: { "cache-control": "no-store" } });
}

function formatBriefCopy(locale: "ru" | "en", service: BriefService, answers: Readonly<Record<string, unknown>>): string {
  const heading = locale === "ru"
    ? `KILENI сохранил ваш бриф по направлению «${service}». Ниже — копия ответов.`
    : `KILENI saved your “${service}” brief. A copy of your answers follows.`;
  const rows = Object.entries(answers).map(([key, value]) => `${briefAnswerLabel(service, key, locale)}: ${Array.isArray(value) ? value.join(", ") : String(value)}`);
  const footer = locale === "ru"
    ? "Это автоматическая копия. Мы свяжемся с вами в рабочее время."
    : "This is an automated copy. We will follow up during working hours.";
  return `${heading}\n\n${rows.join("\n")}\n\n${footer}`.slice(0, 20_000);
}

function adminUrl(id: string): string {
  const base = process.env.ADMIN_BASE_URL ?? process.env.APP_BASE_URL;
  return base ? new URL(`/admin/briefs/${encodeURIComponent(id)}`, base).toString() : `/admin/briefs/${id}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

class MultipartTooLargeError extends Error {}

async function readLimitedFormData(request: Request, limit: number): Promise<FormData> {
  if (!request.body) throw new TypeError("Missing request body");
  const reader = request.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel().catch(() => undefined);
        throw new MultipartTooLargeError();
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  const headers = new Headers(request.headers);
  headers.set("content-length", String(total));
  return new Request(request.url, {
    method: "POST",
    headers,
    body: Uint8Array.from(Buffer.concat(chunks, total)),
  }).formData();
}

async function cleanupFiles(storageNames: readonly string[]): Promise<boolean> {
  try {
    await removePrivateFiles(storageNames);
    return true;
  } catch {
    return false;
  }
}
