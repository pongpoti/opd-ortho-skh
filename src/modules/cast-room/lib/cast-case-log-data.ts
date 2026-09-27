import { and, asc, gte, lte } from "drizzle-orm";

import { db } from "@/db";
import { castLogs } from "@/db/schema";

import type { CastVisitSummary } from "./cast-dashboard-actions";

function monthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

/** Fold per-cast-type rows into one summary per visit, keeping row order. */
export function groupCastRows(
  rows: Array<{
    visitId: string;
    shiftDate: string;
    visitTime: string | null;
    hn: string;
    patientName: string;
    diagnosis: string | null;
    doctorName: string;
    castType: string;
    castLabel: string;
    count: number;
    loggedByName: string | null;
    createdAt: Date;
  }>
): CastVisitSummary[] {
  const byVisit = new Map<string, CastVisitSummary>();

  for (const row of rows) {
    let visit = byVisit.get(row.visitId);
    if (!visit) {
      visit = {
        visitId: row.visitId,
        shiftDate: row.shiftDate,
        // Postgres returns "HH:MM:SS"; the app works in "HH:mm".
        visitTime: row.visitTime ? row.visitTime.slice(0, 5) : null,
        hn: row.hn,
        patientName: row.patientName,
        diagnosis: row.diagnosis ?? "",
        doctorName: row.doctorName,
        loggedByName: row.loggedByName,
        createdAt: row.createdAt.toISOString(),
        casts: [],
      };
      byVisit.set(row.visitId, visit);
    }
    visit.casts.push({ id: row.castType, count: row.count, label: row.castLabel });
  }

  return [...byVisit.values()];
}

/** Load cast visits for a calendar month (no auth). Callers must enforce access. */
export async function loadCastVisitsForMonth(
  year: number,
  month: number
): Promise<CastVisitSummary[]> {
  const { start, end } = monthRange(year, month);
  const rows = await db
    .select()
    .from(castLogs)
    .where(and(gte(castLogs.shiftDate, start), lte(castLogs.shiftDate, end)))
    .orderBy(asc(castLogs.shiftDate), asc(castLogs.createdAt));

  return groupCastRows(rows);
}
