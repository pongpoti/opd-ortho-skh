import { createHmac, timingSafeEqual } from "node:crypto";

type Payload = { purpose: "second-call-blank-pdf"; year: number; month: number; exp: number };

export function validSecondCallMonth(year: number, month: number): boolean {
  return Number.isInteger(year) && year >= 2000 && year <= 2100 &&
    Number.isInteger(month) && month >= 0 && month <= 11;
}

function sign(body: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function createSecondCallToken(year: number, month: number): string {
  if (!validSecondCallMonth(year, month)) throw new Error("Invalid month");
  const payload: Payload = { purpose: "second-call-blank-pdf", year, month, exp: Date.now() + 30 * 60 * 1000 };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySecondCallToken(token: string): Payload | null {
  try {
    if (token.length > 1024) return null;
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [body, signature] = parts;
    const actual = Buffer.from(signature);
    const expected = Buffer.from(sign(body));
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
    if (payload.purpose !== "second-call-blank-pdf" || !validSecondCallMonth(payload.year, payload.month) ||
      !Number.isFinite(payload.exp) || payload.exp <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
