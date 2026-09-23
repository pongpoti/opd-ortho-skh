"use server";

import { PHYSICIANS } from "@/lib/physicians";
import { requireAdminSession } from "@/lib/require-admin";

import {
  buildCastCaseLogPdf,
  buildCastCaseLogPdfByPhysicians,
  castCaseLogFilename,
  type CastCaseLogPdfStaff,
} from "./cast-case-log-pdf";
import { listCastVisitsForAdmin, type CastVisitSummary } from "./cast-dashboard-actions";

export type ExportCastCaseLogResult =
  | { ok: true; filename: string; pdfBase64: string }
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

function groupByDoctor(visits: CastVisitSummary[]): Map<string, CastVisitSummary[]> {
  const map = new Map<string, CastVisitSummary[]>();
  for (const visit of visits) {
    const list = map.get(visit.doctorName) ?? [];
    list.push(visit);
    map.set(visit.doctorName, list);
  }
  return map;
}

/**
 * Export cast-room case log PDF for a month, optionally filtered to one physician.
 * When doctorName is omitted, emits one form section per physician who has visits
 * (ordered by the PHYSICIANS roster, then any remaining names).
 */
export async function exportCastCaseLogPdf(
  year: number,
  month: number,
  doctorName?: string
): Promise<ExportCastCaseLogResult> {
  const session = await requireAdminSession();
  if (!session) {
    return { ok: false, error: "ไม่มีสิทธิ์เข้าถึง" };
  }

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return { ok: false, error: "เดือนหรือปีไม่ถูกต้อง" };
  }

  const list = await listCastVisitsForAdmin(year, month);
  if (!list.ok) return list;

  const byDoctor = groupByDoctor(list.visits);

  if (doctorName) {
    const visits = byDoctor.get(doctorName) ?? [];
    const bytes = await buildCastCaseLogPdf({
      month,
      year,
      staff: staffFor(doctorName),
      visits,
    });
    return {
      ok: true,
      filename: castCaseLogFilename(month, year, doctorName),
      pdfBase64: toBase64(bytes),
    };
  }

  const rosterOrder = [...PHYSICIANS];
  const seen = new Set<string>();
  const groups: Array<{ staff: CastCaseLogPdfStaff; visits: CastVisitSummary[] }> = [];

  for (const name of rosterOrder) {
    const visits = byDoctor.get(name);
    if (!visits?.length) continue;
    seen.add(name);
    groups.push({ staff: staffFor(name), visits });
  }

  for (const [name, visits] of byDoctor) {
    if (seen.has(name) || visits.length === 0) continue;
    groups.push({ staff: staffFor(name), visits });
  }

  const bytes = await buildCastCaseLogPdfByPhysicians(month, year, groups);
  return {
    ok: true,
    filename: castCaseLogFilename(month, year),
    pdfBase64: toBase64(bytes),
  };
}
