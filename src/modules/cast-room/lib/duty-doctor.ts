import {
  getDutyDay,
  isDutyMarker,
  type DutyMonthData,
} from "@/modules/duty-schedule/lib/duty-data";
import { resolveRosterFullName } from "@/lib/roster-directory";

import { parseISO } from "./thai-date";

/**
 * Map a duty-slot first name (or disambiguated stored string) to a full
 * Neon staff-directory entry, or null if missing / marker / unknown.
 */
export async function resolvePhysicianFromDutyName(raw: string | undefined): Promise<string | null> {
  if (!raw || isDutyMarker(raw)) return null;
  return resolveRosterFullName(raw, "staff");
}

/**
 * The full name of whichever physician the duty-schedule roster has down
 * for duty type 1 (เวร staff) on the given date, or null if that day's
 * roster isn't filled in yet or the recorded first name doesn't resolve to
 * anyone in the staff directory. Cast-room logging always attributes the on-duty
 * staff physician rather than letting the nurse pick one by hand.
 *
 * The supplied month data is the complete roster read from Neon.
 */
export async function resolveDutyDoctor(
  iso: string,
  monthData: DutyMonthData
): Promise<string | null> {
  const { year, month, day } = parseISO(iso);
  const raw = getDutyDay(year, month, day, monthData).entries.d1;
  return resolvePhysicianFromDutyName(raw);
}
