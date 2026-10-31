import { and, gte, inArray, lte } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { db } from "@/db";
import { secondCallSlots } from "@/db/schema";
import { bangkokToday } from "@/lib/bangkok-date";
import { resolveRosterFullName, type RosterPerson } from "@/lib/roster-directory";
import { isDutyMarker, type DutyMonthData } from "./duty-data";
import { fetchDutyMonthData } from "./duty-repository";
import {
  hasRealDuty, planSecondCall, secondCallHistory, slotKey, slotTime,
  type SecondCallDay, type SecondCallSlot, type SubDuty,
} from "./second-call-assign";
import { secondCallSheet } from "./second-call-sheets";
import { validSecondCallMonth } from "./second-call-share";

type SavedRow = typeof secondCallSlots.$inferSelect;

export const previousMonth = (year: number, month: number) =>
  month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
export const nextMonth = (year: number, month: number) =>
  month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
const daysIn = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
/** ISO date of a day in the month; day `days + 1` is the 1st of the next month. */
const isoDate = (year: number, month: number, day: number) => new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);

/** A month's roster with each day's real staff (d1) resolved to a full name. */
export async function loadSecondCallMonth(year: number, month: number, personnel: RosterPerson[]) {
  const data: DutyMonthData = validSecondCallMonth(year, month) ? await fetchDutyMonthData(year, month) : {};
  const days: SecondCallDay[] = await Promise.all(Array.from({ length: daysIn(year, month) }, async (_, i) => {
    const d1 = data[i + 1]?.entries.d1?.trim();
    return {
      holiday: data[i + 1]?.holiday ?? false,
      real: await resolveRosterFullName(d1, "staff", personnel),
      rostered: !!d1 && !isDutyMarker(d1),
    };
  }));
  return { data, days };
}

/** Postgres "undefined_table", directly or wrapped by Drizzle. */
const missingTable = (error: unknown) => [error, (error as { cause?: unknown })?.cause]
  .some((item) => (item as { code?: unknown })?.code === "42P01");

/**
 * Saved names keyed by `slotKey` (a shift on the next month's 1st is day
 * `days + 1`), with the sub-duties an admin set kept apart in `pinned`.
 */
export function savedByKey(year: number, month: number, rows: Pick<SavedRow, "shiftDate" | "shift" | "personName" | "source">[]) {
  const first = Date.UTC(year, month, 1);
  const saved = new Map<string, string[]>();
  const pinned = new Map<string, string[]>();
  for (const row of rows) {
    const day = Math.round((Date.parse(`${row.shiftDate}T00:00:00Z`) - first) / 86_400_000) + 1;
    const key = slotKey({ day, shift: row.shift as SubDuty });
    const into = row.source === "admin" ? pinned : saved;
    into.set(key, [...(into.get(key) ?? []), row.personName]);
  }
  return { saved, pinned };
}

/** Rows to save for the month's plan. */
export function secondCallRows(year: number, month: number, slots: SecondCallSlot[]) {
  return slots.flatMap((slot) => slot.secondCall.map((personName) => ({
    dutyDate: isoDate(year, month, slot.dutyDay),
    shiftDate: isoDate(year, month, slot.day),
    shift: slot.shift,
    personName,
  })));
}

/** Saved rows of the month's duty days. */
async function fetchSavedSecondCall(year: number, month: number) {
  const rows = await db.select().from(secondCallSlots).where(and(
    gte(secondCallSlots.dutyDate, isoDate(year, month, 1)),
    lte(secondCallSlots.dutyDate, isoDate(year, month, daysIn(year, month))),
  )).catch((error: unknown) => {
    // Preview and development databases can predate 0007: assign from scratch.
    if (missingTable(error)) return [];
    throw error;
  });
  return rows;
}

/** Last duty day kept when reassigning: past months entirely, this month through today. */
function lockedThrough(year: number, month: number, today: { year: number; month: number; day: number }) {
  const order = year * 12 + month - (today.year * 12 + today.month);
  return order < 0 ? daysIn(year, month) : order === 0 ? today.day : 0;
}

/** How many months back the turn order is followed when nothing is saved. */
const HISTORY_DEPTH = 4;

