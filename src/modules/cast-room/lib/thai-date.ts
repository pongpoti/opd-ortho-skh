export const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
export const THAI_WD_SHORT = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];
const BE_OFFSET = 543;

/** A day button, or a blank spacer used only for Monday-first weekday alignment. */
export type CalendarCell =
  | { kind: "day"; year: number; month: number; day: number }
  | { kind: "blank"; key: string };

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

/** Monday-first weekday index: 0=Mon .. 6=Sun. */
function mondayIndex(jsDay: number) {
  return (jsDay + 6) % 7;
}

/**
 * Month grid for the cast-room date picker.
 *
 * Only current-month day numbers are included. Leading blanks keep Monday-first
 * alignment; the last week is left short — no previous/next-month peek dates.
 */
export function buildMonthCells(year: number, month: number): CalendarCell[] {
  const n = daysInMonth(year, month);
  const firstWd = mondayIndex(new Date(year, month, 1).getDay());

  const cells: CalendarCell[] = [];
  for (let i = 0; i < firstWd; i++) {
    cells.push({ kind: "blank", key: `lead-${year}-${month}-${i}` });
  }
  for (let d = 1; d <= n; d++) {
    cells.push({ kind: "day", year, month, day: d });
  }
  return cells;
}

export function parseISO(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month: month - 1, day };
}

export function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatThaiDate(iso: string): string {
  const { year, month, day } = parseISO(iso);
  return `${day} ${THAI_MONTHS[month]} ${year + BE_OFFSET}`;
}

export function thaiMonthYear(year: number, month: number): string {
  return `${THAI_MONTHS[month]} ${year + BE_OFFSET}`;
}
