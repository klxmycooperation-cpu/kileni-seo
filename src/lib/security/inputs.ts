import { z } from "zod";
import { PUBLIC_AUDIT_PAGE_LIMIT } from "../../config/public-audit";

const contactSchema = z.string().trim().min(4).max(160).refine((value) => {
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
  const telegram = /^@?[a-zA-Z0-9_]{5,32}$/u.test(value);
  const phone = /^\+?[\d\s().-]{7,24}$/u.test(value);
  return email || telegram || phone;
}, "Укажите телефон, Telegram или e-mail");

export function detectContactType(value: string): "email" | "telegram" | "phone" {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value)) return "email";
  if (/^@?[a-zA-Z0-9_]{5,32}$/u.test(value) && /[a-zA-Z_]/u.test(value)) return "telegram";
  return "phone";
}

const common = {
  name: z.string().trim().min(2).max(80),
  contact: contactSchema,
  locale: z.enum(["ru", "en"]).default("ru"),
  consent: z.literal(true),
  honeypot: z.string().max(0).optional().default(""),
  turnstileToken: z.string().trim().max(2048).optional(),
};

const utmSchema = z.object({
  utm_source: z.string().trim().max(200).optional(),
  utm_medium: z.string().trim().max(200).optional(),
  utm_campaign: z.string().trim().max(200).optional(),
  utm_term: z.string().trim().max(200).optional(),
  utm_content: z.string().trim().max(200).optional(),
}).strict();

export const auditRequestSchema = z.object({
  ...common,
  url: z.string().trim().min(4).max(2048),
  authority: z.literal(true),
  // The crawler limit is server-owned. The transform safely absorbs legacy
  // clients that still send the removed page selector.
  pageLimit: z.unknown().optional().transform(() => PUBLIC_AUDIT_PAGE_LIMIT),
  source: z.string().trim().max(120).default("free-audit"),
  utm: utmSchema.optional().default({}),
});

export const leadRequestSchema = z.object({
  ...common,
  target: z.string().trim().max(2048).optional().default(""),
  service: z.string().trim().min(2).max(100),
  comment: z.string().trim().max(3000).optional().default(""),
  pageUrl: z.string().trim().max(2048).optional().default(""),
  source: z.string().trim().max(120).default("short-form"),
  utm: utmSchema.optional().default({}),
});

export const calculatorRequestSchema = z.object({
  ...common,
  kind: z.enum(["audit", "seo", "marketplaces", "development"]),
  answers: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  estimate: z.object({ min: z.number().int().nonnegative(), max: z.number().int().positive() }),
  pageUrl: z.string().trim().max(2048).optional().default(""),
  source: z.string().trim().max(120).default("calculator"),
  utm: utmSchema.optional().default({}),
});

export const briefRequestSchema = z.object({
  ...common,
  service: z.enum(["seo", "audit", "marketplaces", "development", "ads", "custom"]),
  answers: z.record(z.string(), z.union([z.string().max(3000), z.number(), z.boolean(), z.array(z.string().max(500))])),
});

export type AuditRequest = z.infer<typeof auditRequestSchema>;
export type LeadRequest = z.infer<typeof leadRequestSchema>;
export type BriefRequest = z.infer<typeof briefRequestSchema>;
