const HANDOFF_PREFIX = "kileni:audit-lead:";
const HANDOFF_TTL_MS = 24 * 60 * 60 * 1_000;
const PUBLIC_TOKEN = /^[A-Za-z0-9_-]{43}$/u;

export type AuditLeadHandoff = {
  token: string;
  name: string;
  contact: string;
  domain: string;
  createdAt: number;
};

type NewAuditLeadHandoff = Omit<AuditLeadHandoff, "createdAt">;

export function normalizeAuditDomain(value: string): string {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./u, "");
  } catch {
    return "";
  }
}

export function saveAuditLeadHandoff(storage: Storage, input: NewAuditLeadHandoff, now = Date.now()): void {
  if (!PUBLIC_TOKEN.test(input.token)) return;
  const value: AuditLeadHandoff = {
    token: input.token,
    name: input.name.trim().slice(0, 80),
    contact: input.contact.trim().slice(0, 160),
    domain: input.domain.trim().toLowerCase().slice(0, 253),
    createdAt: now,
  };
  try {
    storage.setItem(`${HANDOFF_PREFIX}${input.token}`, JSON.stringify(value));
  } catch {
    // Handoff is a convenience only; private browsing and storage policies may block it.
  }
}

export function readAuditLeadHandoff(storage: Storage, token: string, now = Date.now()): AuditLeadHandoff | null {
  if (!PUBLIC_TOKEN.test(token)) return null;
  const key = `${HANDOFF_PREFIX}${token}`;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<AuditLeadHandoff>;
    const valid = value.token === token
      && typeof value.name === "string"
      && typeof value.contact === "string"
      && typeof value.domain === "string"
      && typeof value.createdAt === "number"
      && Number.isFinite(value.createdAt)
      && value.createdAt <= now
      && now - value.createdAt <= HANDOFF_TTL_MS;
    if (!valid) {
      storage.removeItem(key);
      return null;
    }
    return value as AuditLeadHandoff;
  } catch {
    storage.removeItem(key);
    return null;
  }
}
