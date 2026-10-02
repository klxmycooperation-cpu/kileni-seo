import { after, NextResponse } from "next/server";

import { calculateEstimate } from "@/src/config/calculator";
import { publicFormsAreEnabled } from "@/src/config/site";
import { createCalculatorRequest, createLead } from "@/src/db/submissions";
import { database } from "@/src/db/client";
import { notifySubmission } from "@/src/lib/notifications/submission";
import { calculatorRequestSchema } from "@/src/lib/security/inputs";
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
  const limited = await consumeRules(`calculator:${ipHash}`, [
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

  const parsed = calculatorRequestSchema.safeParse(raw);
  if (!parsed.success) return zodError(parsed.error);
  const botCheck = await verifyTurnstile(parsed.data.turnstileToken, remoteIp);
  if (!botCheck.ok) return apiError(403, "BOT_VERIFICATION_FAILED", "Не удалось подтвердить, что запрос отправил человек");
  if (Object.keys(parsed.data.answers).length > 50 ||
      Object.values(parsed.data.answers).some((value) => typeof value === "string" && value.length > 500)) {
    return apiError(422, "VALIDATION_ERROR", "Слишком много данных в расчёте");
  }

  const estimate = calculateEstimate(parsed.data.kind, parsed.data.answers, parsed.data.locale);
  let ids: { leadId: string; calculatorId: string };
  try {
    ids = await database.transaction(async (transaction) => {
    const leadId = await createLead({
        name: parsed.data.name,
        contact: parsed.data.contact,
        locale: parsed.data.locale,
        consent: true,
        honeypot: "",
        target: "",
        service: `calculator-${parsed.data.kind}`,
        comment: "",
        pageUrl: parsed.data.pageUrl,
        source: parsed.data.source,
        utm: parsed.data.utm,
    }, ipHash, transaction);
    const calculatorId = await createCalculatorRequest({
        leadId,
        kind: parsed.data.kind,
        answers: parsed.data.answers,
        min: estimate.min,
        max: estimate.max,
    }, transaction);
    return { leadId, calculatorId };
    });
  } catch {
    return apiError(500, "CALCULATOR_CREATE_FAILED", "Не удалось сохранить расчёт");
  }

  after(() => notifySubmission({
    entityType: "lead",
    entityId: ids.leadId,
    text: [
      "Новый расчёт",
      `Направление: ${parsed.data.kind}`,
      `Диапазон: ${estimate.min}–${estimate.max} ₽`,
      `Имя: ${sanitizeLogValue(parsed.data.name)}`,
      `Контакт: ${sanitizeLogValue(parsed.data.contact)}`,
      `Язык: ${parsed.data.locale}`,
      `Источник: ${sanitizeLogValue(parsed.data.source)}`,
      `Admin: ${adminUrl(ids.leadId)}`,
    ].join("\n"),
  }).catch(() => undefined));

  return NextResponse.json(
    { ok: true, estimate },
    { status: 201, headers: { "cache-control": "no-store" } },
  );
}

function adminUrl(id: string): string {
  const base = process.env.ADMIN_BASE_URL ?? process.env.APP_BASE_URL;
  return base ? new URL(`/admin/leads/${encodeURIComponent(id)}`, base).toString() : `/admin/leads/${id}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
