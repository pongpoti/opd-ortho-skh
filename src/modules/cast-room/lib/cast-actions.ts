"use server";

import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { castLogs } from "@/db/schema";
import { canAccessCastRoom } from "@/lib/module-access";
import { PHYSICIANS } from "@/lib/physicians";

import { CAST_TYPES, castLabel } from "./cast-types";

export interface CastLogCastInput {
  id: string;
  count: number;
}

export interface CastLogInput {
  shiftDate: string;
  /** "HH:mm" picked in the form, or null when none was picked. */
  visitTime: string | null;
  hn: string;
  patientName: string;
  diagnosis: string;
  doctorName: string;
  casts: CastLogCastInput[];
}

export interface CastLogUpdateInput extends CastLogInput {
  visitId: string;
}

type ActionResult = { ok: true } | { ok: false; error: string };
type SubmitResult = { ok: true; visitId: string } | { ok: false; error: string };
type Validated =
  | {
      ok: true;
      patientName: string;
      diagnosis: string;
      visitTime: string | null;
      casts: CastLogCastInput[];
    }
  | { ok: false; error: string };

const HN_PATTERN = /^\d{7}$/;
const SHIFT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VISIT_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_CAST_COUNT = 20;
const VALID_CAST_IDS = new Set(CAST_TYPES.map((t) => t.id));

/** Shape check plus calendar check — "2026-02-31" would otherwise reach Postgres and 500. */
function isValidShiftDate(value: string): boolean {
  if (!SHIFT_DATE_PATTERN.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function validate(input: CastLogInput): Validated {
  if (!isValidShiftDate(input.shiftDate)) {
    return { ok: false, error: "วันที่ไม่ถูกต้อง" };
  }
  // Action input is untrusted; a missing field means "not picked".
  const visitTime = input.visitTime ?? null;
  if (visitTime !== null && !VISIT_TIME_PATTERN.test(visitTime)) {
    return { ok: false, error: "เวลาไม่ถูกต้อง" };
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

  const casts: CastLogCastInput[] = [];
  for (const c of input.casts) {
    if (!VALID_CAST_IDS.has(c.id)) {
      return { ok: false, error: "ชนิดเฝือกไม่ถูกต้อง" };
    }
    if (!Number.isInteger(c.count) || c.count < 1) {
      continue;
    }
    if (c.count > MAX_CAST_COUNT) {
      return { ok: false, error: `จำนวนเฝือกต้องไม่เกิน ${MAX_CAST_COUNT}` };
    }
    casts.push(c);
  }
  if (casts.length === 0) {
    return { ok: false, error: "กรุณาเลือกชนิดเฝือกอย่างน้อย 1 รายการ" };
  }

  return { ok: true, patientName, diagnosis, visitTime, casts };
}

function buildRows(
  visitId: string,
  input: CastLogInput,
  v: Extract<Validated, { ok: true }>,
  loggedByLineUserId: string | null,
  loggedByName: string | null
) {
  return v.casts.map((c) => ({
    visitId,
    shiftDate: input.shiftDate,
    visitTime: v.visitTime,
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

/** Log a new visit. The server mints the visitId (returned for a follow-up
 * edit) so a client can never append rows to someone else's visit. */
export async function submitCastLog(input: CastLogInput): Promise<SubmitResult> {
  const session = await auth();
  if (!session?.user?.isRegistered) {
    return { ok: false, error: "กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล" };
  }
  if (!canAccessCastRoom(session.user.role)) {
    return { ok: false, error: "ไม่มีสิทธิ์บันทึกข้อมูลห้องเฝือก" };
  }

  const validated = validate(input);
  if (!validated.ok) return validated;

  const visitId = crypto.randomUUID();
  await db
    .insert(castLogs)
    .values(
      buildRows(visitId, input, validated, session.user.lineUserId || null, session.user.firstName ?? null)
    );

  return { ok: true, visitId };
}

/** Same shape as a fresh submit, but for a visitId that's already on file:
 * delete the visit's existing rows first, then insert the edited set. Cast
 * types can be added or removed between the two, so a diff-based update
 * isn't worth it -- the visit's rows are always small in number.
 * Delete + insert run in one Neon HTTP transaction via db.batch(). */
export async function updateCastLog(input: CastLogUpdateInput): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.isRegistered) {
    return { ok: false, error: "กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล" };
  }
  if (!canAccessCastRoom(session.user.role)) {
    return { ok: false, error: "ไม่มีสิทธิ์แก้ไขข้อมูลห้องเฝือก" };
  }
  if (!input.visitId) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  }

  const validated = validate(input);
  if (!validated.ok) return validated;

  const existing = await db.query.castLogs.findMany({
    where: eq(castLogs.visitId, input.visitId),
    columns: { loggedByLineUserId: true, loggedByName: true, createdAt: true },
  });
  if (existing.length === 0) {
    return { ok: false, error: "ไม่พบรายการที่ต้องการแก้ไข" };
  }

  const isAdmin = session.user.role === "admin";
  const lineUserId = session.user.lineUserId;
  const ownsVisit = existing.every(
    (row) => !row.loggedByLineUserId || row.loggedByLineUserId === lineUserId
  );
  if (!isAdmin && !ownsVisit) {
    return { ok: false, error: "ไม่มีสิทธิ์แก้ไขรายการนี้" };
  }

  const preserveLogger = isAdmin && !ownsVisit && existing.length > 0;
  // Keep the original log time: the case-log PDF orders rows by createdAt
  // and prints it when no visit time was picked.
  const createdAt = new Date(Math.min(...existing.map((row) => row.createdAt.getTime())));
  const rows = buildRows(
    input.visitId,
    input,
    validated,
    preserveLogger ? existing[0].loggedByLineUserId : session.user.lineUserId || null,
    preserveLogger ? existing[0].loggedByName : (session.user.firstName ?? null)
  ).map((row) => ({ ...row, createdAt }));

  await db.batch([
    db.delete(castLogs).where(eq(castLogs.visitId, input.visitId)),
    db.insert(castLogs).values(rows),
  ]);

  return { ok: true };
}
