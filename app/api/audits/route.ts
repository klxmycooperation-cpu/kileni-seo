import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { publicFormsAreEnabled, siteConfig } from "@/src/config/site";
import { PUBLIC_AUDIT_PAGE_LIMIT } from "@/src/config/public-audit";
import { assertPublicUrl, AuditUrlError, normalizeAuditDomain, normalizeTargetUrl, runAudit, SsrfProtectionError, toPublicAuditResult, type AuditEvent } from "@/src/lib/audit";
import { sqlite } from "@/src/db/client";
import {
  appendAuditEvent,
  completeAuditRecord,
  createAuditRecord,
  failAuditRecord,
  findRecentCompletedAudit,
  getAuditByToken,
  hasActiveDomainAudit,
  type AuditRow,
} from "@/src/db/queries";
import { auditRequestSchema, detectContactType } from "@/src/lib/security/inputs";
import type { AuditRequest } from "@/src/lib/security/inputs";
import { clientIp, privateHash, sanitizeLogValue } from "@/src/lib/security/request";
import { verifyTurnstile } from "@/src/lib/security/turnstile";
import { notifyTelegram } from "@/src/lib/notifications/telegram";
import { sendEmail } from "@/src/lib/notifications/email";
import { withAuditRestore } from "@/src/lib/audit/restore-url";
import {
  createPublicAuditStreamResponse,
  type PublicAuditProgressEvent,
  type PublicAuditTerminalEvent,
} from "@/src/lib/audit/public-stream";
import { apiError, declaredBodyTooLarge, jsonReadError, mutationGuard, readJson, safeJsonParse } from "../_lib/http";
import { sanitizePublicAuditResult } from "../_lib/audit-public";
import { auditRestoreIsConfigured, createAuditRestoreEnvelope } from "../_lib/audit-restore";
import { benignBotResponse, consumeRules, isFilledHoneypot, zodError } from "../_lib/submission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type CreationResult = { audit: AuditRow; cached: boolean } | { conflict: true };

