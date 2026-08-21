import { lookup } from "node:dns/promises";

import ipaddr from "ipaddr.js";

import { normalizeTargetUrl } from "./url";

export type IpFamily = 4 | 6;

export interface ResolvedAddress {
  readonly address: string;
  readonly family: IpFamily;
}

export interface DnsResolver {
  resolve(hostname: string): Promise<readonly ResolvedAddress[]>;
}

export const systemDnsResolver: DnsResolver = {
  async resolve(hostname) {
    const answers = await lookup(hostname, { all: true, verbatim: true });
    return answers.flatMap((answer) =>
      answer.family === 4 || answer.family === 6
        ? [{ address: answer.address, family: answer.family }]
        : [],
    );
  },
};

export type SsrfErrorCode =
  | "BLOCKED_HOSTNAME"
  | "BLOCKED_ADDRESS"
  | "DNS_EMPTY"
  | "DNS_FAILED";

export class SsrfProtectionError extends Error {
  constructor(
    readonly code: SsrfErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "SsrfProtectionError";
  }
}

export interface ValidatedTarget {
  readonly url: URL;
  readonly addresses: readonly ResolvedAddress[];
}

const LOCAL_SUFFIXES = [
  ".localhost",
  ".local",
  ".localdomain",
  ".internal",
  ".intranet",
  ".lan",
  ".home",
  ".home.arpa",
  ".test",
  ".invalid",
  ".onion",
] as const;

export function isLocalHostname(hostname: string): boolean {
  const normalized = stripAddressBrackets(hostname).replace(/\.$/, "").toLowerCase();
  if (!normalized || normalized === "localhost" || normalized.includes("%")) {
    return true;
  }
  if (!normalized.includes(".") && !normalized.includes(":")) {
    return true;
  }
  return LOCAL_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}

/** True only for globally routable unicast IPs. */
export function isPublicIpAddress(rawAddress: string): boolean {
  const address = stripAddressBrackets(rawAddress);
  if (!ipaddr.isValid(address)) {
    return false;
  }

  const parsed = ipaddr.parse(address);
  if (parsed instanceof ipaddr.IPv4) {
    return parsed.range() === "unicast";
  }
  if (parsed.isIPv4MappedAddress()) {
    return parsed.toIPv4Address().range() === "unicast";
  }

  // Transition mechanisms can encapsulate a private IPv4 destination. They
  // are deliberately excluded even if the outer IPv6 address is routable.
  return parsed.range() === "unicast";
}

export async function assertPublicUrl(
  input: string | URL,
  resolver: DnsResolver = systemDnsResolver,
): Promise<ValidatedTarget> {
  const url = normalizeTargetUrl(input);
  const hostname = stripAddressBrackets(url.hostname);

  if (isLocalHostname(hostname)) {
    throw new SsrfProtectionError(
      "BLOCKED_HOSTNAME",
      `Локальное имя хоста запрещено: ${hostname}`,
    );
  }

  if (ipaddr.isValid(hostname)) {
    if (!isPublicIpAddress(hostname)) {
      throw new SsrfProtectionError(
        "BLOCKED_ADDRESS",
        `Непубличный IP-адрес запрещён: ${hostname}`,
      );
    }
    return {
      url,
      addresses: [{ address: ipaddr.parse(hostname).toString(), family: ipaddr.parse(hostname).kind() === "ipv4" ? 4 : 6 }],
    };
  }

  let answers: readonly ResolvedAddress[];
  try {
    answers = await resolver.resolve(hostname);
  } catch (cause) {
    throw new SsrfProtectionError("DNS_FAILED", `DNS не разрешил хост ${hostname}`, {
      cause,
    });
  }
  if (answers.length === 0) {
    throw new SsrfProtectionError("DNS_EMPTY", `DNS не вернул адреса для ${hostname}`);
  }

  const unique = deduplicateAnswers(answers);
  for (const answer of unique) {
    if (!isPublicIpAddress(answer.address)) {
      throw new SsrfProtectionError(
        "BLOCKED_ADDRESS",
        `DNS вернул непубличный IP-адрес: ${answer.address}`,
      );
    }
  }
  return { url, addresses: unique };
}

function deduplicateAnswers(
  answers: readonly ResolvedAddress[],
): readonly ResolvedAddress[] {
  const seen = new Set<string>();
  const unique: ResolvedAddress[] = [];
  for (const answer of answers) {
    const address = stripAddressBrackets(answer.address);
    const key = `${answer.family}:${address}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push({ address, family: answer.family });
    }
  }
  return unique;
}

function stripAddressBrackets(value: string): string {
  return value.startsWith("[") && value.endsWith("]") ? value.slice(1, -1) : value;
}
