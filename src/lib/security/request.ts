import { createHmac } from "node:crypto";

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export function privateHash(value: string): string {
  const salt = process.env.IP_HASH_SALT ?? "development-only-change-before-production";
  return createHmac("sha256", salt).update(value).digest("hex");
}

export function sanitizeLogValue(value: unknown): string {
  return String(value ?? "").replace(/[\r\n\t]/gu, " ").slice(0, 240);
}

export function requestOriginIsAllowed(request: Request): boolean {
  const originHeader = request.headers.get("origin");
  if (!originHeader) return process.env.NODE_ENV !== "production";

  let origin: URL;
  try {
    origin = new URL(originHeader);
  } catch {
    return false;
  }

  const configured = originFromUrl(process.env.APP_BASE_URL);
  if (configured && origin.origin === configured) return true;
  if (origin.origin === new URL(request.url).origin) return true;

  // A standalone Next server commonly binds to 0.0.0.0, so request.url can
  // expose that internal address even though the browser is on 127.0.0.1 or
  // localhost. Only bridge that mismatch for an exact loopback Host/Origin
  // pair; arbitrary public Host headers never become trusted origins.
  return loopbackOriginMatchesHost(origin, request.headers.get("host"));
}

function originFromUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function loopbackOriginMatchesHost(origin: URL, host: string | null): boolean {
  if (!host || /[\s/@?#]/u.test(host)) return false;

  let requestedHost: URL;
  try {
    requestedHost = new URL(`http://${host}`);
  } catch {
    return false;
  }

  return isLoopbackHostname(origin.hostname)
    && isLoopbackHostname(requestedHost.hostname)
    && origin.hostname.toLowerCase() === requestedHost.hostname.toLowerCase()
    && origin.port === requestedHost.port;
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return normalized === "localhost"
    || normalized.endsWith(".localhost")
    || normalized === "::1"
    || /^127(?:\.\d{1,3}){3}$/u.test(normalized);
}
