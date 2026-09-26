"use server";

import { after } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/auth";
import {
  isLineMessagingConfigured,
  pushLineImage,
  pushLineMessages,
  startLineChatLoading,
} from "@/lib/line-messaging";

import { dutyPrintFilename } from "./duty-print-png";
import {
  buildDutyPrintImagePath,
  createDutyPrintShareToken,
} from "./duty-print-share";

export type DutyPrintSendResult =
  | { ok: true; filename: string; openChat: true }
  | { ok: false; error: string };

async function appOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/**
 * Kick off a duty-schedule JPEG push to the signed-in user's LINE chat.
 *
 * LINE's loading animation only appears while the user is viewing the OA chat
 * (not inside LIFF). We start the loading indicator, return immediately so the
 * client can close LIFF back to chat, then push the image in `after()`.
 *
 * originalContentUrl and previewImageUrl use the same 4× JPEG so LINE's chat
 * bubble and full-screen view are both high-res (and only one Chromium render
 * is needed when LINE dedupes the URL).
 */
export async function sendDutySchedulePrint(
  year: number,
  month: number
): Promise<DutyPrintSendResult> {
  const session = await auth();
  if (!session?.user?.isRegistered || !session.user.lineUserId) {
    return { ok: false, error: "กรุณาเข้าสู่ระบบก่อนพิมพ์ตารางเวร" };
  }

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 0 || month > 11) {
    return { ok: false, error: "เดือนหรือปีไม่ถูกต้อง" };
  }

  if (!isLineMessagingConfigured()) {
    return {
      ok: false,
      error:
        "ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN บนเซิร์ฟเวอร์ — แจ้งแอดมินให้เพิ่มใน Vercel",
    };
  }

  const lineUserId = session.user.lineUserId;
  const origin = await appOrigin();
  if (origin.startsWith("http://") && !origin.includes("localhost")) {
    return {
      ok: false,
      error: "URL ของแอปต้องเป็น HTTPS เพื่อส่งรูปไป LINE",
    };
  }

  // Show LINE's built-in loading bubbles in the OA chat (visible once LIFF closes).
  await startLineChatLoading(lineUserId, 60);

  const token = createDutyPrintShareToken(year, month);
  // Same high-res JPEG for original + preview (≤ 1 MB @ 4× quality 88).
  const imageUrl = `${origin}${buildDutyPrintImagePath(token, "original")}`;
  const filename = dutyPrintFilename(year, month);

  after(async () => {
    try {
      const pushed = await pushLineImage(lineUserId, imageUrl, imageUrl);
      if (!pushed.ok) {
        await pushLineMessages(lineUserId, [
          {
            type: "text",
            text: `สร้างตารางเวรไม่สำเร็จ: ${pushed.error}`,
          },
        ]);
      }
    } catch (err) {
      console.error("duty-schedule deferred print failed", err);
      await pushLineMessages(lineUserId, [
        {
          type: "text",
          text: "สร้างตารางเวรไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
        },
      ]);
    }
  });

  return { ok: true, filename, openChat: true };
}
