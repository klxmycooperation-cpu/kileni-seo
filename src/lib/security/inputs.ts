import { z } from "zod";
import { PUBLIC_AUDIT_PAGE_LIMIT } from "../../config/public-audit";
import { getOffer } from "../../config/offers";
import { isNewPublicContact, newPublicContactType, type NewPublicContactType } from "../contact";

const contactSchema = z.string().trim().min(4).max(160)
  .refine(isNewPublicContact, "Укажите корректный e-mail");

const optionalAuditEmailSchema = z.string().trim().max(160).refine(
  (value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value),
  "Укажите корректный e-mail",
).optional().default("");

export function detectContactType(value: string): NewPublicContactType {
  const type = newPublicContactType(value);
  if (!type) throw new TypeError("Контакт должен содержать корректный e-mail");
  return type;
}

const common = {
  name: z.string().trim().min(2).max(80),
  contact: contactSchema,
  locale: z.literal("ru").default("ru"),
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
  url: z.string().trim().min(4).max(2048),
  priorityUrls: z.array(z.string().trim().min(1).max(2048)).max(3).optional().default([]),
  email: optionalAuditEmailSchema,
  locale: z.literal("ru").default("ru"),
  consent: z.boolean().optional().default(false),
  authority: z.literal(true),
  honeypot: z.string().max(0).optional().default(""),
  turnstileToken: z.string().trim().max(2048).optional(),
  // The crawler limit is server-owned. The transform safely absorbs legacy
  // clients that still send the removed page selector.
  pageLimit: z.unknown().optional().transform(() => PUBLIC_AUDIT_PAGE_LIMIT),
  forceFresh: z.boolean().optional().default(false),
  source: z.string().trim().max(120).default("free-audit"),
  utm: utmSchema.optional().default({}),
}).strict().superRefine((value, context) => {
  if (value.email && value.consent !== true) {
    context.addIssue({
      code: "custom",
      path: ["consent"],
      message: "Для отправки отчёта по email нужно согласие на обработку этого адреса",
    });
  }
});

export const leadRequestSchema = z.object({
  ...common,
  target: z.string().trim().max(2048).optional().default(""),
  service: z.string().trim().min(2).max(100),
  offerId: z.string().trim().max(120).optional(),
  comment: z.string().trim().max(3000).optional().default(""),
  pageUrl: z.string().trim().max(2048).optional().default(""),
  source: z.string().trim().max(120).default("short-form"),
  utm: utmSchema.optional().default({}),
}).refine((value) => !value.offerId || getOffer(value.offerId)?.service === value.service, {
  path: ["offerId"], message: "Выбранный тариф не соответствует услуге",
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
  offerId: z.string().trim().min(1).max(120).optional(),
  answers: z.record(z.string(), z.union([z.string().max(3000), z.number(), z.boolean(), z.array(z.string().max(500))])),
});

export type AuditRequest = z.infer<typeof auditRequestSchema>;
export type LeadRequest = z.infer<typeof leadRequestSchema>;
export type BriefRequest = z.infer<typeof briefRequestSchema>;
