import { and, eq, gte, lte, sql } from "drizzle-orm";

import { db } from "@/db";
import { dutyOverrides } from "@/db/schema";

import {
  DUTY_ORDER,
  type DutyKey,
  type DutyMonthOverrides,
} from "./duty-data";

const DUTY_KEY_SET = new Set<string>(DUTY_ORDER);

export function isDutyKey(value: string): value is DutyKey {
  return DUTY_KEY_SET.has(value);
}

function monthRange(year: number, month: number) {
  const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export function toShiftDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Load all admin overrides for a calendar month (0-indexed). */
export async function fetchDutyOverridesForMonth(
  year: number,
  month: number
): Promise<DutyMonthOverrides> {
  const { start, end } = monthRange(year, month);
  const rows = await db
    .select({
      shiftDate: dutyOverrides.shiftDate,
      dutyKey: dutyOverrides.dutyKey,
      personName: dutyOverrides.personName,
    })
    .from(dutyOverrides)
    .where(and(gte(dutyOverrides.shiftDate, start), lte(dutyOverrides.shiftDate, end)));

  const out: DutyMonthOverrides = {};
  for (const row of rows) {
    if (!isDutyKey(row.dutyKey)) continue;
    const day = Number(row.shiftDate.slice(8, 10));
    if (!Number.isFinite(day)) continue;
    if (!out[day]) out[day] = {};
    out[day][row.dutyKey] = row.personName;
  }
  return out;
}

/** Upsert one slot override (person name, "งด", or "-" for cleared). */
export async function upsertDutyOverride(input: {
  year: number;
  month: number;
  day: number;
  dutyKey: DutyKey;
  personName: string;
  updatedByLineUserId: string | null;
}): Promise<void> {
  const shiftDate = toShiftDate(input.year, input.month, input.day);
  await db
    .insert(dutyOverrides)
    .values({
      shiftDate,
      dutyKey: input.dutyKey,
      personName: input.personName,
      updatedByLineUserId: input.updatedByLineUserId,
      updatedAt: sql`now()`,
    })
    .onConflictDoUpdate({
      target: [dutyOverrides.shiftDate, dutyOverrides.dutyKey],
      set: {
        personName: input.personName,
        updatedByLineUserId: input.updatedByLineUserId,
        updatedAt: sql`now()`,
      },
    });
}

export async function fetchDutyOverrideForDay(
  year: number,
  month: number,
  day: number
): Promise<Partial<Record<DutyKey, string>>> {
  const shiftDate = toShiftDate(year, month, day);
  const rows = await db
    .select({
      dutyKey: dutyOverrides.dutyKey,
      personName: dutyOverrides.personName,
    })
    .from(dutyOverrides)
    .where(eq(dutyOverrides.shiftDate, shiftDate));

  const out: Partial<Record<DutyKey, string>> = {};
  for (const row of rows) {
    if (!isDutyKey(row.dutyKey)) continue;
    out[row.dutyKey] = row.personName;
  }
  return out;
}
