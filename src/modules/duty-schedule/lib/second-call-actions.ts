"use server";

import { auth } from "@/auth";
import { createSecondCallToken, validSecondCallMonth } from "./second-call-share";

export async function createSecondCallPdfLink(year: number, month: number): Promise<
  { ok: true; path: string } | { ok: false; error: string }
> {
  try {
    const session = await auth();
    if (!session?.user?.isRegistered) return { ok: false, error: "กรุณาเข้าสู่ระบบ" };
    if (!validSecondCallMonth(year, month)) return { ok: false, error: "เดือนหรือปีไม่ถูกต้อง" };
    const token = createSecondCallToken(year, month);
    return { ok: true, path: `/api/duty-schedule/second-call-pdf?${new URLSearchParams({ token })}` };
  } catch (error) {
    console.error("createSecondCallPdfLink failed", error);
    return { ok: false, error: "สร้าง PDF ไม่สำเร็จ กรุณาลองอีกครั้ง" };
  }
}
