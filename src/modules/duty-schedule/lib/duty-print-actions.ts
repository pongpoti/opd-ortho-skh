"use server";

import { auth } from "@/auth";

import { buildDutyPrintPdfPath, createDutyPrintShareToken } from "./duty-print-share";

/**
 * Signed link to the printable duty-schedule PDF. The client opens it in the
 * external browser from LIFF, because LINE's WebView cannot save files.
 */
export async function createDutyPrintPdfLink(year: number, month: number): Promise<
  { ok: true; path: string } | { ok: false; error: string }
> {
  try {
    const session = await auth();
    if (!session?.user?.isRegistered) return { ok: false, error: "กรุณาเข้าสู่ระบบก่อนพิมพ์ตารางเวร" };
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 0 || month > 11) {
      return { ok: false, error: "เดือนหรือปีไม่ถูกต้อง" };
    }
    return { ok: true, path: buildDutyPrintPdfPath(createDutyPrintShareToken(year, month)) };
  } catch (error) {
    console.error("createDutyPrintPdfLink failed", error);
    return { ok: false, error: "สร้าง PDF ไม่สำเร็จ กรุณาลองอีกครั้ง" };
  }
}
