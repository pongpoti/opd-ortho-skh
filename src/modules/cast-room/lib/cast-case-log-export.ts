"use server";

import { headers } from "next/headers";

import { PHYSICIANS } from "@/lib/physicians";
import { requireAdminSession } from "@/lib/require-admin";

import { loadCastVisitsForMonth } from "./cast-case-log-data";
import { CAST_CASE_LOG_ROWS_PER_PAGE } from "./cast-case-log-constants";
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
 * 2. Server action — validates visits and issues a short-lived signed URL.
 * 3. Download — open `/api/cast-room/case-log-pdf?token=…` (HTTPS). Blob/`a.download`
 *    fails silently inside LINE WebView; a real URL shows the PDF.
 * 4. Share route — verifies HMAC token, regenerates PDF on the fly, streams it.
 */

export type CastCaseLogPdfLinkResult =
  | {
      ok: true;
      pdfUrl: string;
      filename: string;
      caseCount: number;
      pageCount: number;
      monthLabel: string;
      doctorName: string;
    }
  | { ok: false; error: string };

const DEFAULT_STAFF_META = {
  position: "แพทย์",
  group: "ศัลยกรรมกระดูก",
} as const;

function staffFor(name: string): CastCaseLogPdfStaff {
  return { name, ...DEFAULT_STAFF_META };
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

/**
 * Create a time-limited HTTPS URL that streams the PDF.
 * Used for download/view — required because LIFF WebView cannot save blob URLs.
 */
export async function createCastCaseLogPdfLink(
  year: number,
  month: number,
  doctorName?: string
): Promise<CastCaseLogPdfLinkResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "ไม่มีสิทธิ์เข้าถึง" };

  if (!doctorName) {
    return { ok: false, error: "กรุณาเลือกแพทย์ก่อนดาวน์โหลด" };
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
    return { ok: false, error: "ระบบดาวน์โหลดยังไม่พร้อม (AUTH_SECRET)" };
  }

  const origin = await appOrigin();
  const pdfUrl = `${origin}${buildCastCaseLogSharePath(token)}`;

  return {
    ok: true,
    pdfUrl,
    filename,
    caseCount,
    pageCount: pages,
    monthLabel: label,
    doctorName,
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
