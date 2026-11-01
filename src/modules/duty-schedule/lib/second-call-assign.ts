/**
 * Second-call (standby) assignment for the monthly second-call sheet.
 *
 * Each day's real staff duty (d1) is split into sub-duties: on a working day
 * บ that day and ด of the next day; on a weekend or holiday also ช that day.
 * A day without real duty has no sub-duties, so it gets no second-call until
 * its real duty is entered. Every sub-duty gets one second-call doctor, in
 * turn, the way the paper sheets are made: the eligible doctor who has waited
 * longest since their last second-call goes next, and the turn order carries
 * over from the previous month. Pure and deterministic: the same roster and
 * history always produce the same sheet.
 */

export type SubDuty = "ด" | "ช" | "บ";

/** Display order inside one sheet cell, e.g. "ดชบ". */
export const SUB_DUTY_ORDER: SubDuty[] = ["ด", "ช", "บ"];

export const SECOND_CALL_RULES = {
  /** First names that never receive second-call. */
  excluded: ["โอภาส", "ปราการ"],
  /** First name, weekday (0 = Sunday) and sub-duty that person never takes as second-call. */
  weekdayBans: [
    { first: "สิทธิพงศ์", weekday: 1, shift: "บ" },
    { first: "ธนกร", weekday: 4, shift: "บ" },
  ],
} as const satisfies {
  excluded: readonly string[];
  weekdayBans: readonly { first: string; weekday: number; shift: SubDuty }[];
};

export type SecondCallSlot = {
  /** Day of month the sub-duty falls on; `days + 1` is the 1st of next month. */
  day: number;
  shift: SubDuty;
  /** Day whose real duty this sub-duty belongs to. */
  dutyDay: number;
  /** Full name of the staff on real duty, or null when none is rostered. */
  real: string | null;
  secondCall: string[];
};

const PERIOD: Record<SubDuty, number> = { "ด": 0, "ช": 1, "บ": 2 };
/** Sub-duty order in time; a previous month's day is `day - daysInPreviousMonth`. */
export const slotTime = (day: number, shift: SubDuty) => day * 3 + PERIOD[shift];
const firstName = (name: string) => name.trim().split(/\s+/u)[0];

function weekday(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month, day)).getUTCDay();
}

/** Sub-duties of one day's duty: ช only on weekends and holidays. */
export function subDutiesOf(year: number, month: number, day: number, holiday: boolean): { day: number; shift: SubDuty }[] {
  const wd = weekday(year, month, day);
  const off = holiday || wd === 0 || wd === 6;
  return [...(off ? [{ day, shift: "ช" as const }] : []), { day, shift: "บ" }, { day: day + 1, shift: "ด" }];
}

export type SecondCallDay = {
  holiday: boolean;
  /** Full name of the staff on real duty, or null when the directory can't tell who. */
  real: string | null;
  /** d1 names someone, even someone the directory doesn't know (defaults to `real` being set). */
  rostered?: boolean;
};

/** Second-call needs real duty: a day whose d1 is empty, "-" or "งด" gets none. */
export const hasRealDuty = (day: SecondCallDay) => day.rostered ?? day.real !== null;

export type SecondCallInput = {
  year: number;
  /** Zero-indexed, like the duty calendar. */
  month: number;
  /** One entry per day of month (index 0 = day 1). */
  days: SecondCallDay[];
  /** Full names of active staff in sheet order; excluded first names are dropped here. */
  staff: string[];
  /** Real staff on the last day of the previous month (its Friday for rule 6). */
  previousReal?: string | null;
  /**
   * Each person's last second-call before this month, as `slotTime` on this
   * month's scale (the previous month's last sub-duty is this month's 1 ด).
   * People missing here are treated as having waited longest.
   */
  history?: ReadonlyMap<string, number>;
  /**
   * Sub-duties an admin or a paper sheet set, keyed by `slotKey`. They are
   * kept even where they break a rule, and on a day without real duty they
   * are the only sub-duties.
   */
  pinned?: ReadonlyMap<string, readonly string[]>;
  /**
   * Second-call kept as is, keyed by `slotKey`; `planSecondCall` decides
   * which saved names qualify. Keys that match no sub-duty are ignored.
   */
  fixed?: ReadonlyMap<string, readonly string[]>;
};

export const slotKey = (slot: { day: number; shift: SubDuty }) => `${slot.day}:${slot.shift}`;

/** Which hard rule a person would break on a sub-duty. */
export type SecondCallConflict = "real" | "weekday" | "friday";

/** The month's sub-duties, eligible people, and the hard rules for one person on one sub-duty. */
function monthRules(input: Omit<SecondCallInput, "fixed">) {
  const { year, month, days } = input;
  const slots: SecondCallSlot[] = days.flatMap((info, i) => subDutiesOf(year, month, i + 1, info.holiday)
    .filter((sub) => hasRealDuty(info) || !!input.pinned?.get(slotKey(sub))?.length)
    .map((sub) => ({ ...sub, dutyDay: i + 1, real: info.real, secondCall: [] as string[] })));
  const excluded = new Set<string>(SECOND_CALL_RULES.excluded);
  const people = [...new Set(input.staff)].filter((name) => !excluded.has(firstName(name)));
  const realOn = (day: number) => (day >= 1 ? days[day - 1]?.real : input.previousReal) ?? null;
  const conflict = (p: string, slot: { day: number; shift: SubDuty; real: string | null }): SecondCallConflict | null => {
    if (slot.real === p) return "real";
    const wd = weekday(year, month, slot.day);
    if (SECOND_CALL_RULES.weekdayBans.some((ban) => ban.shift === slot.shift && ban.weekday === wd && ban.first === firstName(p))) return "weekday";
    return slot.shift === "ช" && wd === 6 && realOn(slot.day - 1) === p ? "friday" : null;
  };
  const allowed = (p: string, slot: SecondCallSlot) => !conflict(p, slot);
  return { slots, people, allowed, conflict };
}

