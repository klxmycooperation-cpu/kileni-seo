const verifyEndpoint = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileResponse = {
  success?: boolean;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
};

export type TurnstileVerification =
  | { configured: false; ok: true }
  | { configured: true; ok: true; hostname?: string }
  | { configured: true; ok: false; reason: "missing-token" | "rejected" | "unavailable" };

export async function verifyTurnstile(token: string | undefined, remoteIp?: string): Promise<TurnstileVerification> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return { configured: false, ok: true };
  if (!token?.trim()) return { configured: true, ok: false, reason: "missing-token" };

  const body = new URLSearchParams({ secret, response: token.trim() });
  if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(verifyEndpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return { configured: true, ok: false, reason: "unavailable" };
    const result = await response.json() as TurnstileResponse;
    if (!result.success || (result.action && result.action !== "submit")) {
      return { configured: true, ok: false, reason: "rejected" };
    }
    const allowedHostnames = configuredHostnames();
    if (allowedHostnames.size > 0 && (!result.hostname || !allowedHostnames.has(result.hostname.toLowerCase()))) {
      return { configured: true, ok: false, reason: "rejected" };
    }
    return { configured: true, ok: true, hostname: result.hostname };
  } catch {
    return { configured: true, ok: false, reason: "unavailable" };
  } finally {
    clearTimeout(timeout);
  }
}

function configuredHostnames(): Set<string> {
  const candidates = [
    process.env.APP_BASE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ];
  const hostnames = new Set<string>();
  for (const candidate of candidates) {
    if (!candidate?.trim()) continue;
    try {
      const value = /^[a-z][a-z\d+.-]*:/iu.test(candidate) ? candidate : `https://${candidate}`;
      const hostname = new URL(value).hostname.toLowerCase();
      hostnames.add(hostname);
      hostnames.add(hostname.startsWith("www.") ? hostname.slice(4) : `www.${hostname}`);
    } catch {
      // Launch validation reports malformed public origins separately.
    }
  }
  return hostnames;
}
