import { buildCastCaseLogPdfFromShareToken } from "@/modules/cast-room/lib/cast-case-log-export";

export const runtime = "nodejs";

/** RFC 5987 Content-Disposition so Thai filenames work in browsers/WebViews. */
function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
  return `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

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
      "Content-Disposition": contentDisposition(result.filename),
      "Cache-Control": "private, no-store",
    },
  });
}
