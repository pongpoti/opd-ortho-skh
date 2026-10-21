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
};

/**
 * Assign second-call for every sub-duty of the month's real duties.
 * Hard rules: never the doctor's own real sub-duty, the weekday bans, and no
 * Saturday ช for whoever had Friday's real duty. Soft preferences spread
 * each doctor's shifts evenly and avoid running straight into their own duty.
 * Throws when the rules cannot all be met.
 */
export function assignSecondCall(input: SecondCallInput): { slots: SecondCallSlot[]; counts: Map<string, number> } {
  const { year, month, days } = input;
  const slots: SecondCallSlot[] = days.flatMap((info, i) => subDutiesOf(year, month, i + 1, info.holiday)
    .map((sub) => ({ ...sub, dutyDay: i + 1, real: info.real, secondCall: [] as string[] })));
  const excluded = new Set<string>(SECOND_CALL_RULES.excluded);
  const people = [...new Set(input.staff)].filter((name) => !excluded.has(firstName(name)));
  const counts = new Map(people.map((p) => [p, 0]));
  if (!people.length || !slots.length) return { slots, counts };

  const realTimes = new Map<string, Set<number>>();
  const markReal = (p: string | null | undefined, t: number) => {
    if (p) realTimes.set(p, (realTimes.get(p) ?? new Set()).add(t));
  };
  markReal(input.previousReal, time(1, "ด"));
  for (const slot of slots) markReal(slot.real, time(slot.day, slot.shift));
  const realOn = (day: number) => (day >= 1 ? days[day - 1]?.real : input.previousReal) ?? null;
  const can = (p: string, slot: SecondCallSlot) => {
    if (slot.real === p || slot.secondCall.includes(p)) return false;
    const wd = weekday(year, month, slot.day);
    if (SECOND_CALL_RULES.weekdayBans.some((ban) => ban.shift === slot.shift && ban.weekday === wd && ban.first === firstName(p))) return false;
    return !(slot.shift === "ช" && wd === 6 && realOn(slot.day - 1) === p);
  };

  // Quotas: everyone gets the minimum; a month with more sub-duties than that
  // gives the extra to whoever has the fewest real sub-duties.
  const seed = (p: string) => hash(`${year}-${month}:${p}`);
  const total = Math.max(slots.length, people.length * SECOND_CALL_RULES.minPerStaff);
  const quota = new Map(people.map((p) => [p, Math.floor(total / people.length)]));
  [...people]
    .sort((a, b) => (realTimes.get(a)?.size ?? 0) - (realTimes.get(b)?.size ?? 0) || seed(a) - seed(b))
    .slice(0, total - Math.floor(total / people.length) * people.length)
    .forEach((p) => quota.set(p, quota.get(p)! + 1));
  // Seats per sub-duty: the extra seats are spread evenly through the month.
  const seats = slots.map(() => Math.floor(total / slots.length));
  const extraSeats = total - seats[0] * slots.length;
  for (let j = 0; j < extraSeats; j++) seats[Math.floor(((j + 0.5) * slots.length) / extraSeats)]++;

  const remainingFit = (from: number) => fits(
    people,
    new Map(people.map((p) => [p, quota.get(p)! - counts.get(p)!])),
    slots.slice(from).map((slot, k) => ({ open: seats[from + k] - slot.secondCall.length, can: (p: string) => can(p, slot) })),
  );
  if (!remainingFit(0)) throw new Error("Second-call rules cannot be satisfied for this month");

  const last = new Map<string, number>();
  slots.forEach((slot, s) => {
    const t = time(slot.day, slot.shift);
    while (slot.secondCall.length < seats[s]) {
      const score = (p: string) => {
        const behind = (quota.get(p)! * (s + 1)) / slots.length - counts.get(p)!;
        const gapDays = last.has(p) ? (t - last.get(p)!) / 3 : 7;
        const nextToOwn = realTimes.get(p)?.has(t - 1) || realTimes.get(p)?.has(t + 1) ? 1 : 0;
        const nextToSecond = last.get(p) === t - 1 ? 1 : 0;
        return behind * 3 + Math.min(gapDays, 7) * 0.3 - nextToOwn * 2 - nextToSecond * 2;
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
      last.set(pick, t);
    }
  });
  return { slots, counts };
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
