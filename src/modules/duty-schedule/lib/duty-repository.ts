import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { dutyDays, dutyOverrides, dutySlots, fixedHolidays, opdWeeklySchedule } from "@/db/schema";
import { DUTY_ORDER, type DutyKey, type DutyMonthData } from "./duty-data";
import { validSecondCallMonth } from "./second-call-share";

function monthRange(year: number, month: number) {
  if (!validSecondCallMonth(year, month)) throw new Error("Invalid roster month");
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return { start: `${prefix}-01`, end: `${prefix}-${days}`, prefix, days };
}

/** Complete month from Neon. A failed query must not fabricate an empty roster. */
export async function fetchDutyMonthData(year: number, month: number): Promise<DutyMonthData> {
  const { start, end, days } = monthRange(year, month);
  const [dates, slots, holidays, legacy] = await Promise.all([
    db.select().from(dutyDays).where(and(gte(dutyDays.shiftDate, start), lte(dutyDays.shiftDate, end))),
    db.select().from(dutySlots).where(and(gte(dutySlots.shiftDate, start), lte(dutySlots.shiftDate, end))),
    db.select().from(fixedHolidays).where(eq(fixedHolidays.month, month)),
    db.select().from(dutyOverrides).where(and(gte(dutyOverrides.shiftDate, start), lte(dutyOverrides.shiftDate, end))),
  ]);
  const data: DutyMonthData = {};
  for (let day = 1; day <= days; day++) {
    const holiday = holidays.find((row) => row.day === day);
    data[day] = { holiday: !!holiday, holidayLabel: holiday?.name ?? null, entries: {} };
  }
  for (const row of dates) {
    const day = Number(row.shiftDate.slice(8, 10));
    if (!data[day]) continue;
    data[day].holiday = row.holiday || data[day].holiday;
    data[day].holidayLabel = row.holidayLabel ?? data[day].holidayLabel;
  }
  const bySlot = new Map(slots.map((row) => [`${row.shiftDate}:${row.dutyKey}`, row]));
  for (const row of slots) {
    const day = Number(row.shiftDate.slice(8, 10));
    if (data[day]) data[day].entries[row.dutyKey] = row.personName;
  }
  // During rollout the prior deployment can still write the old table. Only
  // newer legacy edits (or edits over imported source) take precedence.
  for (const row of legacy) {
    if (!DUTY_ORDER.includes(row.dutyKey as DutyKey)) continue;
    const day = Number(row.shiftDate.slice(8, 10));
    const canonical = bySlot.get(`${row.shiftDate}:${row.dutyKey}`);
    if (data[day] && (!canonical || canonical.source === "import" || row.updatedAt > canonical.updatedAt)) {
      data[day].entries[row.dutyKey as DutyKey] = row.personName;
    }
  }
  return data;
}

export async function saveDutySlotRecord(input: {
  year: number; month: number; day: number; dutyKey: DutyKey;
  personName: string; updatedByLineUserId: string | null;
}): Promise<void> {
  const { prefix, days } = monthRange(input.year, input.month);
  if (!Number.isInteger(input.day) || input.day < 1 || input.day > days || !DUTY_ORDER.includes(input.dutyKey) || !input.personName.trim()) {
    throw new Error("Invalid duty slot");
  }
  const shiftDate = `${prefix}-${String(input.day).padStart(2, "0")}`;
  const values = { shiftDate, dutyKey: input.dutyKey, personName: input.personName.trim(), updatedByLineUserId: input.updatedByLineUserId, updatedAt: sql`now()` };
  // Keep the old table synchronized until prior deployment instances finish.
  // Both statements commit together, so a partial write cannot change a duty.
  await db.batch([
    db.insert(dutySlots).values({ ...values, source: "admin" }).onConflictDoUpdate({
      target: [dutySlots.shiftDate, dutySlots.dutyKey],
      set: { ...values, source: "admin" },
    }),
    db.insert(dutyOverrides).values(values).onConflictDoUpdate({
      target: [dutyOverrides.shiftDate, dutyOverrides.dutyKey], set: values,
    }),
  ]);
}

export async function fetchOpdWeeklySchedule() {
  return db.select().from(opdWeeklySchedule).orderBy(asc(opdWeeklySchedule.weekday));
}
