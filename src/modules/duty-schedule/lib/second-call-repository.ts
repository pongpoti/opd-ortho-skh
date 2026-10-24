import { and, eq, gte, inArray, lte } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { db } from "@/db";
import { secondCallSlots } from "@/db/schema";
import { bangkokToday } from "@/lib/bangkok-date";
import { resolveRosterFullName, type RosterPerson } from "@/lib/roster-directory";
import type { DutyMonthData } from "./duty-data";
import { fetchDutyMonthData } from "./duty-repository";
import { planSecondCall, slotKey, type SecondCallSlot, type SubDuty } from "./second-call-assign";
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
  const days = await Promise.all(Array.from({ length: daysIn(year, month) }, async (_, i) => ({
    holiday: data[i + 1]?.holiday ?? false,
    real: await resolveRosterFullName(data[i + 1]?.entries.d1, "staff", personnel),
  })));
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

/**
 * The month's second-call: admin-set sub-duties as set, saved assignments
 * where they still fit the roster, the rest assigned. `slots` is null for a
 * month without a staff roster.
 */
export async function planSecondCallMonth(year: number, month: number, personnel: RosterPerson[], today = bangkokToday()) {
  const prev = previousMonth(year, month);
  const [current, before, saved] = await Promise.all([
    loadSecondCallMonth(year, month, personnel),
    loadSecondCallMonth(prev.year, prev.month, personnel),
    fetchSavedSecondCall(year, month),
  ]);
  const input = {
    year, month, days: current.days,
    staff: personnel.filter((person) => person.role === "staff").map((person) => person.fullName),
    previousReal: before.days.at(-1)?.real ?? null,
  };
  const byKey = savedByKey(year, month, saved);
  if (!current.days.some((day) => day.real)) return { ...current, input, slots: null, counts: null, saved, pinned: byKey.pinned };
  const { slots, counts } = planSecondCall({ ...input, ...byKey, lockedThrough: lockedThrough(year, month, today) });
  return { ...current, input, slots, counts, saved, pinned: byKey.pinned };
}

/**
 * An admin's choice for one sub-duty (no names = back to automatic). The
 * month is then re-planned around it and saved, so the change shows at once.
 */
export async function setSecondCallSubDuty(input: {
  year: number; month: number;
  slot: { day: number; shift: SubDuty; dutyDay: number };
  names: string[];
  updatedByLineUserId: string | null;
  personnel: RosterPerson[];
}) {
  const { year, month, slot } = input;
  const shiftDate = isoDate(year, month, slot.day);
  const clear = db.delete(secondCallSlots).where(and(eq(secondCallSlots.shiftDate, shiftDate), eq(secondCallSlots.shift, slot.shift)));
  await db.batch(input.names.length
    ? [clear, db.insert(secondCallSlots).values(input.names.map((personName) => ({
      dutyDate: isoDate(year, month, slot.dutyDay), shiftDate, shift: slot.shift, personName,
      source: "admin" as const, updatedByLineUserId: input.updatedByLineUserId,
    })))]
    : [clear]);
  const plan = await planSecondCallMonth(year, month, input.personnel);
  if (plan.slots) await saveSecondCallMonth(year, month, plan.slots, plan.saved);
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