export async function POST(request: Request) {
  if (!publicFormsAreEnabled()) return apiError(503, "FORM_SUBMISSIONS_DISABLED", "Приём заявок временно отключён");
  if (isVercelRuntime() && !auditRestoreIsConfigured()) {
    return apiError(503, "AUDIT_RESTORE_NOT_CONFIGURED", "Проверка временно недоступна: сервер не настроен для безопасного сохранения результата");
  }
  const guard = mutationGuard(request);
  if (guard) return guard;
  if (declaredBodyTooLarge(request, 64 * 1024)) return apiError(413, "PAYLOAD_TOO_LARGE", "Запрос слишком большой");

  const remoteIp = clientIp(request);
  const ipHash = privateHash(remoteIp);
  let raw: unknown;
  try {
    raw = await readJson(request);
  } catch (error) {
    return jsonReadError(error);
  }
  if (isRecord(raw) && isFilledHoneypot(raw.honeypot)) return benignBotResponse();

  const parsed = auditRequestSchema.safeParse(raw);
  if (!parsed.success) return zodError(parsed.error);
  const botCheck = await verifyTurnstile(parsed.data.turnstileToken, remoteIp);
  if (!botCheck.ok) return apiError(403, "BOT_VERIFICATION_FAILED", "Не удалось подтвердить, что запрос отправил человек");

  let requestedTarget: URL;
  try {
    requestedTarget = normalizeTargetUrl(parsed.data.url);
  } catch (error) {
    if (error instanceof AuditUrlError) {
      return apiError(422, "TARGET_REJECTED", "Адрес сайта недоступен для безопасной проверки");
    }
    return apiError(422, "TARGET_REJECTED", "Не удалось проверить адрес сайта");
  }

  const normalizedDomain = normalizeAuditDomain(requestedTarget.hostname);
  if (hasActiveDomainAudit(normalizedDomain)) {
    return apiError(409, "DOMAIN_AUDIT_ACTIVE", "Для этого домена аудит уже выполняется");
  }

  let target: Awaited<ReturnType<typeof assertPublicUrl>>;
  try {
    target = await assertPublicUrl(requestedTarget);
  } catch (error) {
    if (error instanceof AuditUrlError || error instanceof SsrfProtectionError) {
      return apiError(422, "TARGET_REJECTED", "Адрес сайта недоступен для безопасной проверки");
    }
    return apiError(422, "TARGET_REJECTED", "Не удалось проверить адрес сайта");
  }

  const canonicalTarget = new URL(`${target.url.protocol}//${target.url.host}/`);

  const cacheDays = siteConfig.audit.cacheDays;
  // Invalid/safety-rejected URLs and a reusable result must not exhaust a visitor's quota.
  const recentForRateLimit = findRecentCompletedAudit(normalizedDomain, cacheDays * 24 * 60 * 60 * 1000);
  if (!recentForRateLimit || !reusableCache(recentForRateLimit)) {
    const limited = consumeRules(sqlite, `audit:${ipHash}`, [
      { suffix: "hour", rule: { windowMs: 60 * 60 * 1000, limit: siteConfig.audit.rateLimit.hourly } },
      { suffix: "day", rule: { windowMs: 24 * 60 * 60 * 1000, limit: siteConfig.audit.rateLimit.daily } },
    ]);
    if (limited) return limited;
  }
  let created: CreationResult;
  try {
    const createTransaction = sqlite.transaction((): CreationResult => {
      const recent = findRecentCompletedAudit(normalizedDomain, cacheDays * 24 * 60 * 60 * 1000);
      const cached = recent ? reusableCache(recent) : null;
      if (cached) {
        return {
          cached: true,
          audit: createAuditRecord({
            originalUrl: canonicalTarget.href,
            normalizedDomain,
            locale: parsed.data.locale,
            name: parsed.data.name,
            contact: parsed.data.contact,
            contactType: detectContactType(parsed.data.contact),
            ipHash,
            userAgentHash: privateHash(request.headers.get("user-agent") ?? "unknown"),
            source: parsed.data.source,
            pageLimit: siteConfig.audit.pageLimit,
            utm: parsed.data.utm,
            consentVersion: process.env.LEGAL_POLICY_VERSION ?? "2026-08-15",
            cached,
          }),
        };
      }
      if (hasActiveDomainAudit(normalizedDomain)) return { conflict: true };
      return {
        cached: false,
        audit: createAuditRecord({
          originalUrl: canonicalTarget.href,
          normalizedDomain,
          locale: parsed.data.locale,
          name: parsed.data.name,
          contact: parsed.data.contact,
          contactType: detectContactType(parsed.data.contact),
          ipHash,
          userAgentHash: privateHash(request.headers.get("user-agent") ?? "unknown"),
          source: parsed.data.source,
          pageLimit: siteConfig.audit.pageLimit,
          utm: parsed.data.utm,
          consentVersion: process.env.LEGAL_POLICY_VERSION ?? "2026-08-15",
        }),
      };
    });
    created = createTransaction.immediate();
  } catch {
    return apiError(500, "AUDIT_CREATE_FAILED", "Не удалось поставить аудит в очередь");
  }

  if ("conflict" in created) {
    return apiError(409, "DOMAIN_AUDIT_ACTIVE", "Для этого домена аудит уже выполняется");
  }

  if (isVercelRuntime() && !created.cached) {
    return createPublicAuditStreamResponse(
      {
        type: "accepted",
        token: created.audit.publicToken,
        status: "running",
        pageLimit: PUBLIC_AUDIT_PAGE_LIMIT,
      },
      async (emit): Promise<PublicAuditTerminalEvent> => {
        const currentAudit = await runVercelAudit(created.audit, (progress) => emit({
          type: "progress",
          token: created.audit.publicToken,
          ...progress,
          pageLimit: PUBLIC_AUDIT_PAGE_LIMIT,
        }));
        const restore = restoreForAudit(currentAudit);
        await recordSubmissionNotifications({ created, currentAudit, restore, request: parsed.data, normalizedDomain })
          .catch(() => undefined);
        if (!restore || (currentAudit.status !== "completed" && currentAudit.status !== "partial")) {
          return streamFailure(currentAudit);
        }
        return {
          type: "completed",
          token: created.audit.publicToken,
          status: currentAudit.status,
          restore,
        };
      },
    );
  }

  const currentAudit = created.audit;
  const restore = isVercelRuntime() ? restoreForAudit(currentAudit) : null;
  if (isVercelRuntime() && !restore) {
    return apiError(
      currentAudit.status === "failed" ? 502 : 500,
      currentAudit.status === "failed" ? "AUDIT_TARGET_UNAVAILABLE" : "AUDIT_RESTORE_FAILED",
      currentAudit.status === "failed"
        ? "Сайт не ответил или ограничил автоматическую проверку. Попробуйте позже."
        : "Не удалось безопасно сохранить публичный результат проверки",
    );
  }

  await recordSubmissionNotifications({ created, currentAudit, restore, request: parsed.data, normalizedDomain })
    .catch(() => undefined);

  return NextResponse.json(
    {
      ok: true,
      token: created.audit.publicToken,
      status: currentAudit.status,
      cached: created.cached,
      ...(restore ? { restore } : {}),
    },
    {
      status: created.cached || currentAudit.status === "completed" || currentAudit.status === "partial" || currentAudit.status === "failed" ? 200 : 202,
      headers: {
        location: withAuditRestore(`/api/audits/${created.audit.publicToken}`, restore),
        "cache-control": "no-store",
      },
    },
  );
}

