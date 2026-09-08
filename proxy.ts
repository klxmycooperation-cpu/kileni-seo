import { NextResponse, type NextRequest } from "next/server";
import { THEME_BOOTSTRAP } from "./src/components/layout/theme-config";

const development = process.env.NODE_ENV === "development";

function isHttpsRequest(request: NextRequest): boolean {
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",", 1)[0]?.trim();
  return forwardedProtocol === "https" || request.nextUrl.protocol === "https:";
}

function contentSecurityPolicy(request: NextRequest): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com`,
    "frame-src https://challenges.cloudflare.com",
    "connect-src 'self' https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
    ...(!development && isHttpsRequest(request) ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const locale = request.nextUrl.pathname === "/en" || request.nextUrl.pathname.startsWith("/en/") ? "en" : "ru";
  requestHeaders.set("x-kileni-locale", locale);
  const auditPage = auditPageToken(request.nextUrl.pathname);
  if (auditPage) {
    const tokenValid = /^[A-Za-z0-9_-]{43}$/u.test(auditPage.token);
    if (!tokenValid) return secureResponse(auditErrorPage(locale, 400), request);

    const statusUrl = new URL(`/api/audits/${encodeURIComponent(auditPage.token)}`, request.url);
    const restore = request.nextUrl.searchParams.get("restore");
    if (restore && restore.length <= 20_000) statusUrl.searchParams.set("restore", restore);
    try {
      const status = await fetch(statusUrl, { cache: "no-store", headers: { accept: "application/json" } });
      if (status.status === 400 || status.status === 404) {
        return secureResponse(auditErrorPage(locale, status.status), request);
      }
    } catch {
      // Let the page render its retry state when storage or the internal API is temporarily unavailable.
    }
  }
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  return secureResponse(response, request);
}

function secureResponse(response: NextResponse, request: NextRequest): NextResponse {
  response.headers.set("Content-Security-Policy", contentSecurityPolicy(request));
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=() ");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  return response;
}

function auditPageToken(pathname: string): { token: string } | null {
  const match = pathname.match(/^\/(?:en\/)?audit\/([^/]+)\/?$/u);
  return match?.[1] ? { token: match[1] } : null;
}

function auditErrorPage(locale: "ru" | "en", status: 400 | 404): NextResponse {
  const ru = locale === "ru";
  const notFound = status === 404;
  const title = notFound
    ? (ru ? "Проверка не найдена" : "Audit not found")
    : (ru ? "Некорректная ссылка" : "Invalid audit link");
  const explanation = notFound
    ? (ru ? "Ссылка неверна или срок хранения результата закончился." : "The link is invalid or the result has expired.")
    : (ru ? "В адресе отчёта повреждён идентификатор проверки." : "The audit identifier in this link is malformed.");
  const homeHref = ru ? "/" : "/en";
  const auditHref = ru ? "/free-audit" : "/en/free-audit";
  const homeLabel = ru ? "На главную" : "Home";
  const auditLabel = ru ? "Новая проверка" : "New check";
  const html = `<!doctype html><html lang="${locale}" data-kileni-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>${title} — KILENI</title><style>
  :root{color-scheme:dark;font-family:Arial,sans-serif;background:#07111f;color:#f7f9ff}*{box-sizing:border-box}body{margin:0;background:#07111f;color:#f7f9ff}html[data-kileni-theme=light]{color-scheme:light;background:#f5f7fb;color:#111827}html[data-kileni-theme=light] body{background:#f5f7fb;color:#111827}html[data-kileni-theme=signal] body{background:#0b1020;color:#fff}.bar{display:flex;min-height:76px;align-items:center;justify-content:space-between;padding:0 clamp(20px,5vw,72px);border-bottom:1px solid #2a3648}.brand{font-size:1.25rem;font-weight:750;letter-spacing:-.04em}.brand small{margin-left:.35rem;color:#6f8dff;font-size:.65rem}.page{display:grid;min-height:calc(100svh - 77px);place-content:center;padding:32px;text-align:center}.code{margin:0 0 18px;color:#92a0b5;font:700 .72rem/1.4 ui-monospace,monospace;letter-spacing:.12em}.page h1{max-width:850px;margin:0 auto 18px;font-size:clamp(2.6rem,7vw,6rem);line-height:1}.page p{max-width:680px;margin:0 auto;color:#aeb9ca;font-size:clamp(1rem,2vw,1.2rem)}.actions{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin-top:28px}.actions a{display:inline-flex;min-height:50px;align-items:center;justify-content:center;padding:0 22px;border:1px solid #dce4ef;color:inherit;text-decoration:none}.actions a:first-child{background:#f7f9ff;color:#0b1220}@media(max-width:520px){.actions a{width:100%}}
  </style><script>${THEME_BOOTSTRAP}</script></head><body><header class="bar"><a class="brand" href="${homeHref}">KILENI<small>seo</small></a><span>${status}</span></header><main id="main-content" class="page"><div><p class="code">ERROR · ${status}</p><h1>${title}</h1><p>${explanation}</p><div class="actions"><a href="${homeHref}">${homeLabel}</a><a href="${auditHref}">${auditLabel}</a></div></div></main></body></html>`;
  return new NextResponse(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store, max-age=0",
      "x-robots-tag": "noindex, nofollow, noarchive",
    },
  });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.svg).*)"] };
