import { createHmac, timingSafeEqual } from "crypto";

const SHARE_TTL_MS = 60 * 60 * 1000; // 1 hour

export type CastCaseLogSharePayload = {
  year: number;
  month: number;
  doctorName: string; // empty string = all physicians with visits
  exp: number; // unix ms
};

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not configured");
  return value;
}

function encodePayload(payload: CastCaseLogSharePayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(raw: string): CastCaseLogSharePayload | null {
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const data = JSON.parse(json) as Partial<CastCaseLogSharePayload>;
    if (
      typeof data.year !== "number" ||
      typeof data.month !== "number" ||
      typeof data.doctorName !== "string" ||
      typeof data.exp !== "number"
    ) {
      return null;
    }
    return {
      year: data.year,
      month: data.month,
      doctorName: data.doctorName,
      exp: data.exp,
    };
  } catch {
    return null;
  }
}

function sign(payloadB64: string): string {
  return createHmac("sha256", secret()).update(payloadB64).digest("base64url");
}

export function createCastCaseLogShareToken(
  year: number,
  month: number,
  doctorName: string | undefined,
  ttlMs = SHARE_TTL_MS
): string {
  const payload: CastCaseLogSharePayload = {
    year,
    month,
    doctorName: doctorName ?? "",
    exp: Date.now() + ttlMs,
  };
  const body = encodePayload(payload);
  return `${body}.${sign(body)}`;
}

export function verifyCastCaseLogShareToken(token: string): CastCaseLogSharePayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const payload = decodePayload(body);
  if (!payload) return null;
  if (payload.exp < Date.now()) return null;
  if (!Number.isInteger(payload.year) || !Number.isInteger(payload.month)) return null;
  if (payload.month < 1 || payload.month > 12) return null;
  return payload;
}

export function buildCastCaseLogSharePath(token: string): string {
  return `/api/cast-room/case-log-pdf?token=${encodeURIComponent(token)}`;
}
