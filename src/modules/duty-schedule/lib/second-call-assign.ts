/**
 * Second-call (standby) assignment for the monthly second-call sheet.
 *
 * Each day's real staff duty (d1) is split into sub-duties: on a working day
 * บ that day and ด of the next day; on a weekend or holiday also ช that day.
 * Every sub-duty gets at least one second-call doctor and every eligible
 * staff member gets at least `minPerStaff`, so when a month has fewer
 * sub-duties than that total some sub-duties carry two. Pure and
 * deterministic: the same roster always produces the same sheet.
 */

export type SubDuty = "ด" | "ช" | "บ";

/** Display order inside one sheet cell, e.g. "ดชบ". */
export const SUB_DUTY_ORDER: SubDuty[] = ["ด", "ช", "บ"];

export const SECOND_CALL_RULES = {
  minPerStaff: 6,
  /** First names that never receive second-call. */
  excluded: ["โอภาส", "ปราการ"],
  /** First name, weekday (0 = Sunday) and sub-duty that person never takes as second-call. */
  weekdayBans: [
    { first: "สิทธิพงศ์", weekday: 1, shift: "บ" },
    { first: "ธนกร", weekday: 4, shift: "บ" },
  ],
} as const satisfies {
  minPerStaff: number;
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
const time = (day: number, shift: SubDuty) => day * 3 + PERIOD[shift];
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

function hash(text: string): number {
  let h = 0x811c9dc5;
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0)!, 0x01000193);
  return h >>> 0;
}

/** Whether every remaining quota fits the open seats (bipartite max-flow). */
function fits(people: string[], need: Map<string, number>, seats: { open: number; can: (p: string) => boolean }[]): boolean {
  const total = people.reduce((sum, p) => sum + need.get(p)!, 0);
  if (total !== seats.reduce((sum, seat) => sum + seat.open, 0)) return false;
  const source = people.length + seats.length;
  const sink = source + 1;
  const head = new Array<number>(sink + 1).fill(-1);
  const to: number[] = [];
  const cap: number[] = [];
  const next: number[] = [];
  const edge = (u: number, v: number, c: number) => {
    for (const [a, b, w] of [[u, v, c], [v, u, 0]]) {
      to.push(b); cap.push(w); next.push(head[a]); head[a] = to.length - 1;
    }
  };
  people.forEach((p, i) => {
    edge(source, i, need.get(p)!);
    seats.forEach((seat, j) => { if (seat.open > 0 && seat.can(p)) edge(i, people.length + j, 1); });
  });
  seats.forEach((seat, j) => edge(people.length + j, sink, seat.open));
  let flow = 0;
  for (;;) {
    const via = new Array<number>(sink + 1).fill(-1);
    const queue = [source];
    for (let q = 0; q < queue.length && via[sink] < 0; q++) {
      for (let e = head[queue[q]]; e >= 0; e = next[e]) {
        if (cap[e] > 0 && via[to[e]] < 0 && to[e] !== source) { via[to[e]] = e; queue.push(to[e]); }
      }
    }
    if (via[sink] < 0) return flow === total;
    let push = Infinity;
    for (let v = sink; v !== source; v = to[via[v] ^ 1]) push = Math.min(push, cap[via[v]]);
    for (let v = sink; v !== source; v = to[via[v] ^ 1]) { cap[via[v]] -= push; cap[via[v] ^ 1] += push; }
    flow += push;
  }
}

export type SecondCallInput = {
  year: number;
  /** Zero-indexed, like the duty calendar. */
  month: number;
  /** One entry per day of month (index 0 = day 1). */
  days: { holiday: boolean; real: string | null }[];
  /** Full names of active staff; excluded first names are dropped here. */
  staff: string[];
  /** Real staff on the last day of the previous month (its Friday for rule 6). */
  previousReal?: string | null;
  /**
   * Second-call kept as is, keyed by `slotKey`; `planSecondCall` decides
   * which saved names qualify. Keys that match no sub-duty are ignored.
   */
  fixed?: ReadonlyMap<string, readonly string[]>;
  /** Names to keep where the quotas still allow, keyed by `slotKey`. */
  prefer?: ReadonlyMap<string, readonly string[]>;
};

