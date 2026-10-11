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

/** Complete duty days read from Neon, keyed by day-of-month (1–31). */
export type DutyMonthData = Record<number, DutyDay>;

/**
 * First names that map to more than one distinct stored identity for `key`
 * in the given month (0-indexed).
 */
export function ambiguousDutyFirstNames(
  year: number,
  month: number,
  key: DutyKey,
  monthData?: DutyMonthData
): ReadonlySet<string> {
  const days = new Date(year, month + 1, 0).getDate();
  const rawNames: string[] = [];
  for (let day = 1; day <= days; day++) {
    const raw = getDutyDay(year, month, day, monthData).entries[key];
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
  monthData?: DutyMonthData
): Record<DutyKey, ReadonlySet<string>> {
  const out = {} as Record<DutyKey, ReadonlySet<string>>;
  for (const key of keys) {
    out[key] = ambiguousDutyFirstNames(year, month, key, monthData);
  }
  return out;
}

/**
 * Label for a duty slot: the first name, plus a paren initial only when
 * `ambiguousFirsts` (from `ambiguousDutyFirstNames`) says that first name
 * collides this month. Empty / unfilled slots display as "-".
 */
export function formatDutyDisplayName(
  name: string | undefined,
  ambiguousFirsts?: ReadonlySet<string>
): string {
  if (name === undefined) return "-";
  if (isDutyMarker(name)) return name;

  const { first, rest } = parseDutyPersonName(name);
  if (!rest || !ambiguousFirsts?.has(first)) return first;
  return `${first} ${dutyParenInitial(rest)}`;
}

/**
 * Distinct intern (`d2`) names already scheduled in this month’s saved roster.
 * Markers ("-", "งด") are excluded. Used as the edit-sheet roster for intern.
 */
export function internNamesForMonth(
  year: number,
  month: number,
  monthData?: DutyMonthData
): string[] {
  const days = new Date(year, month + 1, 0).getDate();
  const names = new Set<string>();
  for (let day = 1; day <= days; day++) {
    const raw = getDutyDay(year, month, day, monthData).entries.d2;
    if (!raw || isDutyMarker(raw)) continue;
    names.add(raw.trim());
  }
  return [...names].sort((a, b) => a.localeCompare(b, "th"));
}

/**
 * First month with active duty data (month is 0-indexed).
 * App launch: September 2026 — earlier months still show on the calendar
 * when they are the current date, but their days are disabled.
 */
export const DUTY_CALENDAR_START = { year: 2026, month: 8 } as const;

/** True for months before the app launch month (e.g. Aug 2026). */
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

/** Read one day from a loaded Neon month; this helper has no roster fallback. */
export function getDutyDay(
  _year: number,
  _month: number,
  day: number,
  monthData?: DutyMonthData
): DutyDay {
  return monthData?.[day] ?? { holiday: false, holidayLabel: null, entries: {} };
}
