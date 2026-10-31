import { timingSafeEqual } from "node:crypto";
import { bangkokToday } from "@/lib/bangkok-date";
import { fetchRosterPersonnel } from "@/lib/roster-directory";
import { syncBotHolidays } from "@/modules/duty-schedule/lib/bot-holidays";
import {
  nextMonth, planSecondCallMonth, previousMonth, saveSecondCallMonth,
} from "@/modules/duty-schedule/lib/second-call-repository";

export const runtime = "nodejs";

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; anything else is refused. */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * Daily second-call save (vercel.json crons, 00:05 Bangkok). It first adds
 * this year's and next year's BOT holidays, so new holidays get their ช
 * sub-duty tonight. This month is then saved with every day so far kept,
 * next month once its staff roster exists, and last month is finished if it
 * was saved before (months before the job started are not backfilled).
 */
export async function GET(request: Request) {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
  const today = bangkokToday();
  const holidays = await syncBotHolidays([today.year, today.year + 1]);
  const personnel = await fetchRosterPersonnel();
  const months = [previousMonth(today.year, today.month), today, nextMonth(today.year, today.month)];
  let failed = false;
  const results = [];
  for (const [index, { year, month }] of months.entries()) {
    const label = `${year}-${String(month + 1).padStart(2, "0")}`;
    try {
      const plan = await planSecondCallMonth(year, month, personnel, today);
      if (!plan.slots) results.push({ month: label, skipped: "no staff roster" });
      else if (index === 0 && !plan.saved.length) results.push({ month: label, skipped: "never saved" });
      else results.push({ month: label, ...await saveSecondCallMonth(year, month, plan.slots, plan.saved) });
    } catch (error) {
      console.error(`second-call cron failed for ${label}`, error);
      failed = true;
      results.push({ month: label, failed: true });
    }
  }
  return Response.json({ today: { ...today, month: today.month + 1 }, holidays, results }, { status: failed ? 500 : 200 });
}
