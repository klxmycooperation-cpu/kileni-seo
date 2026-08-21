import { randomBytes, timingSafeEqual } from "node:crypto";

export const csrfCookieName = "kileni_csrf";

export function createCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

export function verifyCsrf(request: Request): boolean {
  const header = request.headers.get("x-csrf-token") ?? "";
  const cookie = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${csrfCookieName}=`))?.slice(csrfCookieName.length + 1) ?? "";
  if (!header || !cookie) return false;
  const left = Buffer.from(header);
  const right = Buffer.from(cookie);
  return left.length === right.length && timingSafeEqual(left, right);
}
