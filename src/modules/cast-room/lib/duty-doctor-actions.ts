"use server";

import { auth } from "@/auth";

import { resolveDutyDoctor } from "@/modules/cast-room/lib/duty-doctor";
import { fetchDutyMonthData } from "@/modules/duty-schedule/lib/duty-repository";
import { parseISO } from "@/modules/cast-room/lib/thai-date";

/** Resolve on-duty staff doctor from the complete Neon roster. */
export async function resolveDutyDoctorAction(iso: string): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.isRegistered) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const { year, month, day } = parseISO(iso);
  const date = new Date(Date.UTC(year, month, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) return null;
  const monthData = await fetchDutyMonthData(year, month);
  return resolveDutyDoctor(iso, monthData);
}
