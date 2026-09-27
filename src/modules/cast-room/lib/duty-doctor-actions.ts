"use server";

import { auth } from "@/auth";

import { resolveDutyDoctor } from "@/modules/cast-room/lib/duty-doctor";
import { fetchDutyOverridesForMonth } from "@/modules/duty-schedule/lib/duty-overrides";
import { parseISO } from "@/modules/cast-room/lib/thai-date";

/** Resolve on-duty staff doctor including admin overrides. */
export async function resolveDutyDoctorAction(iso: string): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.isRegistered) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const { year, month } = parseISO(iso);
  const overrides = await fetchDutyOverridesForMonth(year, month);
  return resolveDutyDoctor(iso, overrides);
}
