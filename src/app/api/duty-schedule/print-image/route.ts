import { buildDutySchedulePng, dutyPrintFilename } from "@/modules/duty-schedule/lib/duty-print-png";
import { verifyDutyPrintShareToken } from "@/modules/duty-schedule/lib/duty-print-share";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const variant = url.searchParams.get("variant") === "preview" ? "preview" : "original";

  if (!token) {
    return new Response("Missing token", { status: 400 });
  }

  const payload = verifyDutyPrintShareToken(token);
  if (!payload) {
    return new Response("Invalid or expired token", { status: 403 });
  }

  try {
    const bytes = await buildDutySchedulePng(payload.year, payload.month, {
      preview: variant === "preview",
    });
    const body = Uint8Array.from(bytes);
    const filename = dutyPrintFilename(payload.year, payload.month);

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    console.error("duty-schedule print-image failed", err);
    return new Response("Failed to render image", { status: 500 });
  }
}
