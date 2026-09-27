import {
  getDutyDay,
  isDutyMarker,
  parseDutyPersonName,
  type DutyMonthOverrides,
} from "@/modules/duty-schedule/lib/duty-data";
import { PHYSICIANS } from "@/lib/physicians";

import { parseISO } from "./thai-date";

/**
 * Map a duty-slot first name (or disambiguated stored string) to a full
 * PHYSICIANS entry, or null if missing / marker / unknown.
 */
export function resolvePhysicianFromDutyName(raw: string | undefined): string | null {
  if (!raw || isDutyMarker(raw)) return null;
  const { first } = parseDutyPersonName(raw);
  return PHYSICIANS.find((full) => full.startsWith(`${first} `)) ?? null;
}

/**
 * The full name of whichever physician the duty-schedule roster has down
 * for duty type 1 (เวร staff) on the given date, or null if that day's
 * roster isn't filled in yet or the recorded first name doesn't resolve to
 * anyone in PHYSICIANS. Cast-room logging always attributes the on-duty
 * staff physician rather than letting the nurse pick one by hand.
 *
 * Pass `monthOverrides` when admin edits should be reflected (home/print/
 * server paths). Client forms that only have the seed can omit it.
 */
export function resolveDutyDoctor(
  iso: string,
  monthOverrides?: DutyMonthOverrides
): string | null {
  const { year, month, day } = parseISO(iso);
  const raw = getDutyDay(year, month, day, monthOverrides).entries.d1;
  return resolvePhysicianFromDutyName(raw);
}
