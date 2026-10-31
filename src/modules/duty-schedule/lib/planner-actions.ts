"use server";

import { requireAdminSession } from "@/lib/require-admin";
import { fetchRosterPersonnel, type RosterPerson, type RosterRole } from "@/lib/roster-directory";

import { syncBotHolidays } from "./bot-holidays";
import { DUTY_ORDER, dutyApplies, parseDutyPersonName, type DutyKey, type DutyMonthData } from "./duty-data";
import { fetchDutyMonthData, saveDutySlotRecords } from "./duty-repository";
import { validSecondCallMonth } from "./second-call-share";

export type PlannerOption = { value: string; label: string };
export type PlannerRosters = Record<RosterRole, PlannerOption[]>;
export type PlannerChange = { day: number; dutyKey: DutyKey; personName: string };

/** Which roster each duty column picks from. */
const DUTY_ROLE: Record<DutyKey, RosterRole> = {
  d1: "staff", d2: "intern", d3: "staff", d4: "staff", d5: "nurse",
};

/** Explicit markers the planner may store besides a person. */
const MARKERS = ["งด", "-"];

const MAX_CHANGES = 31 * DUTY_ORDER.length;

/** Stored value is the first name, or the full name when a first name is shared. */
function rosterOptions(people: RosterPerson[]): PlannerOption[] {
  const firstCounts = new Map<string, number>();
  for (const person of people) {
    const first = parseDutyPersonName(person.fullName).first;
    firstCounts.set(first, (firstCounts.get(first) ?? 0) + 1);
  }
  return people.map((person) => {
    const first = parseDutyPersonName(person.fullName).first;
    return { value: (firstCounts.get(first) ?? 0) > 1 ? person.fullName : first, label: person.fullName };
  });
}

async function loadRosters(): Promise<PlannerRosters> {
  const people = await fetchRosterPersonnel();
  return {
    staff: rosterOptions(people.filter((person) => person.role === "staff")),
    intern: rosterOptions(people.filter((person) => person.role === "intern")),
    nurse: rosterOptions(people.filter((person) => person.role === "nurse")),
  };
}

/** A month to plan plus every active staff, intern and nurse (admin only). */
export async function loadPlannerMonth(
  year: number,
  month: number,
): Promise<{ ok: true; data: DutyMonthData; rosters: PlannerRosters } | { ok: false; error: string }> {
  if (!await requireAdminSession()) return { ok: false, error: "เฉพาะผู้ดูแลระบบ" };
  if (!validSecondCallMonth(year, month)) return { ok: false, error: "เดือนไม่ถูกต้อง" };
  try {
    const [data, rosters] = await Promise.all([fetchDutyMonthData(year, month), loadRosters()]);
    return { ok: true, data, rosters };
  } catch (err) {
    console.error("loadPlannerMonth failed", err);
    return { ok: false, error: "โหลดตารางเวรไม่สำเร็จ" };
  }
}

/**
 * Save every planner change in one batch. A name must be on the active roster
 * for that column, or be the name already saved in that slot.
 */
export async function savePlannerChanges(input: {
  year: number;
  month: number;
  changes: PlannerChange[];
}): Promise<{ ok: true; saved: number } | { ok: false; error: string }> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "เฉพาะผู้ดูแลระบบ" };
  const { year, month, changes } = input;
  if (!validSecondCallMonth(year, month) || !Array.isArray(changes) || changes.length > MAX_CHANGES) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  }
  if (!changes.length) return { ok: true, saved: 0 };

  try {
    const [data, rosters] = await Promise.all([fetchDutyMonthData(year, month), loadRosters()]);
    const days = new Date(year, month + 1, 0).getDate();
    const seen = new Set<string>();
    for (const change of changes) {
      const { day, dutyKey, personName } = change ?? {};
      if (!Number.isInteger(day) || day < 1 || day > days || !DUTY_ORDER.includes(dutyKey)) {
        return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
      }
      if (seen.has(`${day}:${dutyKey}`)) return { ok: false, error: "ข้อมูลซ้ำ" };
      seen.add(`${day}:${dutyKey}`);
      if (!dutyApplies(dutyKey, new Date(year, month, day).getDay())) {
        return { ok: false, error: `วันที่ ${day} ไม่มีเวรนี้` };
      }
      const name = typeof personName === "string" ? personName.trim() : "";
      const allowed = MARKERS.includes(name) ||
        rosters[DUTY_ROLE[dutyKey]].some((option) => option.value === name) ||
        (!!name && data[day]?.entries[dutyKey] === name);
      if (!allowed) return { ok: false, error: `วันที่ ${day}: ชื่อไม่ได้อยู่ในรายชื่อเวร` };
    }
    await saveDutySlotRecords(changes.map(({ day, dutyKey, personName }) => ({
      year, month, day, dutyKey, personName: personName.trim(),
      updatedByLineUserId: session.user.lineUserId || null,
    })));
    return { ok: true, saved: changes.length };
  } catch (err) {
    console.error("savePlannerChanges failed", err);
    return { ok: false, error: "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง" };
  }
}

/**
 * Pull the year's holidays from the Bank of Thailand API into `duty_days`
 * now, instead of waiting for the nightly job. Holidays are only added.
 */
export async function refreshPlannerHolidays(
  year: number,
): Promise<{ ok: true; added: number } | { ok: false; error: string }> {
  if (!await requireAdminSession()) return { ok: false, error: "เฉพาะผู้ดูแลระบบ" };
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return { ok: false, error: "ปีไม่ถูกต้อง" };
  const result = await syncBotHolidays([year]);
  if ("skipped" in result) return { ok: false, error: "ยังไม่ได้ตั้งค่า BOT API" };
  const [row] = result.results;
  if (!row || "failed" in row) return { ok: false, error: "ดึงวันหยุดจาก ธปท. ไม่สำเร็จ" };
  return { ok: true, added: row.added };
}