async function recordSubmissionNotifications(input: {
  created: Exclude<CreationResult, { conflict: true }>;
  currentAudit: AuditRow;
  restore: string | null;
  request: AuditRequest;
  normalizedDomain: string;
}): Promise<void> {
  await notifyTelegram({
    entityType: "audit",
    entityId: input.created.audit.id,
    text: [
      input.created.cached ? "Повторный SEO-аудит (кеш)" : "Новый SEO-аудит",
      `Домен: ${input.normalizedDomain}`,
      `Имя: ${sanitizeLogValue(input.request.name)}`,
      `Контакт: ${sanitizeLogValue(input.request.contact)}`,
      `Язык: ${input.request.locale}`,
      `Источник: ${sanitizeLogValue(input.request.source)}`,
      `Admin: ${adminUrl("audits", input.created.audit.id)}`,
    ].join("\n"),
  }).catch(() => undefined);

  if (
    (input.currentAudit.status === "completed" || input.currentAudit.status === "partial") &&
    detectContactType(input.request.contact) === "email"
  ) {
    const publicPath = withAuditRestore(
      `${input.request.locale === "en" ? "/en" : ""}/audit/${encodeURIComponent(input.created.audit.publicToken)}`,
      input.restore,
    );
    const publicUrl = process.env.APP_BASE_URL ? new URL(publicPath, process.env.APP_BASE_URL).toString() : publicPath;
    const emailResult = await sendEmail({
      to: input.request.contact,
      subject: input.request.locale === "ru" ? "Результат предварительной SEO-проверки KILENI" : "Your KILENI preliminary SEO check",
      text: input.request.locale === "ru" ? `Результат проверки готов: ${publicUrl}` : `Your audit result is ready: ${publicUrl}`,
    });
    const now = Date.now();
    sqlite.prepare("INSERT INTO notification_events(id,entity_type,entity_id,channel,status,error,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)")
      .run(randomUUID(), "audit", input.created.audit.id, "email", emailResult.sent ? "sent" : emailResult.reason === "not_configured" ? "skipped" : "failed", emailResult.reason?.slice(0, 240) ?? null, now, now);
  }
}

type InlineProgress = Pick<PublicAuditProgressEvent, "status" | "pagesChecked" | "pagesDiscovered">;

async function runVercelAudit(
  audit: AuditRow,
  onProgress?: (progress: InlineProgress) => void,
): Promise<AuditRow> {
  const controller = new AbortController();
  // Keep enough headroom for notifications, signing and the platform response.
  const timer = setTimeout(() => controller.abort("VERCEL_AUDIT_TIMEOUT"), 42_000);

  try {
    const result = await runAudit(audit.originalUrl, {
      maxPages: Math.min(siteConfig.audit.pageLimit, audit.pageLimit),
      concurrency: 4,
      performance: null,
      signal: controller.signal,
      onEvent: (event) => {
        const progress = recordInlineAuditEvent(audit.id, event);
        if (progress) onProgress?.(progress);
      },
    });
    const publicResult = toPublicAuditResult(result, audit.locale);
    appendAuditEvent(audit.id, "analyzing_structure", { pagesChecked: result.pagesChecked, pagesDiscovered: result.pagesDiscovered });
    onProgress?.({ status: "analyzing_structure", pagesChecked: result.pagesChecked, pagesDiscovered: result.pagesDiscovered });
    // Vercel does not provide a browser runtime for synthetic Lighthouse data.
    // Keep the public stage honest: surface only speed signals observed during
    // the crawl, while unavailable lab metrics remain explicitly unknown.
    appendAuditEvent(audit.id, "running_performance", { pagesChecked: result.pagesChecked, pagesDiscovered: result.pagesDiscovered });
    onProgress?.({ status: "running_performance", pagesChecked: result.pagesChecked, pagesDiscovered: result.pagesDiscovered });
    appendAuditEvent(audit.id, "calculating_score", { pagesChecked: result.pagesChecked, pagesDiscovered: result.pagesDiscovered });
    onProgress?.({ status: "calculating_score", pagesChecked: result.pagesChecked, pagesDiscovered: result.pagesDiscovered });
    completeAuditRecord(audit.id, {
      publicResult: publicResult as unknown as Record<string, unknown>,
      fullResult: result as unknown as Record<string, unknown>,
      score: result.score.total,
      grade: result.grade,
      partial: result.partial,
      pagesDiscovered: result.pagesDiscovered,
      pagesChecked: result.pagesChecked,
      pages: result.pages.map((page) => ({ ...page, depth: page.transport?.depth ?? 0 } as unknown as Record<string, unknown>)),
      issues: result.issues.map((issue) => ({ ...issue, evidence: issue.description } as unknown as Record<string, unknown>)),
    });
  } catch (error) {
    const reason = controller.signal.aborted
      ? "Audit time limit exceeded"
      : error instanceof Error
        ? error.message
        : "Audit failed";
    failAuditRecord(audit.id, reason);
  } finally {
    clearTimeout(timer);
  }
  return getAuditByToken(audit.publicToken) ?? audit;
}