/** Eligible staff (excluded first names dropped) and the rule check behind the assignment. */
export function secondCallRules(input: Omit<SecondCallInput, "fixed">) {
  const { people, conflict } = monthRules(input);
  return { people, conflict };
}

/**
 * Assign second-call for every sub-duty of the month's real duties, one
 * doctor each, in time order. Each goes to the eligible doctor who has waited
 * longest since their last second-call (ties in sheet order), so a doctor
 * the rules skip keeps their turn and takes the next sub-duty they can.
 * Hard rules: never the doctor's own real sub-duty, the weekday bans, and no
 * Saturday ช for whoever had Friday's real duty. Fixed sub-duties are kept as
 * given and count as that doctor's turn.
 */
export function assignSecondCall(input: SecondCallInput): { slots: SecondCallSlot[]; counts: Map<string, number> } {
  const { slots, people, allowed } = monthRules(input);
  const counts = new Map(people.map((p) => [p, 0]));
  const last = new Map(people.map((p) => [p, input.history?.get(p) ?? -Infinity]));
  for (const slot of slots) {
    const t = slotTime(slot.day, slot.shift);
    const fixed = input.fixed?.get(slotKey(slot));
    if (fixed?.length) {
      slot.secondCall = [...new Set(fixed)];
    } else {
      // `people` is in sheet order and the sort is stable, so ties keep it.
      const pick = people.filter((p) => allowed(p, slot)).sort((a, b) => last.get(a)! - last.get(b)!)[0];
      slot.secondCall = pick ? [pick] : [];
    }
    for (const p of slot.secondCall) {
      if (!counts.has(p)) continue;
      counts.set(p, counts.get(p)! + 1);
      last.set(p, t);
    }
  }
  return { slots, counts };
}

/** Most minus fewest second-calls this month among eligible staff. */
const spread = (counts: Map<string, number>) => counts.size ? Math.max(...counts.values()) - Math.min(...counts.values()) : 0;

/**
 * The month's second-call built on saved assignments. Sub-duties an admin set
 * are kept exactly as set. Other saved names that still meet the rules stay
 * put and only missing or broken sub-duties are given out in turn. Only if
 * that leaves doctors more than two second-calls apart, and taking turns
 * afresh would be more even, are duty days after `lockedThrough` given out
 * in turn again around the earlier ones, which keep their valid names. A
 * month that ends uneven evens out the next, since turns carry over.
 */
export function planSecondCall(input: Omit<SecondCallInput, "fixed"> & {
  saved: ReadonlyMap<string, readonly string[]>;
  /** Last duty day of the month that is kept even when reassigning (0 = none). */
  lockedThrough: number;
}): { slots: SecondCallSlot[]; counts: Map<string, number> } {
  const { slots, people, allowed } = monthRules(input);
  const valid = new Map<string, string[]>();
  const locked = new Map<string, string[]>();
  for (const slot of slots) {
    const set = input.pinned?.get(slotKey(slot));
    if (set?.length) {
      valid.set(slotKey(slot), [...new Set(set)]);
      locked.set(slotKey(slot), [...new Set(set)]);
      continue;
    }
    const names = [...new Set(input.saved.get(slotKey(slot)) ?? [])];
    if (!names.length || !names.every((p) => people.includes(p) && allowed(p, slot))) continue;
    valid.set(slotKey(slot), names);
    if (slot.dutyDay <= input.lockedThrough) locked.set(slotKey(slot), names);
  }
  const kept = assignSecondCall({ ...input, fixed: valid });
  if (locked.size === valid.size) return kept;
  const fresh = assignSecondCall({ ...input, fixed: locked });
  return spread(kept.counts) <= Math.max(spread(fresh.counts), 2) ? kept : fresh;
}

/** Each person's last second-call in a month's plan, on the next month's `slotTime` scale. */
export function secondCallHistory(slots: readonly SecondCallSlot[], daysInMonth: number): Map<string, number> {
  const last = new Map<string, number>();
  for (const slot of slots) {
    const t = slotTime(slot.day - daysInMonth, slot.shift);
    for (const p of slot.secondCall) last.set(p, Math.max(last.get(p) ?? -Infinity, t));
  }
  return last;
}

/**
 * Sheet cells per person: one string per day column plus the next month's
 * 1st, combining real duty and second-call marks (e.g. "ดบ"). The month's
 * own 1st ด belongs to the previous month's last duty, so it is passed in.
 */
export function secondCallSheetCells(input: {
  days: number;
  slots: SecondCallSlot[];
  carriedIn?: SecondCallSlot;
  /** Other real duties to show, e.g. intern (d2) sub-duties. */
  extra?: { person: string; day: number; shift: SubDuty }[];
}): Map<string, string[]> {
  const marks = new Map<string, Set<SubDuty>[]>();
  const add = (person: string | null, day: number, shift: SubDuty) => {
    if (!person || day < 1 || day > input.days + 1) return;
    const row = marks.get(person) ?? Array.from({ length: input.days + 1 }, () => new Set<SubDuty>());
    row[day - 1].add(shift);
    marks.set(person, row);
  };
  for (const slot of [...(input.carriedIn ? [input.carriedIn] : []), ...input.slots]) {
    for (const person of [slot.real, ...slot.secondCall]) add(person, slot.day, slot.shift);
  }
  for (const item of input.extra ?? []) add(item.person, item.day, item.shift);
  return new Map([...marks].map(([person, row]) => [person, row.map((set) => SUB_DUTY_ORDER.filter((s) => set.has(s)).join(""))]));
}
