import { getDutyDay } from "@/modules/duty-schedule/lib/duty-data";
import { PHYSICIANS } from "@/lib/physicians";

import { parseISO } from "./thai-date";

/**
 * The full name of whichever physician the duty-schedule roster has down
 * for duty type 1 (เวร staff) on the given date, or null if that day's
 * roster isn't filled in yet or the recorded first name doesn't resolve to
 * anyone in PHYSICIANS. Cast-room logging always attributes the on-duty
 * staff physician rather than letting the nurse pick one by hand.
 */
export function resolveDutyDoctor(iso: string): string | null {
  const { year, month, day } = parseISO(iso);
  const firstName = getDutyDay(year, month, day).entries.d1;
  if (!firstName) return null;
  return PHYSICIANS.find((full) => full.startsWith(`${firstName} `)) ?? null;
}
