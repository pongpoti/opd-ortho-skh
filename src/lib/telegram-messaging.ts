/**
 * Thin Telegram Bot API helpers for admin alerts.
 * Requires `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.
 */

const TELEGRAM_API = "https://api.telegram.org";

export type TelegramSendResult =
  | { ok: true }
  | { ok: false; error: string; status?: number };

export type NewUserRegistrationAlert = {
  firstName: string;
  lastName: string;
  position: "doctor" | "nurse";
  lineUserId: string;
  lineDisplayName?: string | null;
  registeredAt?: Date;
};

function botToken(): string | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return token || null;
}

function alertChatId(): string | null {
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  return chatId || null;
}

export function isTelegramAlertConfigured(): boolean {
  return !!botToken() && !!alertChatId();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function positionLabel(position: "doctor" | "nurse"): string {
  return position === "doctor" ? "แพทย์" : "พยาบาล";
}

function formatBangkokTime(date: Date): string {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/**
 * HTML message layout sent to TELEGRAM_CHAT_ID on successful registration.
 *
 * Example (Telegram HTML parse mode):
 *
 *   🆕 <b>ผู้ใช้ใหม่ลงทะเบียน</b>
 *
 *   <b>ชื่อ</b>: นพ.สมชาย ใจดี
 *   <b>ตำแหน่ง</b>: แพทย์
 *   <b>LINE</b>: Somchai J
 *   <b>LINE ID</b>: <code>Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</code>
 *   <b>เวลา</b>: 27 ก.ย. 2569 12:34
 */
export function formatNewUserRegistrationMessage(
  alert: NewUserRegistrationAlert
): string {
  const when = alert.registeredAt ?? new Date();
  const lineName = alert.lineDisplayName?.trim() || "—";

  return [
    "🆕 <b>ผู้ใช้ใหม่ลงทะเบียน</b>",
    "",
    `<b>ชื่อ</b>: ${escapeHtml(`${alert.firstName} ${alert.lastName}`)}`,
    `<b>ตำแหน่ง</b>: ${escapeHtml(positionLabel(alert.position))}`,
    `<b>LINE</b>: ${escapeHtml(lineName)}`,
    `<b>LINE ID</b>: <code>${escapeHtml(alert.lineUserId)}</code>`,
    `<b>เวลา</b>: ${escapeHtml(formatBangkokTime(when))}`,
  ].join("\n");
}

async function parseTelegramError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { description?: string };
    return body.description ? `: ${body.description}` : "";
  } catch {
    return "";
  }
}

export async function sendTelegramMessage(
  text: string,
  options?: { parseMode?: "HTML" | "MarkdownV2" }
): Promise<TelegramSendResult> {
  const token = botToken();
  const chatId = alertChatId();

  if (!token) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN is not configured" };
  }
  if (!chatId) {
    return { ok: false, error: "TELEGRAM_CHAT_ID is not configured" };
  }

  const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: options?.parseMode ?? "HTML",
      disable_web_page_preview: true,
    }),
  });

  if (res.ok) return { ok: true };

  const detail = await parseTelegramError(res);
  return {
    ok: false,
    status: res.status,
    error: `Telegram send failed (${res.status})${detail}`,
  };
}

export async function sendNewUserRegistrationAlert(
  alert: NewUserRegistrationAlert
): Promise<TelegramSendResult> {
  if (!isTelegramAlertConfigured()) {
    return {
      ok: false,
      error: "Telegram alerts are not configured (token/chat id missing)",
    };
  }

  return sendTelegramMessage(formatNewUserRegistrationMessage(alert), {
    parseMode: "HTML",
  });
}