function restoreForAudit(audit: AuditRow): string | null {
  if ((audit.status !== "completed" && audit.status !== "partial") || audit.completedAt === null) return null;
  const result = sanitizePublicAuditResult(safeJsonParse(audit.publicResultJson));
  if (!result) return null;
  return createAuditRestoreEnvelope({
    token: audit.publicToken,
    locale: audit.locale,
    normalizedDomain: audit.normalizedDomain,
    status: audit.status,
    createdAt: audit.createdAt,
    completedAt: audit.completedAt,
    result,
  });
}

function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1";
}

function recordInlineAuditEvent(
  auditId: string,
  event: AuditEvent,
): InlineProgress | null {
  if (event.type === "audit:start") return appendInlineProgress(auditId, "connecting", 0, 0);
  if (event.type === "discovery:start") return appendInlineProgress(auditId, "checking_robots", 0, 0);
  if (event.type === "discovery:robots_complete") return appendInlineProgress(auditId, "checking_sitemaps", 0, 0);
  if (event.type === "discovery:sitemaps_complete") return appendInlineProgress(auditId, "discovering_pages", 0, 0);
  if (event.type === "crawl:page" || event.type === "crawl:progress") {
    return appendInlineProgress(auditId, "crawling_pages", event.pagesChecked, event.pagesDiscovered);
  }
  return null;
}

function appendInlineProgress(
  auditId: string,
  status: string,
  pagesChecked: number,
  pagesDiscovered: number,
): InlineProgress {
  appendAuditEvent(auditId, status, { pagesChecked, pagesDiscovered });
  return { status, pagesChecked, pagesDiscovered };
}

function streamFailure(audit: AuditRow): PublicAuditTerminalEvent {
  return {
    type: "failed",
    token: audit.publicToken,
    code: audit.status === "failed" ? "AUDIT_TARGET_UNAVAILABLE" : "AUDIT_RESTORE_FAILED",
    message: audit.status === "failed"
      ? "Сайт не ответил или ограничил автоматическую проверку. Попробуйте позже."
      : "Не удалось безопасно сохранить публичный результат проверки",
  };
}

function adminUrl(section: string, id: string): string {
  const base = process.env.ADMIN_BASE_URL ?? process.env.APP_BASE_URL;
  return base ? new URL(`/admin/${section}/${encodeURIComponent(id)}`, base).toString() : `/admin/${section}/${id}`;
}

function reusableCache(row: AuditRow): {
  publicResultJson: string;
  fullResultJson: string;
  overallScore: number;
  grade: string;
  pagesDiscovered: number;
  pagesChecked: number;
  partial: boolean;
} | null {
  const publicResult = sanitizePublicAuditResult(safeJsonParse(row.publicResultJson));
  const fullResult = safeJsonParse(row.fullResultJson);
  if (publicResult === null || fullResult === null || row.overallScore === null || !row.grade) return null;
  return {
    publicResultJson: JSON.stringify(stripSensitiveFields(publicResult)),
    fullResultJson: JSON.stringify(stripSensitiveFields(fullResult)),
    overallScore: row.overallScore,
    grade: row.grade,
    pagesDiscovered: row.pagesDiscovered,
    pagesChecked: row.pagesChecked,
    partial: Boolean(row.partial),
  };
}

function stripSensitiveFields(value: unknown, depth = 0): unknown {
  if (Array.isArray(value)) return value.map((item) => stripSensitiveFields(item, depth + 1));
  if (!isRecord(value)) return value;
  const denied = /^(?:contact|contacttype|email|phone|telegram|ip|iphash|useragent|useragenthash|password|secret|token|authorization|cookie)$/iu;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !(depth === 0 && key.toLowerCase() === "name") && !denied.test(key.replace(/[_-]/gu, "")))
      .map(([key, child]) => [key, stripSensitiveFields(child, depth + 1)]),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
