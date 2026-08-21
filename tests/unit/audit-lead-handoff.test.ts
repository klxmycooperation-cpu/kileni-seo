import { describe, expect, it } from "vitest";
import { readAuditLeadHandoff, saveAuditLeadHandoff } from "../../src/lib/audit/lead-handoff";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return Array.from(this.values.keys())[index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("audit lead handoff", () => {
  it("restores contact data only for the matching public audit token", () => {
    const storage = new MemoryStorage();
    saveAuditLeadHandoff(storage, {
      token: "a".repeat(43),
      name: "Анна",
      contact: "anna@example.com",
      domain: "example.com",
    }, 1_000);

    expect(readAuditLeadHandoff(storage, "a".repeat(43), 2_000)).toMatchObject({
      name: "Анна",
      contact: "anna@example.com",
      domain: "example.com",
    });
    expect(readAuditLeadHandoff(storage, "b".repeat(43), 2_000)).toBeNull();
  });

  it("rejects malformed and expired browser-only handoffs", () => {
    const storage = new MemoryStorage();
    saveAuditLeadHandoff(storage, {
      token: "a".repeat(43),
      name: "Анна",
      contact: "anna@example.com",
      domain: "example.com",
    }, 1_000);
    expect(readAuditLeadHandoff(storage, "a".repeat(43), 86_401_001)).toBeNull();

    storage.setItem("kileni:audit-lead:bad", "not-json");
    expect(readAuditLeadHandoff(storage, "bad", 2_000)).toBeNull();
  });
});
