import { getThaiHolidayName } from "./thai-holidays";

export type DutyKey = "d1" | "d2" | "d3" | "d4" | "d5";

export const DUTY_ORDER: DutyKey[] = ["d1", "d2", "d3", "d4", "d5"];

export const DUTY_LABELS: Record<DutyKey, string> = {
  d1: "เวร staff",
  d2: "เวร intern",
  d3: "OPD ท่าฉลอม",
  d4: "OPD เกตุม",
  d5: "เวรห้องเฝือก",
};

/** Explicit roster markers: absent ("-") or cancelled ("งด") — not "ยังไม่ระบุ". */
export function isDutyMarker(name: string | undefined): name is "-" | "งด" {
  return name === "-" || name === "งด";
}

/**
 * Roster name parts. Entries are usually a bare first name ("ภรณี").
 *
 * When two people share a first name in the same month, store a last name
 * (or initial) after a space for every colliding person, e.g.
 * "สมชาย กิตติ" / "สมชาย พิชัย" or "สมชาย (ก)" / "สมชาย (พ)". Display then
 * shows first-only when unique, and "ชื่อ (อ)" only while that month has a
 * collision — same rule on the home "เวรวันนี้" card and the duty drawer.
 */
export function parseDutyPersonName(raw: string): { first: string; rest: string | null } {
  const trimmed = raw.trim();
  const space = trimmed.indexOf(" ");
  if (space < 0) return { first: trimmed, rest: null };
  const first = trimmed.slice(0, space);
  const rest = trimmed.slice(space + 1).trim();
  return { first, rest: rest || null };
}

/**
 * Concise last-name tag for display: "กินรี" / "ก." / "(ก)" → "(ก)".
 */
export function dutyParenInitial(rest: string): string {
  const trimmed = rest.trim();
  if (!trimmed) return trimmed;
  const paren = trimmed.match(/^\((.+)\)$/u);
  const source = paren ? paren[1].trim() : trimmed.replace(/\.$/u, "");
  const char = [...source][0];
  return char ? `(${char})` : trimmed;
}

/**
 * First names that map to more than one distinct stored identity among the
 * given raw roster strings. Same person repeating is fine; only different
 * stored strings that share a first name count as a collision.
 */
export function ambiguousFirstNamesFromRaw(
  rawNames: Iterable<string>
): ReadonlySet<string> {
  const byFirst = new Map<string, Set<string>>();
  for (const raw of rawNames) {
    if (!raw || isDutyMarker(raw)) continue;
    const { first } = parseDutyPersonName(raw);
    let identities = byFirst.get(first);
    if (!identities) {
      identities = new Set();
      byFirst.set(first, identities);
    }
    identities.add(raw.trim());
  }

  const ambiguous = new Set<string>();
  for (const [first, identities] of byFirst) {
    if (identities.size > 1) ambiguous.add(first);
  }
  return ambiguous;
}

/** Per-day slot overrides keyed by day-of-month (1–31). */
export type DutyDayOverrides = Partial<Record<DutyKey, string>>;
export type DutyMonthOverrides = Record<number, DutyDayOverrides>;

/**
 * First names that map to more than one distinct stored identity for `key`
 * in the given month (0-indexed).
 */
export function ambiguousDutyFirstNames(
  year: number,
  month: number,
  key: DutyKey,
  monthOverrides?: DutyMonthOverrides
): ReadonlySet<string> {
  const days = new Date(year, month + 1, 0).getDate();
  const rawNames: string[] = [];
  for (let day = 1; day <= days; day++) {
    const raw = getDutyDay(year, month, day, monthOverrides).entries[key];
    if (raw) rawNames.push(raw);
  }
  return ambiguousFirstNamesFromRaw(rawNames);
}

/**
 * Ambiguous first-name sets for every duty key in a month (0-indexed).
 * Used by the home card and day drawer so colliding names share one rule.
 */
export function ambiguousDutyFirstNamesByKey(
  year: number,
  month: number,
  keys: readonly DutyKey[] = DUTY_ORDER,
  monthOverrides?: DutyMonthOverrides
): Record<DutyKey, ReadonlySet<string>> {
  const out = {} as Record<DutyKey, ReadonlySet<string>>;
  for (const key of keys) {
    out[key] = ambiguousDutyFirstNames(year, month, key, monthOverrides);
  }
  return out;
}

/**
 * Label for a duty slot. Pass `ambiguousFirsts` from
 * `ambiguousDutyFirstNames` so colliding first names show a paren initial.
 * Empty / unfilled slots display as "-".
 */
