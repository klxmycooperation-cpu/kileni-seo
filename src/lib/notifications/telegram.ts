import { randomUUID } from "node:crypto";
import { sqlite } from "../../db/client";

type TelegramMessage = { entityType: string; entityId: string; text: string };

export async function notifyTelegram(message: TelegramMessage): Promise<{ sent: boolean; reason?: string }> {
  const id = randomUUID();
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const now = Date.now();
  if (!token || !chatId) {
    sqlite.prepare("INSERT INTO notification_events(id,entity_type,entity_id,channel,status,error,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)")
      .run(id, message.entityType, message.entityId, "telegram", "skipped", "not_configured", now, now);
    return { sent: false, reason: "not_configured" };
  }
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message.text.slice(0, 3500), disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`Telegram HTTP ${response.status}`);
    sqlite.prepare("INSERT INTO notification_events(id,entity_type,entity_id,channel,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)")
      .run(id, message.entityType, message.entityId, "telegram", "sent", now, Date.now());
    return { sent: true };
  } catch (error) {
    const summary = error instanceof Error ? error.message.slice(0, 240) : "telegram_failed";
    sqlite.prepare("INSERT INTO notification_events(id,entity_type,entity_id,channel,status,error,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)")
      .run(id, message.entityType, message.entityId, "telegram", "failed", summary, now, Date.now());
    return { sent: false, reason: summary };
  }
}
