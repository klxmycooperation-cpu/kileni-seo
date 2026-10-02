import { randomUUID } from "node:crypto";
import { z } from "zod";

import { database } from "@/src/db/client";
import { sendEmail } from "./email";
import { notifyTelegram } from "./telegram";

type SubmissionNotification = { entityType: string; entityId: string; text: string };

export function adminNotificationEmailConfigured(): boolean {
  return Boolean(recipient() && [process.env.SMTP_HOST, process.env.SMTP_USER, process.env.SMTP_PASSWORD, process.env.SMTP_FROM].every((value) => value?.trim()));
}

// Each channel runs independently; an unavailable Telegram must not prevent email.
export async function notifySubmission(message: SubmissionNotification): Promise<void> {
  await Promise.allSettled([notifyTelegram(message), notifyAdminEmail(message)]);
}

async function notifyAdminEmail(message: SubmissionNotification): Promise<void> {
  const to = recipient();
  const result = to
    ? await sendEmail({ to, subject: `KILENI: ${message.text.split("\n")[0].replace(/[\r\n]/gu, " ").slice(0, 100)}`, text: message.text })
    : { sent: false, reason: "missing_recipient" };
  const now = Date.now();
  await database.execute({
    sql: "INSERT INTO notification_events(id,entity_type,entity_id,channel,status,error,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)",
    args: [randomUUID(), message.entityType, message.entityId, "admin_email", result.sent ? "sent" : ["missing_recipient", "not_configured"].includes(result.reason ?? "") ? "skipped" : "failed", result.reason ?? null, now, now],
  });
}

function recipient(): string | null {
  const parsed = z.email().safeParse(process.env.ADMIN_NOTIFICATION_EMAIL?.trim());
  return parsed.success ? parsed.data : null;
}
