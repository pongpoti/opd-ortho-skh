import {
  CLINIC,
  EXCLUDED_DEPARTMENTS,
  REQUIRED_COLUMNS,
  STAFF_NAMES,
  TIME_WINDOW,
} from "./config";

export type ParsedFile = {
  headers: string[];
  rows: Record<string, string>[];
};

export type FilePart = "first" | "second";

export type DateRange = { startDay: number; endDay: number };

export type GroupSummary = {
  durationHms: string;
  durationMinutes: string;
  count: number;
};

export type CalculationResult = {
  all: GroupSummary;
  staff: GroupSummary;
  nonStaff: GroupSummary;
  audit: {
    monthKey: string;
    firstRange: DateRange;
    secondRange: DateRange;
    totalRows: number;
    usedRows: number;
    droppedForDuration: number;
  };
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function timeSeconds(value: string): number | null {
  const match = TIME_RE.exec(value);
  if (!match) return null;
  const [, h, m, s] = match;
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

export function toMonthKey(gregorianYear: number, month: number): string {
  return `${gregorianYear}-${String(month).padStart(2, "0")}`;
}

export function getLastDayOfMonth(gregorianYear: number, month: number): number {
  return new Date(gregorianYear, month, 0).getDate();
}

export function buddhistYearToGregorian(buddhistYear: number): number {
  if (!Number.isInteger(buddhistYear) || buddhistYear < 2500 || buddhistYear > 2599) {
    throw new Error("ปีต้องเป็นปี พ.ศ. 4 หลัก ระหว่าง 2500 ถึง 2599");
  }
  return buddhistYear - 543;
}

/** Splits on \n (CRLF-safe via trailing \r strip) and drops fully-blank lines. */
function splitLines(text: string): string[] {
  const withoutBom = text.replace(/^﻿/, "");
  return withoutBom
    .split("\n")
    .map((line) => line.replace(/\r$/, ""))
    .filter((line) => line.trim() !== "");
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  if (inQuotes) {
    throw new Error("ไฟล์ CSV มีเครื่องหมายคำพูดที่ไม่ได้ปิด");
  }

  cells.push(current);
  return cells;
}

export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = splitLines(text);
  if (lines.length < 2) {
    throw new Error("ไฟล์มีน้อยกว่า 2 แถว (มีแค่หัวตาราง หรือไฟล์ว่างเปล่า)");
  }

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => parseCsvLine(line));

  for (const row of rows) {
    if (row.length !== headers.length) {
      throw new Error("จำนวนคอลัมน์ในแถวข้อมูลไม่ตรงกับจำนวนคอลัมน์ของหัวตาราง");
    }
  }

  return { headers, rows };
}

export function parseFile(text: string): ParsedFile {
  const { headers, rows } = parseCsv(text);

  const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
  if (missing.length > 0) {
    throw new Error(`ไฟล์ขาดคอลัมน์ที่จำเป็น: ${missing.join(", ")}`);
  }

  const objectRows = rows.map((cells) => {
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = cells[i];
    });
    return row;
  });

  return { headers, rows: objectRows };
}

export function validateFileDates(
  parsed: ParsedFile,
  monthKey: string,
  range: DateRange
): void {
  const dateRe = new RegExp(`^${monthKey}-(\\d{2})$`);
  const daysSeen = new Set<number>();

  for (const row of parsed.rows) {
    const match = dateRe.exec(row.Date);
    const day = match ? Number(match[1]) : NaN;
    if (!match || day < range.startDay || day > range.endDay) {
      throw new Error(
        `วันที่ "${row.Date}" อยู่นอกช่วงที่กำหนด (${monthKey}-${String(
          range.startDay
        ).padStart(2, "0")} ถึง ${monthKey}-${String(range.endDay).padStart(2, "0")})`
      );
    }
    daysSeen.add(day);
  }

  for (let day = range.startDay; day <= range.endDay; day++) {
    if (!daysSeen.has(day)) {
      throw new Error(
        `ไม่มีข้อมูลของวันที่ ${monthKey}-${String(day).padStart(2, "0")} เลยแม้แต่แถวเดียว`
      );
    }
  }
}

export function parseAndValidateFilePart(
  text: string,
  monthKey: string,
  range: DateRange
): ParsedFile {
  const parsed = parseFile(text);
  validateFileDates(parsed, monthKey, range);
  return parsed;
}

export function isStaff(doctorName: string, staffNames: string[] = STAFF_NAMES): boolean {
  const normalizedDoctor = normalizeWhitespace(doctorName);
  return staffNames.some((name) => normalizedDoctor.includes(normalizeWhitespace(name)));
}