/**
 * Where the turn order stands at the start of the month after `prev`, and
 * `prev`'s days (for rule 6's Friday). A finished month that was saved is
 * read as saved; otherwise it is planned, up to `depth` months back.
 */
async function previousTurns(
  prev: { year: number; month: number },
  personnel: RosterPerson[],
  today: { year: number; month: number; day: number },
  depth: number,
): Promise<{ days: SecondCallDay[]; history?: Map<string, number> }> {
  const finished = lockedThrough(prev.year, prev.month, today) === daysIn(prev.year, prev.month);
  const rows = depth > 0 && finished ? await fetchSavedSecondCall(prev.year, prev.month) : [];
  if (depth > 0 && !rows.length) {
    const plan = await planSecondCallMonth(prev.year, prev.month, personnel, today, depth - 1);
    return { days: plan.days, history: plan.slots ? secondCallHistory(plan.slots, plan.days.length) : undefined };
  }
  const { days } = await loadSecondCallMonth(prev.year, prev.month, personnel);
  if (!rows.length) return { days };
  const history = new Map<string, number>();
  const { saved, pinned } = savedByKey(prev.year, prev.month, rows);
  for (const [key, names] of [...saved, ...pinned]) {
    const [day, shift] = key.split(":");
    const t = slotTime(Number(day) - days.length, shift as SubDuty);
    for (const name of names) history.set(name, Math.max(history.get(name) ?? -Infinity, t));
  }
  return { days, history };
}

/**
 * The month's second-call: admin-set sub-duties as set, a paper sheet's
 * names where the month has one, saved assignments where they still fit the
 * roster, and the rest given out in turn, carrying on from the previous
 * month. Days without real duty get none. `slots` is null for a month without
 * a staff roster; `pinned` holds only the sub-duties an admin set.
 */
export async function planSecondCallMonth(
  year: number, month: number, personnel: RosterPerson[], today = bangkokToday(), depth = HISTORY_DEPTH,
) {
  // Sheet order: it breaks ties when nobody has had a turn yet.
  const staff = personnel.filter((person) => person.role === "staff")
    .sort((a, b) => (a.secondCallOrder ?? Infinity) - (b.secondCallOrder ?? Infinity))
    .map((person) => person.fullName);
  const sheet = secondCallSheet(year, month, staff);
  // A month with a paper sheet doesn't need the turn order it started from.
  const [current, before, saved] = await Promise.all([
    loadSecondCallMonth(year, month, personnel),
    previousTurns(previousMonth(year, month), personnel, today, sheet ? 0 : depth),
    fetchSavedSecondCall(year, month),
  ]);
  const input = {
    year, month, days: current.days, staff,
    previousReal: before.days.at(-1)?.real ?? null,
    history: before.history,
  };
  const byKey = savedByKey(year, month, saved);
  if (!current.days.some(hasRealDuty)) return { ...current, input, slots: null, counts: null, saved, pinned: byKey.pinned };
  const { slots, counts } = planSecondCall({
    ...input, saved: byKey.saved, pinned: new Map([...(sheet ?? []), ...byKey.pinned]),
    lockedThrough: lockedThrough(year, month, today),
  });
  return { ...current, input, slots, counts, saved, pinned: byKey.pinned };
}

/** Write the month's plan, touching only rows that changed. Both steps commit together. */
export async function saveSecondCallMonth(year: number, month: number, slots: SecondCallSlot[], saved: SavedRow[]) {
  const key = (row: { shiftDate: string; shift: string; personName: string }) => `${row.shiftDate}:${row.shift}:${row.personName}`;
  const wanted = secondCallRows(year, month, slots);
  const wantedKeys = new Set(wanted.map(key));
  const savedKeys = new Set(saved.map(key));
  const stale = saved.filter((row) => !wantedKeys.has(key(row))).map((row) => row.id);
  const fresh = wanted.filter((row) => !savedKeys.has(key(row)));
  const writes: BatchItem<"pg">[] = [];
  if (stale.length) writes.push(db.delete(secondCallSlots).where(inArray(secondCallSlots.id, stale)));
  if (fresh.length) writes.push(db.insert(secondCallSlots).values(fresh).onConflictDoNothing());
  const [first, ...rest] = writes;
  if (first) await db.batch([first, ...rest]);
  return { assigned: wanted.length, added: fresh.length, removed: stale.length };
}
