export class AuditUrlError extends Error {
  readonly code = "INVALID_TARGET_URL";

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AuditUrlError";
  }
}

const WEB_PROTOCOLS = new Set(["http:", "https:"]);
const WEB_PORTS = new Set(["", "80", "443"]);

/**
 * Turns user input into one canonical web URL. WHATWG URL parsing is
 * intentionally used here: besides IDN-to-ASCII conversion it canonicalizes
 * legacy IPv4 spellings (integer, hexadecimal and octal) before SSRF checks.
 */
export function normalizeTargetUrl(input: string | URL): URL {
  const raw = input instanceof URL ? input.href : input.trim();
  if (raw.length === 0) {
    throw new AuditUrlError("Адрес сайта не указан");
  }

  const withProtocol = hasExplicitScheme(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch (cause) {
    throw new AuditUrlError("Некорректный URL", { cause });
  }

  if (!WEB_PROTOCOLS.has(url.protocol)) {
    throw new AuditUrlError("Допустимы только HTTP и HTTPS");
  }
  if (!url.hostname) {
    throw new AuditUrlError("URL должен содержать имя хоста");
  }
  if (!WEB_PORTS.has(url.port)) {
    throw new AuditUrlError("Допустимы только порты 80 и 443");
  }
  if (url.username || url.password) {
    throw new AuditUrlError("Credentials в URL не допустимы");
  }

  // A trailing dot does not change DNS meaning, but stripping it gives all
  // hostname deny-list checks a single representation.
  const hostname = url.hostname.endsWith(".")
    ? url.hostname.slice(0, -1)
    : url.hostname;
  url.hostname = hostname.toLowerCase();
  url.hash = "";
  return url;
}

function hasExplicitScheme(value: string): boolean {
  // A bare authority such as example.com:80 must not be mistaken for a
  // custom `example.com:` scheme.
  if (/^[^/?#]+:\d+(?:[/?#]|$)/.test(value)) return false;
  return /^[a-z][a-z\d+.-]*:/i.test(value);
}

export function sameHostname(left: string | URL, right: string | URL): boolean {
  return normalizeTargetUrl(left).hostname === normalizeTargetUrl(right).hostname;
}

/** Cache/rate-limit key for one site mirror; fetch URLs keep their real host. */
export function normalizeAuditDomain(hostname: string): string {
  const normalized = hostname.trim().toLowerCase().replace(/\.$/u, "");
  return normalized.startsWith("www.") ? normalized.slice(4) : normalized;
}
