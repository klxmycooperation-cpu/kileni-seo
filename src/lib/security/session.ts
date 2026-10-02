import { createHmac, timingSafeEqual } from "node:crypto";

export const adminCookieName = "kileni_admin";
type SessionPayload = { login: string; exp: number };

export function configuredAdminPasswordHash(): string | null {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) return null;
  if (process.env.NODE_ENV === "production"
    && !/^\$2[aby]\$(?:10|11|12|13|14)\$[./A-Za-z0-9]{53}$/u.test(hash)) return null;
  return hash;
}

export function configuredAdminSessionSecret(): string | null {
  const configured = process.env.ADMIN_SESSION_SECRET;
  if (process.env.NODE_ENV === "production") {
    return configured && Buffer.byteLength(configured, "utf8") >= 32
      && !/replace-with|change-me|example|placeholder/iu.test(configured) ? configured : null;
  }
  return configured ?? "development-session-secret-change-me";
}
const sign = (payload: string, key: string) => createHmac("sha256", key).update(payload).digest("base64url");

export function createAdminSession(login: string): string {
  const key = configuredAdminSessionSecret();
  if (!key) throw new Error("ADMIN_SESSION_SECRET is not configured");
  const hours = Number(process.env.ADMIN_SESSION_HOURS ?? 8);
  const payload = Buffer.from(JSON.stringify({ login, exp: Date.now() + hours * 3_600_000 } satisfies SessionPayload)).toString("base64url");
  return `${payload}.${sign(payload, key)}`;
}

export function verifyAdminSession(token?: string): SessionPayload | null {
  const key = configuredAdminSessionSecret();
  if (!key) return null;
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload, key);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionPayload;
    return parsed.exp > Date.now() ? parsed : null;
  } catch { return null; }
}

export function cookieValue(cookieHeader: string | null, name: string): string | undefined {
  return cookieHeader?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}
