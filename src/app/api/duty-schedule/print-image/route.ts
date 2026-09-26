import {
  buildDutyScheduleImage,
  dutyPrintFilename,
} from "@/modules/duty-schedule/lib/duty-print-png";
import { verifyDutyPrintShareToken } from "@/modules/duty-schedule/lib/duty-print-share";

export const runtime = "nodejs";
/** Chromium poster render can exceed the default serverless budget. */
export const maxDuration = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response("Missing token", { status: 400 });
  }

  const payload = verifyDutyPrintShareToken(token);
  if (!payload) {
    return new Response("Invalid or expired token", { status: 403 });
  }

  try {
    const image = await buildDutyScheduleImage(payload.year, payload.month);
    const body = Uint8Array.from(image.bytes);
    const filename = dutyPrintFilename(payload.year, payload.month);

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": image.contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("duty-schedule print-image failed", err);
    return new Response("Failed to render image", { status: 500 });
  }
}