export function formatDutyDisplayName(
  name: string | undefined,
  ambiguousFirsts?: ReadonlySet<string>
): string {
  if (name === undefined) return "-";
  if (isDutyMarker(name) || !ambiguousFirsts?.size) return name;

  const { first, rest } = parseDutyPersonName(name);
  if (!ambiguousFirsts.has(first)) return first;
  if (!rest) return first;
  return `${first} ${dutyParenInitial(rest)}`;
}

/**
 * Distinct intern (`d2`) names already scheduled in this month (seed ⊕ overrides).
 * Markers ("-", "งด") are excluded. Used as the edit-sheet roster for intern.
 */
export function internNamesForMonth(
  year: number,
  month: number,
  monthOverrides?: DutyMonthOverrides
): string[] {
  const days = new Date(year, month + 1, 0).getDate();
  const names = new Set<string>();
  for (let day = 1; day <= days; day++) {
    const raw = getDutyDay(year, month, day, monthOverrides).entries.d2;
    if (!raw || isDutyMarker(raw)) continue;
    names.add(raw.trim());
  }
  return [...names].sort((a, b) => a.localeCompare(b, "th"));
}

/**
 * First month with active duty data (month is 0-indexed).
 * App launch: October 2026 — earlier months still show on the calendar
 * when they are the current date, but their days are disabled.
 */
export const DUTY_CALENDAR_START = { year: 2026, month: 9 } as const;

/** True for months before the app launch month (e.g. Sep 2026). */
export function isDutyMonthDisabled(year: number, month: number): boolean {
  const start = DUTY_CALENDAR_START;
  return year < start.year || (year === start.year && month < start.month);
}

/**
 * Whether a duty type is scheduled on a given weekday (0=Sun..6=Sat).
 * Matches the Oct 2569 Ortho roster note: เกตุม on Mon+Thu, ท่าฉลอม on Tue.
 */
export function dutyApplies(key: DutyKey, weekday: number): boolean {
  if (key === "d3") return weekday === 2; // Tue — ท่าฉลอม
  if (key === "d4") return weekday === 1 || weekday === 4; // Mon + Thu — เกตุม
  return true; // d1, d2, d5 run every day
}

export type DutyDay = {
  holiday: boolean;
  holidayLabel: string | null;
  entries: Partial<Record<DutyKey, string>>;
};

/**
 * `holidayLabel` overrides the name shown for a holiday-flagged day — use it
 * for internal special days (e.g. "RCOST") that aren't in the official Thai
 * holiday calendar. Official holidays resolve their name automatically from
 * `thai-holidays.ts` and don't need it set.
 */
type RawEntry = { holiday?: true; holidayLabel?: string } & Partial<Record<DutyKey, string>>;

/**
 * Verified duty rosters, keyed by "YYYY-M" (month is 0-indexed) then day of
 * month. Only months present here have confirmed data; everything else is
 * unfilled until the real roster is supplied — never fabricate placeholder
 * names in this table.
 *
 * October 2026 (ต.ค. 2569) sources:
 * - d1 staff: ตารางออกตรวจ OPD / เวรเสาร์–อาทิตย์ + cast-room doctor column
 * - d2 intern: เวร แพทย์ Intern (พญ.ภรณี / พญ.ธนภรณ์); "-" = absent that day.
 *   Same first name twice in one month → store last name/initial on each
 *   colliding entry; display becomes "ชื่อ (อ)" (see formatDutyDisplayName).
 * - d3 ท่าฉลอม / d4 เกตุม: เวร Ortho ท่าฉลอม เกตุม ("งด" stored when cancelled)
 * - d5 cast-room nurse: เวร พยาบาลห้องเฝือก (day 31 blank in source)
 *
 * November–December 2026 (พ.ย.–ธ.ค. 2569) sources:
 * - d1 staff: ตารางเวร staff Ortho (weekend names span Sat–Sun)
 * - d3 ท่าฉลอม / d4 เกตุม: เวร Ortho ท่าฉลอม เกตุม (highlighted empty = งด)
 * - d2 / d5: not in the supplied PDFs — left unfilled
 */
