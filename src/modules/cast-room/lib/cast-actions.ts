"use server";

import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { castLogs } from "@/db/schema";
import { PHYSICIANS } from "@/lib/physicians";

import { castLabel } from "./cast-types";

export interface CastLogCastInput {
  id: string;
  count: number;
}

export interface CastLogInput {
  visitId: string;
  shiftDate: string;
  hn: string;
  patientName: string;
  diagnosis: string;
  doctorName: string;
  casts: CastLogCastInput[];
}

type ActionResult = { ok: true } | { ok: false; error: string };
type Validated = { ok: true; patientName: string; diagnosis: string; casts: CastLogCastInput[] } | { ok: false; error: string };

const HN_PATTERN = /^\d{7}$/;
const SHIFT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function validate(input: CastLogInput): Validated {
  if (!SHIFT_DATE_PATTERN.test(input.shiftDate)) {
    return { ok: false, error: "วันที่ไม่ถูกต้อง" };
  }
  if (!HN_PATTERN.test(input.hn)) {
    return { ok: false, error: "HN ต้องมีให้ครบ 7 หลัก" };
  }
  const patientName = input.patientName.trim();
  if (patientName.length < 3) {
    return { ok: false, error: "กรุณากรอกชื่อ-สกุลผู้ป่วย" };
  }
  const diagnosis = input.diagnosis.trim();
  if (!diagnosis) {
    return { ok: false, error: "กรุณากรอกการวินิจฉัย" };
  }
  if (!PHYSICIANS.includes(input.doctorName as (typeof PHYSICIANS)[number])) {
    return { ok: false, error: "ไม่พบแพทย์เวรสำหรับวันที่นี้" };
  }
  const casts = input.casts.filter((c) => c.count > 0 && c.count <= 20);
  if (casts.length === 0) {
    return { ok: false, error: "กรุณาเลือกชนิดเฝือกอย่างน้อย 1 รายการ" };
  }
  if (!input.visitId) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  }
  return { ok: true, patientName, diagnosis, casts };
}

function buildRows(
  input: CastLogInput,
  v: Extract<Validated, { ok: true }>,
  loggedByLineUserId: string | null,
  loggedByName: string | null
) {
  return v.casts.map((c) => ({
    visitId: input.visitId,
    shiftDate: input.shiftDate,
    hn: input.hn,
    patientName: v.patientName,
    diagnosis: v.diagnosis || null,
    doctorName: input.doctorName,
    castType: c.id,
    castLabel: castLabel(c.id),
    count: c.count,
    loggedByLineUserId,
    loggedByName,
  }));
}

export async function submitCastLog(input: CastLogInput): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.isRegistered) {
    return { ok: false, error: "กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล" };
  }

  const validated = validate(input);
  if (!validated.ok) return validated;

  await db
    .insert(castLogs)
    .values(buildRows(input, validated, session.user.lineUserId || null, session.user.firstName ?? null));

  return { ok: true };
}

/** Same shape as a fresh submit, but for a visitId that's already on file:
 * delete the visit's existing rows first, then insert the edited set. Cast
 * types can be added or removed between the two, so a diff-based update
 * isn't worth it -- the visit's rows are always small in number. */
export async function updateCastLog(input: CastLogInput): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.isRegistered) {
    return { ok: false, error: "กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล" };
  }
  if (!input.visitId) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  }

  const validated = validate(input);
  if (!validated.ok) return validated;

  await db.delete(castLogs).where(eq(castLogs.visitId, input.visitId));
  await db
    .insert(castLogs)
    .values(buildRows(input, validated, session.user.lineUserId || null, session.user.firstName ?? null));

  return { ok: true };
}
