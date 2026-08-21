import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { sqlite } from "@/src/db/client";
import { adminCookieName, createAdminSession } from "@/src/lib/security/session";
import { clientIp, privateHash } from "@/src/lib/security/request";
import { apiError, declaredBodyTooLarge, jsonReadError, mutationGuard, readJson } from "../../_lib/http";
import { consumeRules, zodError } from "../../_lib/submission";

export const runtime = "nodejs";

const loginSchema = z.object({
  login: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(500),
});

export async function POST(request: Request) {
  const mutation = mutationGuard(request);
  if (mutation) return mutation;
  if (declaredBodyTooLarge(request, 8 * 1024)) return apiError(413, "PAYLOAD_TOO_LARGE", "Запрос слишком большой");

  const ipHash = privateHash(clientIp(request));
  const limited = consumeRules(sqlite, `admin-login:${ipHash}`, [
    { suffix: "15m", rule: { windowMs: 15 * 60 * 1000, limit: 8 } },
    { suffix: "day", rule: { windowMs: 24 * 60 * 60 * 1000, limit: 30 } },
  ]);
  if (limited) return limited;

  let raw: unknown;
  try {
    raw = await readJson(request, 8 * 1024);
  } catch (error) {
    return jsonReadError(error);
  }
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return zodError(parsed.error);

  const configuredLogin = process.env.ADMIN_LOGIN;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  const configuredHours = Number(process.env.ADMIN_SESSION_HOURS ?? 8);
  if (!configuredLogin || !passwordHash ||
      !Number.isFinite(configuredHours) || configuredHours < 1 || configuredHours > 24 ||
      (process.env.NODE_ENV === "production" && (!sessionSecret || sessionSecret.length < 32))) {
    return apiError(503, "ADMIN_NOT_CONFIGURED", "Вход администратора не настроен");
  }

  let passwordMatches = false;
  try {
    passwordMatches = await bcrypt.compare(parsed.data.password, passwordHash);
  } catch {
    return apiError(503, "ADMIN_NOT_CONFIGURED", "Вход администратора не настроен");
  }
  if (parsed.data.login !== configuredLogin || !passwordMatches) {
    return apiError(401, "INVALID_CREDENTIALS", "Неверный логин или пароль");
  }

  const hours = boundedHours(process.env.ADMIN_SESSION_HOURS);
  const response = NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  response.cookies.set(adminCookieName, createAdminSession(configuredLogin), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: hours * 60 * 60,
  });
  return response;
}

export async function DELETE(request: Request) {
  const mutation = mutationGuard(request);
  if (mutation) return mutation;
  const response = NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  response.cookies.set(adminCookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(0),
  });
  return response;
}

function boundedHours(raw: string | undefined): number {
  const hours = Number(raw ?? 8);
  return Number.isFinite(hours) ? Math.max(1, Math.min(24, Math.floor(hours))) : 8;
}
