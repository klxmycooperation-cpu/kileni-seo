import { createHmac, timingSafeEqual } from "node:crypto";

export const adminCookieName = "kileni_admin";
type SessionPayload = { login: string; exp: number };

const secret = () => {
  const configured = process.env.ADMIN_SESSION_SECRET;
  if (process.env.NODE_ENV === "production") return configured && configured.length >= 32 ? configured : null;
  return configured ?? "development-session-secret-change-me";
};
const sign = (payload: string, key: string) => createHmac("sha256", key).update(payload).digest("base64url");

export function createAdminSession(login: string): string {
  const key = secret();
  if (!key) throw new Error("ADMIN_SESSION_SECRET is not configured");
  const hours = Number(process.env.ADMIN_SESSION_HOURS ?? 8);
  const payload = Buffer.from(JSON.stringify({ login, exp: Date.now() + hours * 3_600_000 } satisfies SessionPayload)).toString("base64url");
  return `${payload}.${sign(payload, key)}`;
}

export function verifyAdminSession(token?: string): SessionPayload | null {
  const key = secret();
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
