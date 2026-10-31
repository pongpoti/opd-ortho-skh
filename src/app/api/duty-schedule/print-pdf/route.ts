import {
  buildDutySchedulePdf,
  dutyPrintFilename,
} from "@/modules/duty-schedule/lib/duty-print-pdf";
import { verifyDutyPrintShareToken } from "@/modules/duty-schedule/lib/duty-print-share";

export const runtime = "nodejs";
/** Chromium render can exceed the default serverless budget. */
export const maxDuration = 60;

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const payload = token ? verifyDutyPrintShareToken(token) : null;
  if (!payload) return new Response("ลิงก์หมดอายุหรือไม่ถูกต้อง", { status: 403 });

  try {
    const bytes = await buildDutySchedulePdf(payload.year, payload.month);
    return new Response(Uint8Array.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${dutyPrintFilename(payload.year, payload.month)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("duty-schedule print-pdf failed", err);
    return new Response("สร้าง PDF ไม่สำเร็จ กรุณาลองอีกครั้ง", { status: 500 });
  }
}
