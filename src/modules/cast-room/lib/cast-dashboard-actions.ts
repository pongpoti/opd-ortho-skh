"use server";

import { and, desc, eq, gte, lte } from "drizzle-orm";

import { db } from "@/db";
import { castLogs } from "@/db/schema";
import { requireAdminSession } from "@/lib/require-admin";

export type CastVisitCast = {
  id: string;
  count: number;
  label: string;
};

export type CastVisitSummary = {
  visitId: string;
  shiftDate: string;
  hn: string;
  patientName: string;
  diagnosis: string;
  doctorName: string;
  loggedByName: string | null;
  createdAt: string;
  casts: CastVisitCast[];
};

type ListResult = { ok: true; visits: CastVisitSummary[] } | { ok: false; error: string };
type VisitResult = { ok: true; visit: CastVisitSummary } | { ok: false; error: string };

function monthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function groupRows(
  rows: Array<{
    visitId: string;
    shiftDate: string | Date;
    hn: string;
    patientName: string;
    diagnosis: string | null;
    doctorName: string;
    castType: string;
    castLabel: string;
    count: number;
    loggedByName: string | null;
    createdAt: Date | string;
  }>
): CastVisitSummary[] {
  const byVisit = new Map<string, CastVisitSummary>();

  for (const row of rows) {
    let visit = byVisit.get(row.visitId);
    if (!visit) {
      const shiftDate =
        typeof row.shiftDate === "string"
          ? row.shiftDate.slice(0, 10)
          : `${row.shiftDate.getUTCFullYear()}-${String(row.shiftDate.getUTCMonth() + 1).padStart(2, "0")}-${String(row.shiftDate.getUTCDate()).padStart(2, "0")}`;
      const createdAt =
        row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt);

      visit = {
        visitId: row.visitId,
        shiftDate,
        hn: row.hn,
        patientName: row.patientName,
        diagnosis: row.diagnosis ?? "",
        doctorName: row.doctorName,
        loggedByName: row.loggedByName,
        createdAt,
        casts: [],
      };
      byVisit.set(row.visitId, visit);
    }
    visit.casts.push({ id: row.castType, count: row.count, label: row.castLabel });
  }

  return [...byVisit.values()];
}

export async function listCastVisitsForAdmin(year: number, month: number): Promise<ListResult> {
  const session = await requireAdminSession();
  if (!session) {
    return { ok: false, error: "ไม่มีสิทธิ์เข้าถึง" };
  }

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return { ok: false, error: "เดือนหรือปีไม่ถูกต้อง" };
  }

  const { start, end } = monthRange(year, month);
  const rows = await db
    .select()
    .from(castLogs)
    .where(and(gte(castLogs.shiftDate, start), lte(castLogs.shiftDate, end)))
    .orderBy(desc(castLogs.shiftDate), desc(castLogs.createdAt));

  return { ok: true, visits: groupRows(rows) };
}

export async function getCastVisitForAdmin(visitId: string): Promise<VisitResult> {
  const session = await requireAdminSession();
  if (!session) {
    return { ok: false, error: "ไม่มีสิทธิ์เข้าถึง" };
  }

  if (!visitId) {
    return { ok: false, error: "ไม่พบรายการ" };
  }

  const rows = await db.select().from(castLogs).where(eq(castLogs.visitId, visitId));
  if (rows.length === 0) {
    return { ok: false, error: "ไม่พบรายการ" };
  }

  const [visit] = groupRows(rows);
  return { ok: true, visit };
}
