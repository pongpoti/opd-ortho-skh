"use server";

import { auth } from "@/auth";
import { requireAdminSession } from "@/lib/require-admin";

import {
  dutyApplies,
  DUTY_ORDER,
  internNamesForMonth,
  parseDutyPersonName,
  type DutyKey,
  type DutyMonthData,
} from "./duty-data";
import {
  fetchDutyMonthData,
  saveDutySlotRecord,
} from "./duty-repository";
import {
  fetchRosterPersonnel,
  getRosterFullNames,
  resolveRosterFullName,
} from "@/lib/roster-directory";

export type DutyRosterOption = {
  /** Value stored in the roster row. */
  value: string;
  /** Label shown in the edit sheet. */
  label: string;
};

type ActionResult = { ok: true } | { ok: false; error: string };

function isDutyKey(value: string): value is DutyKey {
  return DUTY_ORDER.includes(value as DutyKey);
}

function firstNameOf(full: string): string {
  return parseDutyPersonName(full).first;
}

function validateYmd(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return false;
  if (!Number.isInteger(month) || month < 0 || month > 11) return false;
  if (!Number.isInteger(day) || day < 1 || day > 31) return false;
  const max = new Date(year, month + 1, 0).getDate();
  return day <= max;
}

/** Load the complete saved month — any registered user (needed for display). */
export async function loadDutyMonthData(
  year: number,
  month: number
): Promise<{ ok: true; data: DutyMonthData } | { ok: false; error: string }> {
  try {
    const session = await auth();
    if (!session?.user?.isRegistered) {
      return { ok: false, error: "กรุณาเข้าสู่ระบบ" };
    }
    if (!validateYmd(year, month, 1)) {
      return { ok: false, error: "เดือนไม่ถูกต้อง" };
    }
    const data = await fetchDutyMonthData(year, month);
    return { ok: true, data };
  } catch (err) {
    console.error("loadDutyMonthData failed", err);
    return { ok: false, error: "โหลดตารางเวรไม่สำเร็จ" };
  }
}

/** Roster options for the edit sheet (admin). Intern list is month-scoped. */
export async function getDutyEditRoster(input: {
  year: number;
  month: number;
  day: number;
  dutyKey: DutyKey;
}): Promise<{ ok: true; options: DutyRosterOption[] } | { ok: false; error: string }> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "ไม่มีสิทธิ์แก้ไข" };

  const { year, month, day, dutyKey } = input;
  if (!validateYmd(year, month, day) || !isDutyKey(dutyKey)) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  }
  const weekday = new Date(year, month, day).getDay();
  if (!dutyApplies(dutyKey, weekday)) {
    return { ok: false, error: "เวรนี้ไม่มีในวันนี้" };
  }

  try {
    if (dutyKey === "d2") {
      const [data, personnel] = await Promise.all([
        fetchDutyMonthData(year, month),
        fetchRosterPersonnel("intern"),
      ]);
      const names = internNamesForMonth(year, month, data);
      const options = await Promise.all(names.map(async (value) => ({
        value,
        label: (await resolveRosterFullName(value, "intern", personnel)) ?? value,
      })));
      return { ok: true, options };
    }

    const fullNames = await getRosterFullNames(dutyKey === "d5" ? "nurse" : "staff");
    const firstCounts = new Map<string, number>();
    for (const full of fullNames) {
      const first = firstNameOf(full);
      firstCounts.set(first, (firstCounts.get(first) ?? 0) + 1);
    }
    return {
      ok: true,
      options: fullNames.map((full) => ({
        value: (firstCounts.get(firstNameOf(full)) ?? 0) > 1 ? full : firstNameOf(full),
        label: full,
      })),
    };
  } catch (err) {
    console.error("getDutyEditRoster failed", err);
    return { ok: false, error: "โหลดรายชื่อเวรไม่สำเร็จ กรุณาลองอีกครั้ง" };
  }
}

export async function saveDutySlot(input: {
  year: number;
  month: number;
  day: number;
  dutyKey: DutyKey;
  personName: string;
}): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "ไม่มีสิทธิ์แก้ไข" };

  const { year, month, day, dutyKey, personName: raw } = input;
  if (!validateYmd(year, month, day) || !isDutyKey(dutyKey)) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  }
  const weekday = new Date(year, month, day).getDay();
  if (!dutyApplies(dutyKey, weekday)) {
    return { ok: false, error: "เวรนี้ไม่มีในวันนี้" };
  }

  if (typeof raw !== "string" || raw.length > 200) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  }
  const personName = raw.trim();
  if (!personName) return { ok: false, error: "กรุณาเลือกคนเวร" };

  if (personName === "งด") {
    try {
      await saveDutySlotRecord({
        year,
        month,
        day,
        dutyKey,
        personName: "งด",
        updatedByLineUserId: session.user.lineUserId || null,
      });
    } catch (err) {
      console.error("saveDutySlot failed", err);
      return { ok: false, error: "บันทึกไม่สำเร็จ" };
    }
    return { ok: true };
  }

  if (personName === "-") {
    return { ok: false, error: "ใช้ปุ่มลบเพื่อว่างสล็อต" };
  }

  const roster = await getDutyEditRoster({ year, month, day, dutyKey });
  if (!roster.ok) return roster;
  if (!roster.options.some((o) => o.value === personName)) {
    return { ok: false, error: "ชื่อไม่ได้อยู่ในรายชื่อเวร" };
  }

  try {
    await saveDutySlotRecord({
      year,
      month,
      day,
      dutyKey,
      personName,
      updatedByLineUserId: session.user.lineUserId || null,
    });
  } catch (err) {
    console.error("saveDutySlot failed", err);
    return { ok: false, error: "บันทึกไม่สำเร็จ" };
  }
  return { ok: true };
}

/** Clear a slot — stores "-" so the schedule displays a dash. */
export async function deleteDutySlot(input: {
  year: number;
  month: number;
  day: number;
  dutyKey: DutyKey;
}): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "ไม่มีสิทธิ์ลบ" };

  const { year, month, day, dutyKey } = input;
  if (!validateYmd(year, month, day) || !isDutyKey(dutyKey)) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  }
  const weekday = new Date(year, month, day).getDay();
  if (!dutyApplies(dutyKey, weekday)) {
    return { ok: false, error: "เวรนี้ไม่มีในวันนี้" };
  }

  try {
    await saveDutySlotRecord({
      year,
      month,
      day,
      dutyKey,
      personName: "-",
      updatedByLineUserId: session.user.lineUserId || null,
    });
  } catch (err) {
    console.error("deleteDutySlot failed", err);
    return { ok: false, error: "ลบไม่สำเร็จ" };
  }
  return { ok: true };
}

/** Whether the current session may edit the duty schedule. */
export async function getDutyScheduleAdminFlag(): Promise<boolean> {
  const session = await requireAdminSession();
  return !!session;
}
