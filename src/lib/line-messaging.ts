/**
 * Thin LINE Messaging API helpers (push messages to a user).
 * Requires `LINE_CHANNEL_ACCESS_TOKEN` (Messaging API long-lived channel token).
 */

const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";
const LINE_LOADING_URL = "https://api.line.me/v2/bot/chat/loading/start";

export type LinePushResult =
  | { ok: true }
  | { ok: false; error: string; status?: number };

function accessToken(): string | null {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  return token || null;
}

export function isLineMessagingConfigured(): boolean {
  return !!accessToken();
}

async function parseLineError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string };
    return body.message ? `: ${body.message}` : "";
  } catch {
    return "";
  }
}

export async function pushLineMessages(
  to: string,
  messages: Record<string, unknown>[]
): Promise<LinePushResult> {
  const token = accessToken();
  if (!token) {
    return {
      ok: false,
      error: "ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN ในเซิร์ฟเวอร์",
    };
  }
  if (!to) {
    return { ok: false, error: "ไม่พบ LINE user id" };
  }

  const res = await fetch(LINE_PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ to, messages }),
  });

  if (res.ok) return { ok: true };

  const detail = await parseLineError(res);

  if (res.status === 401 || res.status === 403) {
    return {
      ok: false,
      status: res.status,
      error: `LINE token ไม่ถูกต้องหรือหมดอายุ${detail}`,
    };
  }
  if (res.status === 400) {
    return {
      ok: false,
      status: res.status,
      error: `ส่งข้อความไม่สำเร็จ${detail} (ผู้ใช้อาจยังไม่ได้เพิ่มเพื่อน OA)`,
    };
  }
  return {
    ok: false,
    status: res.status,
    error: `ส่งข้อความ LINE ไม่สำเร็จ (${res.status})${detail}`,
  };
}

export async function pushLineImage(
  to: string,
  originalContentUrl: string,
  previewImageUrl: string,
  caption?: string
): Promise<LinePushResult> {
  const messages: Record<string, unknown>[] = [];
  if (caption) {
    messages.push({ type: "text", text: caption });
  }
  messages.push({
    type: "image",
    originalContentUrl,
    previewImageUrl,
  });
  return pushLineMessages(to, messages);
}

/**
 * Show the official LINE chat loading animation while the bot prepares a reply.
 * @see https://developers.line.biz/en/reference/messaging-api/#display-a-loading-indicator
 * `loadingSeconds` is clamped to 5–60 in steps of 5 (LINE requirement).
 */
export async function startLineChatLoading(
  chatId: string,
  loadingSeconds = 40
): Promise<LinePushResult> {
  const token = accessToken();
  if (!token) {
    return {
      ok: false,
      error: "ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN ในเซิร์ฟเวอร์",
    };
  }
  if (!chatId) {
    return { ok: false, error: "ไม่พบ LINE user id" };
  }

  const seconds = Math.min(60, Math.max(5, Math.round(loadingSeconds / 5) * 5));

  const res = await fetch(LINE_LOADING_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ chatId, loadingSeconds: seconds }),
  });

  if (res.ok) return { ok: true };

  const detail = await parseLineError(res);
  return {
    ok: false,
    status: res.status,
    error: `เริ่ม loading animation ไม่สำเร็จ (${res.status})${detail}`,
  };
}
