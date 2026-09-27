"use server";

import { auth } from "@/auth";
import { NURSES } from "@/lib/nurses";
import { PHYSICIANS } from "@/lib/physicians";
import { requireAdminSession } from "@/lib/require-admin";

import {
  dutyApplies,
  getDutyDay,
  internNamesForMonth,
  isDutyMarker,
  parseDutyPersonName,
  type DutyKey,
  type DutyMonthOverrides,
} from "./duty-data";
import {
  fetchDutyOverridesForMonth,
  isDutyKey,
  upsertDutyOverride,
} from "./duty-overrides";

export type DutyRosterOption = {
  /** Value stored in the roster / override row. */
  value: string;
  /** Label shown in the edit sheet. */
  label: string;
};

type ActionResult = { ok: true } | { ok: false; error: string };

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

/** Load overrides for the month — any signed-in user (needed for display). */
export async function loadDutyMonthOverrides(
  year: number,
  month: number
): Promise<{ ok: true; overrides: DutyMonthOverrides } | { ok: false; error: string }> {
  try {
    const session = await auth();
    if (!session?.user?.isRegistered) {
      return { ok: false, error: "กรุณาเข้าสู่ระบบ" };
    }
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 0 || month > 11) {
      return { ok: false, error: "เดือนไม่ถูกต้อง" };
    }
    const overrides = await fetchDutyOverridesForMonth(year, month);
    return { ok: true, overrides };
  } catch (err) {
    console.error("loadDutyMonthOverrides failed", err);
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

  if (dutyKey === "d2") {
    const overrides = await fetchDutyOverridesForMonth(year, month);
    const names = internNamesForMonth(year, month, overrides);
    const current = getDutyDay(year, month, day, overrides).entries.d2;
    if (current && !isDutyMarker(current) && !names.includes(current)) {
      names.push(current);
      names.sort((a, b) => a.localeCompare(b, "th"));
    }
    return {
      ok: true,
      options: names.map((value) => ({ value, label: value })),
    };
  }

  if (dutyKey === "d5") {
    return {
      ok: true,
      options: NURSES.map((full) => ({
        value: firstNameOf(full),
        label: full,
      })),
    };
  }

  // d1 staff + d3/d4 OPD
  return {
    ok: true,
    options: PHYSICIANS.map((full) => ({
      value: firstNameOf(full),
      label: full,
    })),
  };
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

  const personName = raw.trim();
  if (!personName) return { ok: false, error: "กรุณาเลือกคนเวร" };

  if (personName === "งด") {
    try {
      await upsertDutyOverride({
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
    await upsertDutyOverride({
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
    await upsertDutyOverride({
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