const VERIFIED: Record<string, Record<number, RawEntry>> = {
  "2026-9": {
    1: { d1: "เฉลิมพล", d2: "-", d4: "ชัยวัฒน์", d5: "หทัยรัตน์" },
    2: { d1: "ชวพล", d2: "-", d5: "ณัฐวุฒิ" },
    3: { d1: "ชวพล", d2: "ภรณี", d5: "ธัญญ์ฐิตา" },
    4: { d1: "ชวพล", d2: "ภรณี", d5: "อรัญญา" },
    5: { d1: "สิทธิพงศ์", d2: "-", d4: "ปิติพงศ์", d5: "หทัยรัตน์" },
    6: { d1: "ธีรฉัตต์", d2: "ธนภรณ์", d3: "สิทธิพงศ์", d5: "ณัฐวุฒิ" },
    7: { d1: "ชัยวัฒน์", d2: "-", d5: "ธัญญ์ฐิตา" },
    8: { d1: "วรงค์พร", d2: "-", d4: "พลสันต์", d5: "อรัญญา" },
    9: { d1: "วันทนันท์", d2: "ภรณี", d5: "หทัยรัตน์" },
    10: { d1: "วิฑูรย์", d2: "ธนภรณ์", d5: "ณัฐวุฒิ" },
    11: { d1: "วิฑูรย์", d2: "-", d5: "ธัญญ์ฐิตา" },
    12: { d1: "ปองสิทธิ์", d2: "ภรณี", d4: "ธีรฉัตต์", d5: "อรัญญา" },
    // 13 Tue: official holiday; ท่าฉลอม marked งด
    13: { d1: "ปิติพงศ์", d2: "-", d3: "งด", d5: "หทัยรัตน์" },
    14: { d1: "ธนกร", d2: "ธนภรณ์", d5: "ณัฐวุฒิ" },
    15: { d1: "เฉลิมพล", d2: "-", d4: "ปองสิทธิ์", d5: "ธัญญ์ฐิตา" },
    16: { d1: "วันทนันท์", d2: "ภรณี", d5: "อรัญญา" },
    17: { d1: "ปองสิทธิ์", d2: "-", d5: "หทัยรัตน์" },
    18: { d1: "ปองสิทธิ์", d2: "-", d5: "ณัฐวุฒิ" },
    19: { d1: "เทพรักษา", d2: "ภรณี", d4: "วรงค์พร", d5: "ธัญญ์ฐิตา" },
    20: { d1: "ธีรฉัตต์", d2: "ธนภรณ์", d3: "วันทนันท์", d5: "อรัญญา" },
    21: { d1: "ชัยวัฒน์", d2: "ธนภรณ์", d5: "หทัยรัตน์" },
    // 22 Thu: เกตุม marked งด
    22: { d1: "เทพรักษา", d2: "-", d4: "งด", d5: "ณัฐวุฒิ" },
    23: { d1: "เทพรักษา", d2: "-", d5: "ธัญญ์ฐิตา" },
    24: { d1: "เทพรักษา", d2: "-", d5: "อรัญญา" },
    25: { d1: "เฉลิมพล", d2: "-", d5: "หทัยรัตน์" },
    26: { d1: "ปองสิทธิ์", d2: "-", d4: "ธนกร", d5: "ณัฐวุฒิ" },
    27: { d1: "ปิติพงศ์", d2: "ธนภรณ์", d3: "โอภาส", d5: "ธัญญ์ฐิตา" },
    28: { d1: "ธนกร", d2: "-", d5: "อรัญญา" },
    29: { d1: "วรงค์พร", d2: "ธนภรณ์", d4: "เทพรักษา", d5: "หทัยรัตน์" },
    30: { d1: "วันทนันท์", d2: "ภรณี", d5: "ณัฐวุฒิ" },
    // 31: cast-room nurse blank in source PDF
    31: { d1: "ปิติพงศ์", d2: "ธนภรณ์" },
  },
  "2026-10": {
    1: { d1: "ปิติพงศ์" },
    2: { d1: "สิทธิพงศ์", d4: "เฉลิมพล" },
    3: { d1: "ธีรฉัตต์", d3: "วันทนันท์" },
    4: { d1: "ชัยวัฒน์" },
    5: { d1: "เฉลิมพล", d4: "ปราการ" },
    6: { d1: "วันทนันท์" },
    7: { d1: "วรงค์พร" },
    8: { d1: "วรงค์พร" },
    9: { d1: "ปองสิทธิ์", d4: "พลสันต์" },
    10: { d1: "ปิติพงศ์", d3: "สิทธิพงศ์" },
    11: { d1: "ธนกร" },
    12: { d1: "วรงค์พร", d4: "ชัยวัฒน์" },
    13: { d1: "ชวพล" },
    14: { d1: "ธนกร" },
    15: { d1: "ธนกร" },
    16: { d1: "เทพรักษา", d4: "ปิติพงศ์" },
    17: { d1: "ธีรฉัตต์", d3: "โอภาส" },
    18: { d1: "ชัยวัฒน์" },
    19: { d1: "เฉลิมพล", d4: "ปองสิทธิ์" },
    20: { d1: "วันทนันท์" },
    21: { d1: "ชัยวัฒน์" },
    22: { d1: "ชัยวัฒน์" },
    23: { d1: "ปองสิทธิ์", d4: "ธีรฉัตต์" },
    24: { d1: "ปิติพงศ์", d3: "วิฑูรย์" },
    25: { d1: "ธนกร" },
    26: { d1: "วรงค์พร", d4: "ชวพล" },
    27: { d1: "ชวพล" },
    28: { d1: "วันทนันท์" },
    29: { d1: "วันทนันท์" },
    30: { d1: "สิทธิพงศ์", d4: "วรงค์พร" },
  },
  "2026-11": {
    1: { d1: "ธีรฉัตต์", d3: "ธนกร" },
    2: { d1: "ชัยวัฒน์" },
    3: { d1: "เฉลิมพล", d4: "เทพรักษา" },
    4: { d1: "วันทนันท์" },
    5: { d1: "ชวพล" },
    6: { d1: "ชวพล" },
    // 7 Mon: substitute holiday after วันพ่อ; เกตุม marked งด
    7: { holiday: true, holidayLabel: "วันหยุดชดเชยวันพ่อแห่งชาติ", d1: "ปองสิทธิ์", d4: "งด" },
    8: { d1: "ปิติพงศ์", d3: "สิทธิพงศ์" },
    9: { d1: "ชัยวัฒน์" },
    // 10 Thu: วันรัฐธรรมนูญ — เกตุม marked งด
    10: { d1: "วรงค์พร", d4: "งด" },
    11: { d1: "ชวพล" },
    12: { d1: "ปองสิทธิ์" },
    13: { d1: "ปองสิทธิ์" },
    14: { d1: "เทพรักษา", d4: "ปราการ" },
    15: { d1: "ธีรฉัตต์", d3: "วันทนันท์" },
    16: { d1: "ธนกร" },
    17: { d1: "เฉลิมพล", d4: "ชวพล" },
    18: { d1: "วันทนันท์" },
    19: { d1: "ธีรฉัตต์" },
    20: { d1: "ธีรฉัตต์" },
    21: { d1: "ปองสิทธิ์", d4: "เฉลิมพล" },
    22: { d1: "ปิติพงศ์", d3: "วิฑูรย์" },
    23: { d1: "ธนกร" },
    24: { d1: "วรงค์พร", d4: "พลสันต์" },
    25: { d1: "ชวพล" },
    26: { d1: "พลสันต์" },
    27: { d1: "พลสันต์" },
    28: { d1: "สิทธิพงศ์", d4: "ปราการ" },
    29: { d1: "ธีรฉัตต์", d3: "โอภาส" },
    30: { d1: "ชัยวัฒน์" },
    // 31 Thu: วันสิ้นปี — เกตุม marked งด
    31: { d1: "ชัยวัฒน์", d4: "งด" },
  },
};

/** Seed roster only (verified static table) — no DB overrides. */
export function getDutyDaySeed(year: number, month: number, day: number): DutyDay {
  const raw = VERIFIED[`${year}-${month}`]?.[day];
  const officialName = getThaiHolidayName(month, day);

  if (!raw) {
    return { holiday: !!officialName, holidayLabel: officialName, entries: {} };
  }

  const { holiday, holidayLabel, ...entries } = raw;
  const isHoliday = !!holiday || !!officialName;
  return {
    holiday: isHoliday,
    holidayLabel: isHoliday ? (holidayLabel ?? officialName) : null,
    entries,
  };
}

/**
 * Duty day with optional admin overrides merged over the seed roster.
 * Override values replace the seed entry for that slot (including "-" / "งด").
 */
export function getDutyDay(
  year: number,
  month: number,
  day: number,
  monthOverrides?: DutyMonthOverrides
): DutyDay {
  const seed = getDutyDaySeed(year, month, day);
  const dayOverrides = monthOverrides?.[day];
  if (!dayOverrides) return seed;
  return {
    ...seed,
    entries: { ...seed.entries, ...dayOverrides },
  };
}
