export type DutyKey = "d1" | "d2" | "d3" | "d4" | "d5";

export const DUTY_ORDER: DutyKey[] = ["d1", "d2", "d3", "d4", "d5"];

export const DUTY_LABELS: Record<DutyKey, string> = {
  d1: "เวร staff",
  d2: "เวร intern",
  d3: "OPD ท่าฉลอม",
  d4: "OPD เกตุม",
  d5: "เวรห้องเฝือก",
};

/** Whether a duty type is scheduled on a given weekday (0=Sun..6=Sat, per Date#getDay()). */
export function dutyApplies(key: DutyKey, weekday: number): boolean {
  if (key === "d3") return weekday === 1 || weekday === 2; // Mon + Tue
  if (key === "d4") return weekday === 4; // Thu only
  return true; // d1, d2, d5 run every day
}

export type DutyDay = {
  holiday: boolean;
  entries: Partial<Record<DutyKey, string>>;
};

type RawEntry = { holiday?: true } & Partial<Record<DutyKey, string>>;

/**
 * Verified duty rosters, keyed by "YYYY-M" (month is 0-indexed) then day of
 * month. Only months present here have confirmed data; everything else is
 * unfilled until the real roster is supplied — never fabricate placeholder
 * names in this table.
 */
const VERIFIED: Record<string, Record<number, RawEntry>> = {
  "2026-9": {
    // October 2026 — duty 1 (staff physician), duty 3 (ท่าฉลอม), duty 4 (เกตุม)
    1: { d1: "เฉลิมพล", d4: "ชัยวัฒน์" },
    2: { d1: "วันทนันท์" },
    3: { d1: "ชวพล" },
    4: { d1: "ชวพล" },
    5: { d1: "สิทธิพงศ์", d3: "ปิติพงศ์" },
    6: { d1: "ธีรฉัตต์", d3: "วิฑูรย์" },
    7: { d1: "ชัยวัฒน์" },
    8: { d1: "วรงค์พร", d4: "พลสันต์" },
    9: { d1: "ชวพล" },
    10: { d1: "วิฑูรย์" },
    11: { d1: "วิฑูรย์" },
    12: { d1: "ปองสิทธิ์", d3: "ธีรฉัตต์" },
    13: { holiday: true }, // d1 + d3 both pending confirmation
    14: { d1: "ธนกร" },
    15: { d1: "เฉลิมพล", d4: "ปองสิทธิ์" },
    16: { d1: "วันทนันท์" },
    17: { d1: "สิทธิพงศ์" },
    18: { d1: "สิทธิพงศ์" },
    19: { d1: "เทพรักษา", d3: "วรงค์พร" },
    20: { d1: "ธีรฉัตต์", d3: "สิทธิพงศ์" },
    21: { d1: "ชัยวัฒน์" },
    22: { d1: "เทพรักษา", holiday: true }, // d4 pending confirmation
    23: { d1: "เทพรักษา", holiday: true },
    24: { d1: "เทพรักษา", holiday: true },
    25: { d1: "เฉลิมพล" },
    26: { d1: "ปองสิทธิ์", d3: "ธนกร" },
    27: { d1: "ปิติพงศ์", d3: "โอภาส" },
    28: { d1: "ธนกร" },
    29: { d1: "วรงค์พร", d4: "เทพรักษา" },
    30: { d1: "ชวพล" },
    31: { d1: "ปิติพงศ์" },
  },
};

export function getDutyDay(year: number, month: number, day: number): DutyDay {
  const raw = VERIFIED[`${year}-${month}`]?.[day];
  if (!raw) return { holiday: false, entries: {} };

  const { holiday, ...entries } = raw;
  return { holiday: !!holiday, entries };
}
