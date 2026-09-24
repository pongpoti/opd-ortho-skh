"use server";

import { headers } from "next/headers";

import { PHYSICIANS } from "@/lib/physicians";
import { requireAdminSession } from "@/lib/require-admin";

import { loadCastVisitsForMonth } from "./cast-case-log-data";
import { CAST_CASE_LOG_PAY_PER_CASE, CAST_CASE_LOG_ROWS_PER_PAGE } from "./cast-case-log-constants";
import {
  buildCastCaseLogPdf,
  buildCastCaseLogPdfByPhysicians,
  castCaseLogFilename,
  type CastCaseLogPdfStaff,
} from "./cast-case-log-pdf";
import {
  buildCastCaseLogSharePath,
  createCastCaseLogShareToken,
  verifyCastCaseLogShareToken,
} from "./cast-case-log-share";
import type { CastVisitSummary } from "./cast-dashboard-actions";
import { isWithinRecentMonths, THAI_MONTHS } from "./thai-date";

/**
 * Cast-room case-log PDF architecture
 * -----------------------------------
 * 1. UI (`CastCaseLogPdfPage`) — admin picks month + physician, sees case count.
 * 2. Server action — loads visits, builds PDF bytes (or a signed share token).
 * 3. Download — PDF bytes returned as base64 for immediate file save.
 * 4. Send to LINE chat — signed URL (`/api/cast-room/case-log-pdf?token=…`)
 *    shared via `liff.shareTargetPicker` (Flex URI button; no Messaging API
 *    push / binary PDF attachment required).
 * 5. Share route — verifies HMAC token, regenerates PDF on the fly, streams it.
 */

export type ExportCastCaseLogResult =
  | {
      ok: true;
      filename: string;
      pdfBase64: string;
      caseCount: number;
      pageCount: number;
      monthLabel: string;
      doctorName: string | null;
    }
  | { ok: false; error: string };

export type ShareCastCaseLogResult =
  | {
      ok: true;
      shareUrl: string;
      filename: string;
      caseCount: number;
      pageCount: number;
      monthLabel: string;
      doctorName: string | null;
      chatText: string;
    }
  | { ok: false; error: string };

const DEFAULT_STAFF_META = {
  position: "แพทย์",
  group: "ศัลยกรรมกระดูก",
} as const;

function staffFor(name: string): CastCaseLogPdfStaff {
  return { name, ...DEFAULT_STAFF_META };
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function monthLabel(year: number, month: number): string {
  return `${THAI_MONTHS[month - 1] ?? ""} ${year + 543}`;
}

function pageCountFor(caseCount: number): number {
  if (caseCount <= 0) return 1;
  return Math.ceil(caseCount / CAST_CASE_LOG_ROWS_PER_PAGE);
}

function validateMonth(year: number, month: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return "เดือนหรือปีไม่ถูกต้อง";
  }
  if (!isWithinRecentMonths(year, month, 6)) {
    return "เลือกได้เฉพาะ 6 เดือนก่อนหน้า (ไม่รวมเดือนปัจจุบัน)";
  }
  return null;
}

function groupByDoctor(visits: CastVisitSummary[]): Map<string, CastVisitSummary[]> {
  const map = new Map<string, CastVisitSummary[]>();
  for (const visit of visits) {
    const list = map.get(visit.doctorName) ?? [];
    list.push(visit);
    map.set(visit.doctorName, list);
  }
  return map;
}

function selectVisits(
  visits: CastVisitSummary[],
  doctorName: string | undefined
): {
  selected: CastVisitSummary[];
  groups: Array<{ staff: CastCaseLogPdfStaff; visits: CastVisitSummary[] }>;
} {
  const byDoctor = groupByDoctor(visits);

  if (doctorName) {
    const selected = byDoctor.get(doctorName) ?? [];
    return {
      selected,
      groups: [{ staff: staffFor(doctorName), visits: selected }],
    };
  }

  const rosterOrder = [...PHYSICIANS];
  const seen = new Set<string>();
  const groups: Array<{ staff: CastCaseLogPdfStaff; visits: CastVisitSummary[] }> = [];

  for (const name of rosterOrder) {
    const list = byDoctor.get(name);
    if (!list?.length) continue;
    seen.add(name);
    groups.push({ staff: staffFor(name), visits: list });
  }
  for (const [name, list] of byDoctor) {
    if (seen.has(name) || list.length === 0) continue;
    groups.push({ staff: staffFor(name), visits: list });
  }

  return { selected: visits, groups };
}

