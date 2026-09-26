"use server";

import { headers } from "next/headers";

import { auth } from "@/auth";
import {
  isLineMessagingConfigured,
  pushLineImage,
  startLineChatLoading,
} from "@/lib/line-messaging";

import { dutyPrintFilename } from "./duty-print-png";
import {
  buildDutyPrintImagePath,
  createDutyPrintShareToken,
} from "./duty-print-share";

export type DutyPrintSendResult =
  | { ok: true; filename: string }
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
 * Generate a signed A4 PNG URL for the viewed month and push it to the
 * signed-in user via LINE Messaging API (Official Account chat).
 *
 * Starts LINE's official chat loading animation first so the user sees
 * progress while Chromium renders the high-res poster and LINE fetches it.
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

  // Show LINE's built-in loading bubbles while the poster renders / is fetched.
  // Failures here are non-fatal — still attempt to send the image.
  await startLineChatLoading(lineUserId, 45);

  const token = createDutyPrintShareToken(year, month);
  const origin = await appOrigin();
  if (origin.startsWith("http://") && !origin.includes("localhost")) {
    return {
      ok: false,
      error: "URL ของแอปต้องเป็น HTTPS เพื่อส่งรูปไป LINE",
    };
  }

  const originalContentUrl = `${origin}${buildDutyPrintImagePath(token, "original")}`;
  const previewImageUrl = `${origin}${buildDutyPrintImagePath(token, "preview")}`;

  const pushed = await pushLineImage(lineUserId, originalContentUrl, previewImageUrl);

  if (!pushed.ok) return { ok: false, error: pushed.error };

  return { ok: true, filename: dutyPrintFilename(year, month) };
}
