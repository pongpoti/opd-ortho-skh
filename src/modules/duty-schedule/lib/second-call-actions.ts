"use server";

import { auth } from "@/auth";
import { fetchRosterPersonnel } from "@/lib/roster-directory";
import { requireAdminSession } from "@/lib/require-admin";
import {
  hasRealDuty,
  secondCallRules,
  slotKey,
  subDutiesOf,
  type SecondCallConflict,
  type SubDuty,
} from "./second-call-assign";
import { loadSecondCallMonth, planSecondCallMonth, setSecondCallSubDuties } from "./second-call-repository";
import { secondCallSheet } from "./second-call-sheets";
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

/** Where a sub-duty's name comes from. */
export type SecondCallSource = "admin" | "sheet" | "auto";

export type SecondCallEditorSlot = {
  shift: SubDuty;
  /** Day of month the sub-duty falls on; `days + 1` is the next month's 1st. */
  day: number;
  name: string | null;
  source: SecondCallSource;
  /** Rule each person would break on this sub-duty. */
  conflicts: Record<string, SecondCallConflict>;
};

export type SecondCallEditorDay = {
  day: number;
  holiday: boolean;
  holidayLabel: string | null;
  /** Real staff duty (d1) as written on the roster. */
  real: string | null;
  slots: SecondCallEditorSlot[];
};

export type SecondCallEditorMonth = {
  /** False until the month has any real staff duty. */
  hasRoster: boolean;
  days: SecondCallEditorDay[];
  /** Staff who take second-call, in sheet order. */
  staff: string[];
};

/** A month's second-call for the admin editor. */
export async function loadSecondCallEditor(year: number, month: number): Promise<
  { ok: true; month: SecondCallEditorMonth } | { ok: false; error: string }
> {
  if (!await requireAdminSession()) return { ok: false, error: "เฉพาะผู้ดูแลระบบ" };
  if (!validSecondCallMonth(year, month)) return { ok: false, error: "เดือนไม่ถูกต้อง" };
  try {
    const personnel = await fetchRosterPersonnel();
    const plan = await planSecondCallMonth(year, month, personnel);
    const { people, conflict } = secondCallRules(plan.input);
    const staff = plan.input.staff.filter((name) => people.includes(name));
    const sheet = secondCallSheet(year, month, plan.input.staff);
    const days: SecondCallEditorDay[] = plan.days.map((info, i) => {
      const day = i + 1;
      const slots = (plan.slots ?? []).filter((slot) => slot.dutyDay === day).map((slot) => {
        const key = slotKey(slot);
        const source: SecondCallSource = plan.pinned.has(key) ? "admin" : sheet?.has(key) ? "sheet" : "auto";
        return {
          shift: slot.shift,
          day: slot.day,
          name: slot.secondCall[0] ?? null,
          source,
          conflicts: Object.fromEntries(staff.flatMap((name) => {
            const reason = conflict(name, slot);
            return reason ? [[name, reason]] : [];
          })),
        };
      });
      return {
        day,
        holiday: info.holiday,
        holidayLabel: plan.data[day]?.holidayLabel ?? null,
        real: plan.data[day]?.entries.d1?.trim() || null,
        slots,
      };
    });
    return { ok: true, month: { hasRoster: !!plan.slots, days, staff } };
  } catch (error) {
    console.error("loadSecondCallEditor failed", error);
    return { ok: false, error: "โหลด second-call ไม่สำเร็จ" };
  }
}

export type SecondCallEdit = {
  /** Day whose real duty the sub-duty belongs to. */
  dutyDay: number;
  shift: SubDuty;
  /** Who takes it, or null to hand it back to the automatic assignment. */
  name: string | null;
};

/**
 * Admin: set who takes some sub-duties' second-call in one save. Rule
 * conflicts are shown in the editor, not blocked here.
 */
export async function saveSecondCallEdits(input: {
  year: number; month: number; edits: SecondCallEdit[];
}): Promise<{ ok: true; saved: number } | { ok: false; error: string }> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "เฉพาะผู้ดูแลระบบ" };
  const { year, month, edits } = input;
  if (!validSecondCallMonth(year, month) || !Array.isArray(edits) || edits.length > 31 * 3) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  }
  if (!edits.length) return { ok: true, saved: 0 };
  try {
    const personnel = await fetchRosterPersonnel();
    const { days } = await loadSecondCallMonth(year, month, personnel);
    const { people } = secondCallRules({
      year, month, days, staff: personnel.filter((person) => person.role === "staff").map((person) => person.fullName),
    });
    const seen = new Set<string>();
    const changes = [];
    for (const edit of edits) {
      const { dutyDay, shift } = edit ?? {};
      const name = typeof edit?.name === "string" ? edit.name.trim() || null : null;
      const info = Number.isInteger(dutyDay) ? days[dutyDay - 1] : undefined;
      const sub = info && subDutiesOf(year, month, dutyDay, info.holiday).find((item) => item.shift === shift);
      if (!info || !sub) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
      if (seen.has(slotKey(sub))) return { ok: false, error: "ข้อมูลซ้ำ" };
      seen.add(slotKey(sub));
      if (name && !hasRealDuty(info)) return { ok: false, error: `วันที่ ${dutyDay} ยังไม่มีเวร staff` };
      if (name && !people.includes(name)) return { ok: false, error: `วันที่ ${dutyDay}: ชื่อไม่ได้อยู่ในรายชื่อ second-call` };
      changes.push({ ...sub, dutyDay, name });
    }
    await setSecondCallSubDuties({
      year, month, changes, updatedByLineUserId: session.user.lineUserId || null, personnel,
    });
    return { ok: true, saved: changes.length };
  } catch (error) {
    console.error("saveSecondCallEdits failed", error);
    return { ok: false, error: "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง" };
  }
}
