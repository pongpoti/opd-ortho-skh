import { buildCastCaseLogPdfFromShareToken } from "@/modules/cast-room/lib/cast-case-log-export";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return new Response("Missing token", { status: 400 });
  }

  const result = await buildCastCaseLogPdfFromShareToken(token);
  if (!result.ok) {
    return new Response(result.error, { status: 403 });
  }

  // Copy into a fresh ArrayBuffer-backed Uint8Array for Response BodyInit typing.
  const body = Uint8Array.from(result.bytes);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${result.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
