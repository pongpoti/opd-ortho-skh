import { createHmac, timingSafeEqual } from "crypto";

const SHARE_TTL_MS = 30 * 60 * 1000; // 30 minutes — enough for LINE to fetch

export type DutyPrintSharePayload = {
  year: number;
  /** 0-indexed month (JS Date convention). */
  month: number;
  exp: number; // unix ms
};

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not configured");
  return value;
}

function encodePayload(payload: DutyPrintSharePayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(raw: string): DutyPrintSharePayload | null {
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const data = JSON.parse(json) as Partial<DutyPrintSharePayload>;
    if (
      typeof data.year !== "number" ||
      typeof data.month !== "number" ||
      typeof data.exp !== "number"
    ) {
      return null;
    }
    return { year: data.year, month: data.month, exp: data.exp };
  } catch {
    return null;
  }
}

function sign(payloadB64: string): string {
  return createHmac("sha256", secret()).update(payloadB64).digest("base64url");
}

export function createDutyPrintShareToken(
  year: number,
  month: number,
  ttlMs = SHARE_TTL_MS
): string {
  const payload: DutyPrintSharePayload = {
    year,
    month,
    exp: Date.now() + ttlMs,
  };
  const body = encodePayload(payload);
  return `${body}.${sign(body)}`;
}

export function verifyDutyPrintShareToken(token: string): DutyPrintSharePayload | null {
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
  if (payload.month < 0 || payload.month > 11) return null;
  return payload;
}

export function buildDutyPrintImagePath(
  token: string,
  variant: "original" | "preview" = "original"
): string {
  const params = new URLSearchParams({ token, variant });
  return `/api/duty-schedule/print-image?${params.toString()}`;
}
