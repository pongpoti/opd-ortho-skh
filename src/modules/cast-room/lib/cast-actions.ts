"use server";

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

const HN_PATTERN = /^\d{7}$/;
const SHIFT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function submitCastLog(input: CastLogInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.isRegistered) {
    return { ok: false, error: "กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล" };
  }

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
  if (!PHYSICIANS.includes(input.doctorName as (typeof PHYSICIANS)[number])) {
    return { ok: false, error: "กรุณาเลือกแพทย์" };
  }
  const casts = input.casts.filter((c) => c.count > 0 && c.count <= 20);
  if (casts.length === 0) {
    return { ok: false, error: "กรุณาเลือกชนิดเฝือกอย่างน้อย 1 รายการ" };
  }
  if (!input.visitId) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  }

  const diagnosis = input.diagnosis.trim() || null;

  await db.insert(castLogs).values(
    casts.map((c) => ({
      visitId: input.visitId,
      shiftDate: input.shiftDate,
      hn: input.hn,
      patientName,
      diagnosis,
      doctorName: input.doctorName,
      castType: c.id,
      castLabel: castLabel(c.id),
      count: c.count,
      loggedByLineUserId: session.user.lineUserId || null,
      loggedByName: session.user.firstName ?? null,
    }))
  );

  return { ok: true };
}
