import { randomUUID } from "node:crypto";

import { database } from "./client";
import type { BriefRequest, LeadRequest } from "../lib/security/inputs";
import { detectContactType } from "../lib/security/inputs";
import { siteConfig } from "../config/site";
import { formatOfferPrice, getOffer, localizedOffer } from "../config/offers";

type SubmissionConnection = Pick<typeof database, "execute">;

export function leadComment(input: LeadRequest): string {
  const offer = input.offerId ? getOffer(input.offerId) : undefined;
  if (!offer || offer.service !== input.service) return input.comment;
  const copy = localizedOffer(offer, "ru");
  return [
    `Выбранный вариант: ${copy.title} (${offer.id})`,
    `Стоимость: ${formatOfferPrice(offer, "ru")}`,
    `Объём: ${copy.scope}`,
    `Срок: ${copy.duration}`,
    input.comment,
  ].filter(Boolean).join("\n");
}

export async function createLead(input: LeadRequest, ipHash: string, connection: SubmissionConnection = database): Promise<string> {
  const id = randomUUID();
  await connection.execute({
    sql: `INSERT INTO leads(id,name,contact,contact_type,target,service,comment,status,locale,source,page_url,utm_json,consent_version,ip_hash,created_at)
      VALUES (?,?,?,?,?,?,?,'new',?,?,?,?,?,?,?)`,
    args: [id, input.name, input.contact, detectContactType(input.contact), input.target, input.service,
      leadComment(input), input.locale, input.source, input.pageUrl, JSON.stringify(input.utm), siteConfig.legal.version, ipHash, Date.now()],
  });
  return id;
}

export async function createCalculatorRequest(input: {
  leadId?: string; kind: string; answers: Record<string, unknown>; min: number; max: number;
}, connection: SubmissionConnection = database): Promise<string> {
  const id = randomUUID();
  await connection.execute({
    sql: "INSERT INTO calculator_requests(id,lead_id,kind,answers_json,min_price,max_price,created_at) VALUES (?,?,?,?,?,?,?)",
    args: [id, input.leadId ?? null, input.kind, JSON.stringify(input.answers), input.min, input.max, Date.now()],
  });
  return id;
}

export async function createBrief(input: BriefRequest, ipHash: string, connection: SubmissionConnection = database): Promise<string> {
  const id = randomUUID();
  await connection.execute({
    sql: `INSERT INTO brief_submissions(id,name,contact,locale,service,answers_json,status,consent_version,ip_hash,created_at)
      VALUES (?,?,?,?,?,?,'new',?,?,?)`,
    args: [id, input.name, input.contact, input.locale, input.service, JSON.stringify(input.answers),
      siteConfig.legal.version, ipHash, Date.now()],
  });
  return id;
}

export async function listLeads(limit = 100) {
  const result = await database.execute({
    sql: "SELECT id,name,contact,contact_type AS contactType,target,service,status,locale,source,created_at AS createdAt FROM leads ORDER BY created_at DESC LIMIT ?",
    args: [Math.min(limit, 200)],
  });
  return result.rows;
}

export async function listBriefs(limit = 100) {
  const result = await database.execute({
    sql: "SELECT id,name,contact,locale,service,status,answers_json AS answersJson,created_at AS createdAt FROM brief_submissions ORDER BY created_at DESC LIMIT ?",
    args: [Math.min(limit, 200)],
  });
  return result.rows;
}
