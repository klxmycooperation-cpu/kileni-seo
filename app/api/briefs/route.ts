import { randomUUID } from "node:crypto";

import { after, NextResponse } from "next/server";

import { publicFormsAreEnabled } from "@/src/config/site";
import { database } from "@/src/db/client";
import { createBrief } from "@/src/db/submissions";
import { notifyTelegram } from "@/src/lib/notifications/telegram";
import { sendEmail } from "@/src/lib/notifications/email";
import { canonicalizeBriefOffer } from "@/src/lib/brief/offer-payload";
import { briefServiceName, formatBriefEmailCopy } from "@/src/lib/brief/presentation";
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
  const limited = await consumeRules(`brief:${ipHash}`, [
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
  const canonicalOffer = canonicalizeBriefOffer(parsed.data);
  if (!canonicalOffer.ok) {
    return apiError(422, "INVALID_OFFER", canonicalOffer.reason === "unknown_offer" ? "Выбранное предложение не найдено" : "Предложение не соответствует выбранному направлению");
  }
  const submission = { ...parsed.data, answers: canonicalOffer.answers };
  const botCheck = await verifyTurnstile(parsed.data.turnstileToken, remoteIp);
  if (!botCheck.ok) return apiError(403, "BOT_VERIFICATION_FAILED", "Не удалось подтвердить, что запрос отправил человек");
  if (Object.keys(submission.answers).length > 100 ||
      Object.values(submission.answers).some((value) => Array.isArray(value) && value.length > 100)) {
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
    briefId = await database.transaction(async (transaction) => {
      const id = await createBrief(submission, ipHash, transaction);
      const now = Date.now();
      for (const file of prepared) {
        await transaction.execute({ sql: `INSERT INTO attachments (id, brief_id, storage_name, original_name, mime, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`, args: [file.id, id, file.storageName, file.originalName, file.mime, file.size, now] });
      }
      if (prepared.length > 0) await transaction.execute({ sql: "UPDATE brief_submissions SET status='uploading' WHERE id=?", args: [id] });
      return id;
    });
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
      const finalized = await database.execute({ sql: "UPDATE brief_submissions SET status='new' WHERE id=? AND status='uploading'", args: [briefId] });
      if (finalized.rowsAffected !== 1) throw new Error("Brief upload finalization failed");
    } catch {
      const cleaned = await cleanupFiles(attempted);
      if (cleaned) {
        try {
          await database.transaction(async (transaction) => {
            await transaction.execute({ sql: "DELETE FROM attachments WHERE brief_id=?", args: [briefId] });
            await transaction.execute({ sql: "DELETE FROM brief_submissions WHERE id=?", args: [briefId] });
          });
        } catch {
          return apiError(500, "BRIEF_ROLLBACK_FAILED", "Загрузка не завершена; запись сохранена для безопасной очистки");
        }
        return apiError(500, "FILE_STORAGE_FAILED", "Не удалось безопасно сохранить файлы");
      }
      try { await database.execute({ sql: "UPDATE brief_submissions SET status='upload_failed' WHERE id=?", args: [briefId] }); } catch { /* record remains traceable as uploading */ }
      return apiError(500, "FILE_CLEANUP_FAILED", "Загрузка не завершена; запись сохранена для безопасной очистки");
    }
  }

  after(async () => {
  await notifyTelegram({
    entityType: "brief",
    entityId: briefId,
    text: [
      "Новый бриф",
      `Направление: ${briefServiceName(submission.service, "ru")}`,
      `Предложение: ${submission.offerId ? (getReadableOfferTitle(submission.answers) ?? "выбрано в каталоге") : "не выбрано"}`,
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
      text: formatBriefEmailCopy(submission.locale, submission.service, submission.answers),
    });
    const now = Date.now();
    await database.execute({
      sql: "INSERT INTO notification_events(id,entity_type,entity_id,channel,status,error,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)",
      args: [randomUUID(), "brief", briefId, "email", emailResult.sent ? "sent" : emailResult.reason === "not_configured" ? "skipped" : "failed", emailResult.reason?.slice(0, 240) ?? null, now, now],
    });
  }

  });

  return NextResponse.json({ ok: true }, { status: 201, headers: { "cache-control": "no-store" } });
}

function getReadableOfferTitle(answers: Readonly<Record<string, unknown>>): string | null {
  const value = answers.selectedOfferTitle;
  return typeof value === "string" && value.trim() ? value.trim() : null;
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