export function average(seconds: number[]): number {
  return seconds.reduce((sum, s) => sum + s, 0) / seconds.length;
}

export function formatDuration(totalSeconds: number): string {
  const rounded = Math.round(totalSeconds);
  const h = Math.floor(rounded / 3600);
  const m = Math.floor((rounded % 3600) / 60);
  const s = rounded % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function makeGroupSummary(seconds: number[]): GroupSummary {
  const avg = average(seconds);
  return {
    durationHms: formatDuration(avg),
    durationMinutes: (avg / 60).toFixed(2),
    count: seconds.length,
  };
}

export function calculateWaitTimes(
  monthKey: string,
  first: { parsed: ParsedFile; range: DateRange },
  second: { parsed: ParsedFile; range: DateRange },
  staffNames: string[] = STAFF_NAMES
): CalculationResult {
  if (
    first.parsed.headers.length !== second.parsed.headers.length ||
    first.parsed.headers.some((h, i) => h !== second.parsed.headers[i])
  ) {
    throw new Error("หัวตารางของไฟล์ทั้งสองไม่ตรงกันทุกประการ (เนื้อหาหรือลำดับ)");
  }

  const merged = [...first.parsed.rows, ...second.parsed.rows];
  const totalRows = merged.length;

  const clinicMatch = merged.filter(
    (row) =>
      normalizeWhitespace(row["พบแพทย์ที่แผนก"]) === normalizeWhitespace(CLINIC)
  );

  const excludedFiltered = clinicMatch.filter(
    (row) => !EXCLUDED_DEPARTMENTS.some((dep) => row["ส่งตรวจที่แผนก"].includes(dep))
  );

  const withinTimeWindow = excludedFiltered.filter((row) => {
    const seconds = timeSeconds(row.Time);
    if (seconds === null) return false;
    const start = timeSeconds(TIME_WINDOW.start)!;
    const end = timeSeconds(TIME_WINDOW.end)!;
    return seconds >= start && seconds <= end;
  });

  let droppedForDuration = 0;
  const withValidDuration = withinTimeWindow.filter((row) => {
    const seconds = timeSeconds(row["ระยะเวลารอ"]);
    if (seconds === null) {
      droppedForDuration++;
      return false;
    }
    return true;
  });

  if (withValidDuration.length === 0) {
    throw new Error("ไม่มีข้อมูลเหลือหลังผ่านการกรองทั้งหมด");
  }

  // Safe because Date and Time are both zero-padded, so string order == chronological order.
  const sorted = [...withValidDuration].sort((a, b) => {
    const keyA = `${a.Date} ${a.Time}`;
    const keyB = `${b.Date} ${b.Time}`;
    return keyA < keyB ? -1 : keyA > keyB ? 1 : 0;
  });

  const staffRows = sorted.filter((row) => isStaff(row["แพทย์"], staffNames));
  const nonStaffRows = sorted.filter((row) => !isStaff(row["แพทย์"], staffNames));

  if (staffRows.length === 0 || nonStaffRows.length === 0) {
    throw new Error("กลุ่มแพทย์ประจำหรือกลุ่มแพทย์หมุนเวียนว่างเปล่าหลังจากกรองข้อมูล");
  }

  const secondsOf = (rows: Record<string, string>[]) =>
    rows.map((row) => timeSeconds(row["ระยะเวลารอ"])!);

  return {
    all: makeGroupSummary(secondsOf(sorted)),
    staff: makeGroupSummary(secondsOf(staffRows)),
    nonStaff: makeGroupSummary(secondsOf(nonStaffRows)),
    audit: {
      monthKey,
      firstRange: first.range,
      secondRange: second.range,
      totalRows,
      usedRows: sorted.length,
      droppedForDuration,
    },
  };
}

export function makeSummary(result: CalculationResult): string {
  const { audit } = result;
  const base = `เดือน ${audit.monthKey}: ไฟล์ที่ 1 ครอบคลุมวันที่ ${audit.firstRange.startDay}-${audit.firstRange.endDay}, ไฟล์ที่ 2 ครอบคลุมวันที่ ${audit.secondRange.startDay}-${audit.secondRange.endDay} ใช้ข้อมูล ${audit.usedRows} จากทั้งหมด ${audit.totalRows} แถว`;
  return audit.droppedForDuration > 0
    ? `${base} ตัดข้อมูล ${audit.droppedForDuration} แถวออก เนื่องจากค่าระยะเวลารอไม่สามารถอ่านได้`
    : base;
}
