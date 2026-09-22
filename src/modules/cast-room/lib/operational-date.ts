import {
  DUTY_CALENDAR_START,
  isBeforeDutyCalendarStart,
} from "@/modules/duty-schedule/lib/duty-data";

import { toISO } from "./thai-date";

/**
 * Calendar month the cast-room UI should open on (1–12), clamped up to the
 * duty-roster launch month. Before October 2026 the device date is still
 * September, but logs can only be attributed to rostered October+ days — so
 * the form and dashboard must not default to an empty September.
 */
export function operationalMonthYear(now: Date = new Date()): { year: number; month: number } {
  const year = now.getFullYear();
  const month0 = now.getMonth();
  if (isBeforeDutyCalendarStart(year, month0)) {
    return { year: DUTY_CALENDAR_START.year, month: DUTY_CALENDAR_START.month + 1 };
  }
  return { year, month: month0 + 1 };
}

/** Default shift date for new cast logs — today, or roster start day if earlier. */
export function operationalTodayISO(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month0 = now.getMonth();
  if (isBeforeDutyCalendarStart(year, month0)) {
    return toISO(DUTY_CALENDAR_START.year, DUTY_CALENDAR_START.month, 1);
  }
  return toISO(year, month0, now.getDate());
}
