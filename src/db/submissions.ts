import { randomUUID } from "node:crypto";
import { sqlite } from "./client";
import type { BriefRequest, LeadRequest } from "../lib/security/inputs";
import { detectContactType } from "../lib/security/inputs";

export function createLead(input: LeadRequest, ipHash: string): string {
  const id = randomUUID();
  sqlite.prepare(`INSERT INTO leads(id,name,contact,contact_type,target,service,comment,status,locale,source,page_url,utm_json,consent_version,ip_hash,created_at)
    VALUES (?,?,?,?,?,?,?,'new',?,?,?,?,?,?,?)`).run(id, input.name, input.contact, detectContactType(input.contact), input.target, input.service,
      input.comment, input.locale, input.source, input.pageUrl, JSON.stringify(input.utm), process.env.LEGAL_POLICY_VERSION ?? "2026-08-15", ipHash, Date.now());
  return id;
}

export function createCalculatorRequest(input: {
  leadId?: string; kind: string; answers: Record<string, unknown>; min: number; max: number;
}): string {
  const id = randomUUID();
  sqlite.prepare("INSERT INTO calculator_requests(id,lead_id,kind,answers_json,min_price,max_price,created_at) VALUES (?,?,?,?,?,?,?)")
    .run(id, input.leadId ?? null, input.kind, JSON.stringify(input.answers), input.min, input.max, Date.now());
  return id;
}

export function createBrief(input: BriefRequest, ipHash: string): string {
  const id = randomUUID();
  sqlite.prepare(`INSERT INTO brief_submissions(id,name,contact,locale,service,answers_json,status,consent_version,ip_hash,created_at)
    VALUES (?,?,?,?,?,?,'new',?,?,?)`).run(id, input.name, input.contact, input.locale, input.service, JSON.stringify(input.answers),
      process.env.LEGAL_POLICY_VERSION ?? "2026-08-15", ipHash, Date.now());
  return id;
}

export function listLeads(limit = 100) {
  return sqlite.prepare("SELECT id,name,contact,contact_type AS contactType,target,service,status,locale,source,created_at AS createdAt FROM leads ORDER BY created_at DESC LIMIT ?").all(Math.min(limit, 200));
}

export function listBriefs(limit = 100) {
  return sqlite.prepare("SELECT id,name,contact,locale,service,status,answers_json AS answersJson,created_at AS createdAt FROM brief_submissions ORDER BY created_at DESC LIMIT ?").all(Math.min(limit, 200));
}
