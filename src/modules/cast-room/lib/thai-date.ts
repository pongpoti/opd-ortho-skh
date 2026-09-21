export const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
export const THAI_WD_SHORT = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];
const BE_OFFSET = 543;

export type CalendarCell = { year: number; month: number; day: number; outside: boolean };

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

/** Monday-first weekday index: 0=Mon .. 6=Sun. */
function mondayIndex(jsDay: number) {
  return (jsDay + 6) % 7;
}

/** Same grid-building approach as the duty-schedule calendar, for a consistent Monday-first month view. */
export function buildMonthCells(year: number, month: number): CalendarCell[] {
  const n = daysInMonth(year, month);
  const firstWd = mondayIndex(new Date(year, month, 1).getDay());
  const prevMonth = month - 1 < 0 ? 11 : month - 1;
  const prevYear = month - 1 < 0 ? year - 1 : year;
  const prevDays = daysInMonth(prevYear, prevMonth);
  const nextMonth = month + 1 > 11 ? 0 : month + 1;
  const nextYear = month + 1 > 11 ? year + 1 : year;

  const cells: CalendarCell[] = [];
  for (let i = 0; i < firstWd; i++) {
    cells.push({ year: prevYear, month: prevMonth, day: prevDays - firstWd + 1 + i, outside: true });
  }
  for (let d = 1; d <= n; d++) cells.push({ year, month, day: d, outside: false });
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ year: nextYear, month: nextMonth, day: nextDay++, outside: true });
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
