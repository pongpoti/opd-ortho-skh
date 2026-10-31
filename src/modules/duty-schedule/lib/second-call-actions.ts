"use server";

import { auth } from "@/auth";
import { fetchRosterPersonnel } from "@/lib/roster-directory";
import { requireAdminSession } from "@/lib/require-admin";
import {
  hasRealDuty,
  secondCallRules,
  slotKey,
  SUB_DUTY_ORDER,
  subDutiesOf,
  type SecondCallConflict,
  type SubDuty,
} from "./second-call-assign";
import { loadSecondCallMonth, planSecondCallMonth, setSecondCallSubDuty } from "./second-call-repository";
import { createSecondCallToken, validSecondCallMonth } from "./second-call-share";

export async function createSecondCallPdfLink(year: number, month: number): Promise<
  { ok: true; path: string } | { ok: false; error: string }
> {
  try {
    const session = await auth();
    if (!session?.user?.isRegistered) return { ok: false, error: "กรุณาเข้าสู่ระบบ" };
    if (!validSecondCallMonth(year, month)) return { ok: false, error: "เดือนหรือปีไม่ถูกต้อง" };
    const token = createSecondCallToken(year, month);
    return { ok: true, path: `/api/duty-schedule/second-call-pdf?${new URLSearchParams({ token })}` };
  } catch (error) {
    console.error("createSecondCallPdfLink failed", error);
    return { ok: false, error: "สร้าง PDF ไม่สำเร็จ กรุณาลองอีกครั้ง" };
  }
}

export type SecondCallSubDutyView = {
  shift: SubDuty;
  /** Calendar date the sub-duty falls on (ด is the morning after the duty day). */
  date: { year: number; month: number; day: number };
  /** Staff on real duty for this sub-duty. */
  real: string | null;
  names: string[];
  /** Set by an admin; the nightly job keeps it as is. */
  pinned: boolean;
};

export type SecondCallStaffOption = {
  name: string;
  /** Second-call sub-duties this month. */
  count: number;
  /** Rule this person would break, per sub-duty of the day. */
  conflicts: Partial<Record<SubDuty, SecondCallConflict>>;
};

export type SecondCallDayView = {
  subDuties: SecondCallSubDutyView[];
  /** Admin only: who can take second-call, for the edit sheet. */
  staff?: SecondCallStaffOption[];
  /** Second-calls each doctor gets this month at the least when turns run evenly. */
  usual: number;
};

function validDay(year: number, month: number, day: number): boolean {
  return validSecondCallMonth(year, month) && Number.isInteger(day) && day >= 1 &&
    day <= new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** Second-call of one day's duty (null when the month has no staff roster). */
export async function loadSecondCallDay(year: number, month: number, day: number): Promise<
  { ok: true; view: SecondCallDayView | null } | { ok: false; error: string }
> {
  try {
    const session = await auth();
    if (!session?.user?.isRegistered) return { ok: false, error: "กรุณาเข้าสู่ระบบ" };
    if (!validDay(year, month, day)) return { ok: false, error: "วันที่ไม่ถูกต้อง" };
    const personnel = await fetchRosterPersonnel();
    const plan = await planSecondCallMonth(year, month, personnel);
    if (!plan.slots) return { ok: true, view: null };
    const daySlots = plan.slots.filter((slot) => slot.dutyDay === day);
    const subDuties = daySlots.map((slot) => {
      const date = new Date(Date.UTC(year, month, slot.day));
      return {
        shift: slot.shift,
        date: { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate() },
        real: slot.real,
        names: slot.secondCall,
        pinned: plan.pinned.has(slotKey(slot)),
      };
    });
    const { people, conflict } = secondCallRules(plan.input);
    const usual = people.length ? Math.floor(plan.slots.length / people.length) : 0;
    if (!(await requireAdminSession())) return { ok: true, view: { subDuties, usual } };

    const order = new Map(personnel.map((person) => [person.fullName, person.secondCallOrder ?? Infinity]));
    const staff = [...people]
      .sort((a, b) => order.get(a)! - order.get(b)! || a.localeCompare(b, "th"))
      .map((name) => ({
        name,
        count: plan.counts.get(name) ?? 0,
        conflicts: Object.fromEntries(daySlots.flatMap((slot) => {
          const reason = conflict(name, slot);
          return reason ? [[slot.shift, reason]] : [];
        })),
      }));
    return { ok: true, view: { subDuties, staff, usual } };
  } catch (error) {
    console.error("loadSecondCallDay failed", error);
    return { ok: false, error: "โหลด second-call ไม่สำเร็จ" };
  }
}

/**
 * Admin: set who takes one sub-duty's second-call, or with no names hand it
 * back to the automatic assignment. Rule conflicts are shown, not blocked.
 */
export async function saveSecondCallSubDuty(input: {
  year: number; month: number; day: number; shift: SubDuty; names: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "ไม่มีสิทธิ์แก้ไข" };
  const { year, month, day, shift } = input;
  if (!validDay(year, month, day) || !SUB_DUTY_ORDER.includes(shift) || !Array.isArray(input.names)) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  }
  const names = [...new Set(input.names.map((name) => (typeof name === "string" ? name.trim() : "")))];
  if (names.some((name) => !name) || names.length > 3) return { ok: false, error: "เลือกได้ไม่เกิน 3 คน" };
  try {
    const personnel = await fetchRosterPersonnel();
    const { days } = await loadSecondCallMonth(year, month, personnel);
    if (!days.some(hasRealDuty)) return { ok: false, error: "เดือนนี้ยังไม่มีเวร staff" };
    if (names.length && !hasRealDuty(days[day - 1])) return { ok: false, error: "วันนี้ยังไม่มีเวร staff" };
    const sub = subDutiesOf(year, month, day, days[day - 1].holiday).find((item) => item.shift === shift);
    if (!sub) return { ok: false, error: "ช่วงเวรนี้ไม่มีในวันนี้" };
    const { people } = secondCallRules({
      year, month, days, staff: personnel.filter((person) => person.role === "staff").map((person) => person.fullName),
    });
    if (names.some((name) => !people.includes(name))) return { ok: false, error: "ชื่อไม่ได้อยู่ในรายชื่อ second-call" };
    await setSecondCallSubDuty({
      year, month, slot: { ...sub, dutyDay: day }, names,
      updatedByLineUserId: session.user.lineUserId || null, personnel,
    });
    return { ok: true };
  } catch (error) {
    console.error("saveSecondCallSubDuty failed", error);
    return { ok: false, error: "บันทึกไม่สำเร็จ" };
  }
}