async function buildPdfBytes(
  year: number,
  month: number,
  doctorName: string | undefined,
  visits: CastVisitSummary[]
): Promise<{ bytes: Uint8Array; caseCount: number; filename: string }> {
  const { selected, groups } = selectVisits(visits, doctorName);

  if (doctorName) {
    const bytes = await buildCastCaseLogPdf({
      month,
      year,
      staff: staffFor(doctorName),
      visits: selected,
    });
    return {
      bytes,
      caseCount: selected.length,
      filename: castCaseLogFilename(month, year, doctorName),
    };
  }

  const bytes = await buildCastCaseLogPdfByPhysicians(month, year, groups);
  return {
    bytes,
    caseCount: selected.length,
    filename: castCaseLogFilename(month, year),
  };
}

async function appOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/** Generate PDF bytes for download (admin only). Requires a selected physician. */
export async function exportCastCaseLogPdf(
  year: number,
  month: number,
  doctorName?: string
): Promise<ExportCastCaseLogResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "ไม่มีสิทธิ์เข้าถึง" };

  if (!doctorName) {
    return { ok: false, error: "กรุณาเลือกแพทย์ก่อนดาวน์โหลด" };
  }

  const invalid = validateMonth(year, month);
  if (invalid) return { ok: false, error: invalid };

  try {
    const visits = await loadCastVisitsForMonth(year, month);
    if (visits.length === 0) {
      return { ok: false, error: "ไม่มีรายการในเดือนที่เลือก" };
    }
    const { selected } = selectVisits(visits, doctorName);
    if (selected.length === 0) {
      return { ok: false, error: "ไม่มีรายการของแพทย์นี้ในเดือนที่เลือก" };
    }
    const { bytes, caseCount, filename } = await buildPdfBytes(year, month, doctorName, visits);
    return {
      ok: true,
      filename,
      pdfBase64: toBase64(bytes),
      caseCount,
      pageCount: pageCountFor(caseCount),
      monthLabel: monthLabel(year, month),
      doctorName,
    };
  } catch {
    return { ok: false, error: "สร้าง PDF ไม่สำเร็จ" };
  }
}

/**
 * Create a time-limited share URL so the admin can send the PDF into a LINE chat
 * via LIFF shareTargetPicker (opens the PDF when tapped).
 */
export async function createCastCaseLogShareLink(
  year: number,
  month: number,
  doctorName?: string
): Promise<ShareCastCaseLogResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "ไม่มีสิทธิ์เข้าถึง" };

  if (!doctorName) {
    return { ok: false, error: "กรุณาเลือกแพทย์ก่อนส่งในแชท" };
  }

  const invalid = validateMonth(year, month);
  if (invalid) return { ok: false, error: invalid };

  const visits = await loadCastVisitsForMonth(year, month);
  if (visits.length === 0) {
    return { ok: false, error: "ไม่มีรายการในเดือนที่เลือก" };
  }
  const { selected } = selectVisits(visits, doctorName);
  if (selected.length === 0) {
    return { ok: false, error: "ไม่มีรายการของแพทย์นี้ในเดือนที่เลือก" };
  }
  const caseCount = selected.length;
  const pages = pageCountFor(caseCount);
  const label = monthLabel(year, month);
  const filename = castCaseLogFilename(month, year, doctorName);

  let token: string;
  try {
    token = createCastCaseLogShareToken(year, month, doctorName);
  } catch {
    return { ok: false, error: "ระบบแชร์ยังไม่พร้อม (AUTH_SECRET)" };
  }

  const origin = await appOrigin();
  const shareUrl = `${origin}${buildCastCaseLogSharePath(token)}`;

  const chatText = [
    "📋 บันทึกห้องเฝือก (นอกเวลาราชการ)",
    `เดือน: ${label}`,
    `แพทย์: ${doctorName}`,
    `จำนวน: ${caseCount} รายการ (${pages} หน้า)`,
    `รวมค่าตอบแทน: ${caseCount * CAST_CASE_LOG_PAY_PER_CASE} บาท`,
    "",
    "ดาวน์โหลด PDF:",
    shareUrl,
  ].join("\n");

  return {
    ok: true,
    shareUrl,
    filename,
    caseCount,
    pageCount: pages,
    monthLabel: label,
    doctorName,
    chatText,
  };
}

/** Public signed download — token is the auth (no session). */
export async function buildCastCaseLogPdfFromShareToken(
  token: string
): Promise<{ ok: true; bytes: Uint8Array; filename: string } | { ok: false; error: string }> {
  const payload = verifyCastCaseLogShareToken(token);
  if (!payload) return { ok: false, error: "ลิงก์หมดอายุหรือไม่ถูกต้อง" };

  try {
    const visits = await loadCastVisitsForMonth(payload.year, payload.month);
    const doctorName = payload.doctorName || undefined;
    const { bytes, filename } = await buildPdfBytes(
      payload.year,
      payload.month,
      doctorName,
      visits
    );
    return { ok: true, bytes, filename };
  } catch {
    return { ok: false, error: "สร้าง PDF ไม่สำเร็จ" };
  }
}
