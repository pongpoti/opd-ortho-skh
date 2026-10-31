/**
 * Thai holidays from the Bank of Thailand "Financial Institutions' Holidays"
 * API, saved into `duty_days` so the calendar and second-call see them.
 * Requires `BOT_API_TOKEN` (an app token from portal.api.bot.or.th
 * subscribed to that product).
 *
 * Holidays are only ever added: a failed or empty answer changes nothing,
 * so a bad night at BOT can't take a holiday's ช sub-duty away.
 */
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { dutyDays, fixedHolidays } from "@/db/schema";

const BOT_HOLIDAYS_URL = "https://gateway.api.bot.or.th/financial-institutions-holidays/";

export type BotHoliday = { date: string; name: string | null };

function botToken(): string | null {
  return process.env.BOT_API_TOKEN?.trim() || null;
}

/** A row's value by key, ignoring case (the gateway and the older API differ). */
function field(row: Record<string, unknown>, ...keys: string[]): unknown {
  const entries = Object.entries(row);
  for (const key of keys) {
    const hit = entries.find(([name]) => name.toLowerCase() === key.toLowerCase());
    if (hit && hit[1] !== null && hit[1] !== "") return hit[1];
  }
  return undefined;
}

/**
 * The year's holidays from a BOT answer: a bare array of rows, or the older
 * `{ result: { data: [...] } }`. Throws on anything it can't read, so nothing
 * half-parsed is saved.
 */
export function parseBotHolidays(body: unknown, year: number): BotHoliday[] {
  const rows = Array.isArray(body) ? body : (body as { result?: { data?: unknown } })?.result?.data;
  if (!Array.isArray(rows)) throw new Error("BOT holidays: unexpected response shape");
  return rows.map((row) => {
    if (!row || typeof row !== "object") throw new Error("BOT holidays: unexpected row");
    const date = String(field(row as Record<string, unknown>, "Date") ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(date) || !date.startsWith(`${year}-`)) {
      throw new Error(`BOT holidays: unexpected date ${JSON.stringify(date)} for ${year}`);
    }
    const name = field(row as Record<string, unknown>, "HolidayDescriptionThai", "HolidayDescription");
    return { date, name: typeof name === "string" ? name.trim() : null };
  });
}

export async function fetchBotHolidays(year: number, token: string): Promise<BotHoliday[]> {
  const response = await fetch(`${BOT_HOLIDAYS_URL}?${new URLSearchParams({ year: String(year) })}`, {
    headers: { Authorization: token, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`BOT holidays ${year}: HTTP ${response.status}`);
  return parseBotHolidays(await response.json(), year);
}

/**
 * Mark the holidays in `duty_days`, keeping any label already there. Dates
 * `fixed_holidays` already covers are left alone. Returns how many dates changed.
 */
export async function saveBotHolidays(holidays: BotHoliday[]): Promise<number> {
  const fixed = await db.select({ month: fixedHolidays.month, day: fixedHolidays.day }).from(fixedHolidays);
  const covered = new Set(fixed.map((row) => `${row.month}:${row.day}`));
  const rows = holidays
    .filter(({ date }) => !covered.has(`${Number(date.slice(5, 7)) - 1}:${Number(date.slice(8, 10))}`))
    .map(({ date, name }) => ({ shiftDate: date, holiday: true, holidayLabel: name }));
  if (!rows.length) return 0;
  const changed = await db.insert(dutyDays).values(rows).onConflictDoUpdate({
    target: dutyDays.shiftDate,
    set: { holiday: true, holidayLabel: sql`coalesce(${dutyDays.holidayLabel}, excluded.holiday_label)` },
    setWhere: sql`not ${dutyDays.holiday} or ${dutyDays.holidayLabel} is null`,
  }).returning({ shiftDate: dutyDays.shiftDate });
  return changed.length;
}

/** Sync each year's BOT holidays; a year that fails is reported and skipped. */
export async function syncBotHolidays(years: number[]) {
  const token = botToken();
  if (!token) return { skipped: "no BOT_API_TOKEN" as const };
  const results = [];
  for (const year of years) {
    try {
      const holidays = await fetchBotHolidays(year, token);
      results.push({ year, holidays: holidays.length, added: await saveBotHolidays(holidays) });
    } catch (error) {
      console.error(`BOT holiday sync failed for ${year}`, error);
      results.push({ year, failed: true as const });
    }
  }
  return { results };
}
