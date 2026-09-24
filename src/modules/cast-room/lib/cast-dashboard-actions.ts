"use server";

import { and, desc, eq, gte, like, lte } from "drizzle-orm";

import { db } from "@/db";
import { castLogs } from "@/db/schema";
import { requireAdminSession } from "@/lib/require-admin";

import { CAST_TYPES } from "./cast-types";

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
    shiftDate: string;
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

type DeleteResult = { ok: true } | { ok: false; error: string };

export async function deleteCastVisitForAdmin(visitId: string): Promise<DeleteResult> {
  const session = await requireAdminSession();
  if (!session) {
    return { ok: false, error: "ไม่มีสิทธิ์เข้าถึง" };
  }

  if (!visitId) {
    return { ok: false, error: "ไม่พบรายการ" };
  }

  const existing = await db.query.castLogs.findMany({
    where: eq(castLogs.visitId, visitId),
    columns: { visitId: true },
  });
  if (existing.length === 0) {
    return { ok: false, error: "ไม่พบรายการที่ต้องการลบ" };
  }

  await db.delete(castLogs).where(eq(castLogs.visitId, visitId));
  return { ok: true };
}

const SEED_VISIT_PREFIX = "seed-pongsit-2026-08-";
const SEED_DOCTOR = "ปองสิทธิ์ โพธิคุณ";
const SEED_PATIENTS = [
  "สมชาย ใจดี",
  "สมหญิง รักเรียน",
  "วิชัย มีสุข",
  "นภา สว่าง",
  "ประยุทธ์ เจริญ",
  "กมลวรรณ ทองดี",
  "อนุชา พิทักษ์",
  "สุภาพร งามดี",
  "ธนาคาร รุ่งเรือง",
  "พิมพ์ใจ เย็นใจ",
  "อริสา ดวงดี",
  "มานพ ตั้งตรง",
  "รัตนา สุขใจ",
  "ชัยวัฒน์ ยั่งยืน",
  "เบญจมาศ แก้วใส",
];
const SEED_DIAGNOSES = [
  "Fracture distal radius",
  "Ankle sprain",
  "Metacarpal fracture",
  "Colles fracture",
  "Tibial plateau fracture",
  "Finger dislocation",
  "Thumb UCL injury",
  "Olecranon fracture",
  "Patella fracture",
  "Boxers fracture",
  "Distal fibula fracture",
  "Scaphoid fracture",
];

type SeedResult =
  | { ok: true; visitCount: number }
  | { ok: false; error: string };

/** Idempotent admin seed: 1 visit/day for ปองสิทธิ์ across August 2026. */
export async function seedPongsitAugust2026Dummy(): Promise<SeedResult> {
  const session = await requireAdminSession();
  if (!session) {
    return { ok: false, error: "ไม่มีสิทธิ์เข้าถึง" };
  }

  try {
    await db.delete(castLogs).where(like(castLogs.visitId, `${SEED_VISIT_PREFIX}%`));

    const rows: Array<typeof castLogs.$inferInsert> = [];
    for (let day = 1; day <= 31; day++) {
      const visitId = `${SEED_VISIT_PREFIX}${String(day).padStart(2, "0")}`;
      const shiftDate = `2026-08-${String(day).padStart(2, "0")}`;
      const hn = String(1_000_000 + day).padStart(7, "0");
      const patientName = SEED_PATIENTS[(day - 1) % SEED_PATIENTS.length];
      const diagnosis = SEED_DIAGNOSES[(day - 1) % SEED_DIAGNOSES.length];
      const primary = CAST_TYPES[(day - 1) % CAST_TYPES.length];
      const hour = 17 + (day % 4);
      const minute = (day * 7) % 60;
      const createdAt = new Date(
        `2026-08-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+07:00`
      );

      rows.push({
        visitId,
        shiftDate,
        hn,
        patientName,
        diagnosis,
        doctorName: SEED_DOCTOR,
        castType: primary.id,
        castLabel: primary.label,
        count: day % 3 === 0 ? 2 : 1,
        loggedByLineUserId: null,
        loggedByName: "seed-dummy",
        createdAt,
      });

      if (day % 5 === 0) {
        const secondary = CAST_TYPES[day % CAST_TYPES.length];
        rows.push({
          visitId,
          shiftDate,
          hn,
          patientName,
          diagnosis,
          doctorName: SEED_DOCTOR,
          castType: secondary.id,
          castLabel: secondary.label,
          count: 1,
          loggedByLineUserId: null,
          loggedByName: "seed-dummy",
          createdAt,
        });
      }
    }

    await db.insert(castLogs).values(rows);
    return { ok: true, visitCount: 31 };
  } catch {
    return { ok: false, error: "สร้างข้อมูลทดสอบไม่สำเร็จ" };
  }
}
