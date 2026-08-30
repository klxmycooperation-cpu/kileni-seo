import { NextResponse } from "next/server";

import { publicFormsAreEnabled } from "@/src/config/site";
import { createLead } from "@/src/db/submissions";
import { notifyTelegram } from "@/src/lib/notifications/telegram";
import { leadRequestSchema } from "@/src/lib/security/inputs";
import { clientIp, privateHash, sanitizeLogValue } from "@/src/lib/security/request";
import { verifyTurnstile } from "@/src/lib/security/turnstile";
import { apiError, declaredBodyTooLarge, jsonReadError, mutationGuard, readJson } from "../_lib/http";
import { benignBotResponse, consumeRules, isFilledHoneypot, zodError } from "../_lib/submission";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!publicFormsAreEnabled()) return apiError(503, "FORM_SUBMISSIONS_DISABLED", "Приём заявок временно отключён");
  const guard = mutationGuard(request);
  if (guard) return guard;
  if (declaredBodyTooLarge(request, 64 * 1024)) return apiError(413, "PAYLOAD_TOO_LARGE", "Запрос слишком большой");

  const remoteIp = clientIp(request);
  const ipHash = privateHash(remoteIp);
  const limited = await consumeRules(`lead:${ipHash}`, [
    { suffix: "hour", rule: { windowMs: 60 * 60 * 1000, limit: 5 } },
    { suffix: "day", rule: { windowMs: 24 * 60 * 60 * 1000, limit: 20 } },
  ]);
  if (limited) return limited;

  let raw: unknown;
  try {
    raw = await readJson(request);
  } catch (error) {
    return jsonReadError(error);
  }
  if (isRecord(raw) && isFilledHoneypot(raw.honeypot)) return benignBotResponse();

  const parsed = leadRequestSchema.safeParse(raw);
  if (!parsed.success) return zodError(parsed.error);
  const botCheck = await verifyTurnstile(parsed.data.turnstileToken, remoteIp);
  if (!botCheck.ok) return apiError(403, "BOT_VERIFICATION_FAILED", "Не удалось подтвердить, что запрос отправил человек");

  let id: string;
  try {
    id = await createLead(parsed.data, ipHash);
  } catch {
    return apiError(500, "LEAD_CREATE_FAILED", "Не удалось сохранить заявку");
  }

  await notifyTelegram({
    entityType: "lead",
    entityId: id,
    text: [
      "Новая заявка",
      `Услуга: ${sanitizeLogValue(parsed.data.service)}`,
      `Имя: ${sanitizeLogValue(parsed.data.name)}`,
      `Контакт: ${sanitizeLogValue(parsed.data.contact)}`,
      ...(parsed.data.target ? [`Объект: ${sanitizeLogValue(parsed.data.target)}`] : []),
      `Язык: ${parsed.data.locale}`,
      `Источник: ${sanitizeLogValue(parsed.data.source)}`,
      `Admin: ${adminUrl(id)}`,
    ].join("\n"),
  }).catch(() => undefined);

  return NextResponse.json({ ok: true }, { status: 201, headers: { "cache-control": "no-store" } });
}

function adminUrl(id: string): string {
  const base = process.env.ADMIN_BASE_URL ?? process.env.APP_BASE_URL;
  return base ? new URL(`/admin/leads/${encodeURIComponent(id)}`, base).toString() : `/admin/leads/${id}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
