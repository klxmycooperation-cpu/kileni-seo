import { NextResponse } from "next/server";

import { createCsrfToken, csrfCookieName } from "../../../src/lib/security/csrf";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const token = createCsrfToken();
  const response = NextResponse.json({ token });
  response.cookies.set(csrfCookieName, token, {
    httpOnly: true,
    secure: requiresSecureCookie(request),
    sameSite: "strict",
    path: "/",
    maxAge: 2 * 60 * 60,
  });
  response.headers.set("cache-control", "private, no-store, max-age=0");
  response.headers.set("pragma", "no-cache");
  return response;
}

function requiresSecureCookie(request: Request): boolean {
  const url = new URL(request.url);
  if (url.protocol === "https:") return true;
  if (url.protocol !== "http:") return true;

  const forwardedProtocol = request.headers.get("x-forwarded-proto");
  if (forwardedProtocol !== null) {
    const protocols = forwardedProtocol
      .split(",")
      .map((value) => value.trim().toLowerCase());

    // A proxy header is only used to make the cookie stricter. Ambiguous,
    // HTTPS, or malformed values fail closed instead of disabling Secure.
    if (protocols.length === 0 || protocols.some((value) => value !== "http")) {
      return true;
    }
  }

  // The standalone server can bind to 0.0.0.0, so request.url is not a
  // reliable indication of the browser host. Plain HTTP is supported solely
  // when the actual Host header is loopback; public hosts keep Secure.
  const hostHeader = request.headers.get("host");
  if (!hostHeader) return true;
  const headerHostname = hostnameFromHostHeader(hostHeader);
  return !headerHostname || !isLoopbackHostname(headerHostname);
}

function hostnameFromHostHeader(host: string): string | null {
  if (!host || host !== host.trim()) return null;

  const ipv6 = host.match(/^\[([0-9a-f:]+)\](?::([0-9]{1,5}))?$/iu);
  if (ipv6) return isValidPort(ipv6[2]) ? ipv6[1] : null;

  const regular = host.match(/^([a-z0-9.-]+)(?::([0-9]{1,5}))?$/iu);
  if (!regular || !isValidPort(regular[2])) return null;
  return regular[1];
}

function isValidPort(port: string | undefined): boolean {
  if (port === undefined) return true;
  return Number(port) <= 65_535;
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/gu, "");
  if (normalized === "localhost" || normalized.endsWith(".localhost") || normalized === "::1") {
    return true;
  }
  return /^127(?:\.\d{1,3}){3}$/u.test(normalized);
}