export const slotKey = (slot: { day: number; shift: SubDuty }) => `${slot.day}:${slot.shift}`;

/** Which hard rule a person would break on a sub-duty. */
export type SecondCallConflict = "real" | "weekday" | "friday";

/** The month's sub-duties, eligible people, and the hard rules for one person on one sub-duty. */
function monthRules(input: Omit<SecondCallInput, "fixed">) {
  const { year, month, days } = input;
  const slots: SecondCallSlot[] = days.flatMap((info, i) => subDutiesOf(year, month, i + 1, info.holiday)
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
 * Assign second-call for every sub-duty of the month's real duties.
 * Hard rules: never the doctor's own real sub-duty, the weekday bans, and no
 * Saturday ช for whoever had Friday's real duty. Soft preferences spread
 * each doctor's shifts evenly and avoid running straight into their own duty.
 * Fixed sub-duties count toward each quota and the rest is assigned around
 * them. Throws when the rules cannot all be met.
 */
export function assignSecondCall(input: SecondCallInput): { slots: SecondCallSlot[]; counts: Map<string, number> } {
  const { year, month } = input;
  const { slots, people, allowed } = monthRules(input);
  const counts = new Map(people.map((p) => [p, 0]));
  const locked = slots.map((slot) => {
    const saved = input.fixed?.get(slotKey(slot));
    if (!saved?.length) return false;
    slot.secondCall = [...new Set(saved)];
    for (const p of slot.secondCall) if (counts.has(p)) counts.set(p, counts.get(p)! + 1);
    return true;
  });
  if (!people.length || !slots.length) return { slots, counts };

  const realTimes = new Map<string, Set<number>>();
  const markReal = (p: string | null | undefined, t: number) => {
    if (p) realTimes.set(p, (realTimes.get(p) ?? new Set()).add(t));
  };
  markReal(input.previousReal, time(1, "ด"));
  for (const slot of slots) markReal(slot.real, time(slot.day, slot.shift));
  const can = (p: string, slot: SecondCallSlot) => !slot.secondCall.includes(p) && allowed(p, slot);

  // Quotas: everyone gets the minimum; a month with more sub-duties than that
  // gives the extra to whoever has the fewest real sub-duties.
  const seed = (p: string) => hash(`${year}-${month}:${p}`);
  const total = Math.max(slots.length, people.length * SECOND_CALL_RULES.minPerStaff);
  const quota = new Map(people.map((p) => [p, Math.floor(total / people.length)]));
  [...people]
    .sort((a, b) => (realTimes.get(a)?.size ?? 0) - (realTimes.get(b)?.size ?? 0) || seed(a) - seed(b))
    .slice(0, total - Math.floor(total / people.length) * people.length)
    .forEach((p) => quota.set(p, quota.get(p)! + 1));
  for (const p of people) quota.set(p, Math.max(quota.get(p)!, counts.get(p)!));
  const open = slots.flatMap((_, s) => (locked[s] ? [] : [s]));
  const left = (p: string) => quota.get(p)! - counts.get(p)!;
  const room = (p: string) => open.filter((s) => can(p, slots[s])).length;
  let seats: number[] = [];
  const remainingFit = (from: number) => fits(
    people,
    new Map(people.map((p) => [p, left(p)])),
    slots.slice(from).map((slot, k) => ({ open: seats[from + k] - slot.secondCall.length, can: (p: string) => can(p, slot) })),
  );
  // Only a late roster edit around fixed days can make a full quota
  // impossible; then the tightest person gives up one unit at a time.
  const lowered = new Set<string>();
  for (;;) {
    // Open sub-duties each need someone: top up whoever carries the least.
    while (people.reduce((sum, p) => sum + left(p), 0) < open.length) {
      const p = people.filter((q) => !lowered.has(q) && left(q) < room(q))
        .sort((a, b) => quota.get(a)! - quota.get(b)! || seed(a) - seed(b))[0];
      if (!p) throw new Error("Second-call rules cannot be satisfied for this month");
      quota.set(p, quota.get(p)! + 1);
    }
    // Seats per open sub-duty: the extra seats are spread evenly through the month.
    const seatTotal = people.reduce((sum, p) => sum + left(p), 0);
    seats = slots.map((slot) => slot.secondCall.length);
    open.forEach((s) => { seats[s] = Math.floor(seatTotal / open.length); });
    const extraSeats = open.length ? seatTotal - Math.floor(seatTotal / open.length) * open.length : 0;
    for (let j = 0; j < extraSeats; j++) seats[open[Math.floor(((j + 0.5) * open.length) / extraSeats)]]++;
    if (remainingFit(0)) break;
    const tight = people.filter((p) => left(p) > 0).sort((a, b) => room(a) - left(a) - (room(b) - left(b)) || seed(a) - seed(b))[0];
    if (!tight) throw new Error("Second-call rules cannot be satisfied for this month");
    quota.set(tight, quota.get(tight)! - 1);
    lowered.add(tight);
  }

  const last = new Map<string, number>();
  const soFar = new Map(people.map((p) => [p, 0]));
  const took = (p: string, t: number) => { last.set(p, t); if (soFar.has(p)) soFar.set(p, soFar.get(p)! + 1); };
  slots.forEach((slot, s) => {
    const t = time(slot.day, slot.shift);
    if (locked[s]) slot.secondCall.forEach((p) => took(p, t));
    while (slot.secondCall.length < seats[s]) {
      const score = (p: string) => {
        const behind = (quota.get(p)! * (s + 1)) / slots.length - soFar.get(p)!;
        const gapDays = last.has(p) ? (t - last.get(p)!) / 3 : 7;
        const nextToOwn = realTimes.get(p)?.has(t - 1) || realTimes.get(p)?.has(t + 1) ? 1 : 0;
        const nextToSecond = last.get(p) === t - 1 ? 1 : 0;
        const kept = input.prefer?.get(slotKey(slot))?.includes(p) ? 1 : 0;
        return kept * 20 + behind * 3 + Math.min(gapDays, 7) * 0.3 - nextToOwn * 2 - nextToSecond * 2;
      };
      const candidates = people
        .filter((p) => counts.get(p)! < quota.get(p)! && can(p, slot))
        .sort((a, b) => score(b) - score(a) || seed(a) - seed(b));
      const pick = candidates.find((p) => {
        slot.secondCall.push(p);
        counts.set(p, counts.get(p)! + 1);
        if (remainingFit(s)) return true;
        slot.secondCall.pop();
        counts.set(p, counts.get(p)! - 1);
        return false;
      });
      if (!pick) throw new Error("Second-call rules cannot be satisfied for this month");
      took(pick, t);
    }
  });
  return { slots, counts };
}

/**
 * The month's second-call built on saved assignments. Sub-duties an admin set
 * are kept exactly as set. Other saved names that still meet the rules stay
 * put and only missing or broken sub-duties are filled. If that leaves anyone
 * below the minimum, duty days after `lockedThrough` are reassigned around the
 * earlier ones, which keep their valid names, moving as few later names as
 * the quotas need.
 */
export function planSecondCall(input: Omit<SecondCallInput, "fixed"> & {
  saved: ReadonlyMap<string, readonly string[]>;
  /** Sub-duties an admin set, kept even where they break a rule. */
  pinned?: ReadonlyMap<string, readonly string[]>;
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
  try {
    const kept = assignSecondCall({ ...input, fixed: valid });
    if ([...kept.counts.values()].every((n) => n >= SECOND_CALL_RULES.minPerStaff)) return kept;
  } catch {
    // Keeping every saved name can be infeasible; reassign the later days.
  }
  // Reassigning still keeps each later saved name where the quotas allow.
  return assignSecondCall({ ...input, fixed: locked, prefer: valid });
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
