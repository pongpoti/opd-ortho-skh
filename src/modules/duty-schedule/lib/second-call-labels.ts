import type { SubDuty } from "./second-call-assign";

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

export const SUB_DUTY_LABELS: Record<SubDuty, { name: string; hours: string }> = {
  "ช": { name: "เช้า", hours: "08:00–16:00" },
  "บ": { name: "บ่าย", hours: "16:00–24:00" },
  "ด": { name: "ดึก", hours: "00:00–08:00" },
};

/** Hours of a sub-duty, with its date when it falls after the duty day (ด). */
export function subDutyWhen(sub: { shift: SubDuty; date: { month: number; day: number } }, dutyDay: number): string {
  const { hours } = SUB_DUTY_LABELS[sub.shift];
  return sub.date.day === dutyDay ? hours : `${hours} · ${sub.date.day} ${THAI_MONTHS_SHORT[sub.date.month]}`;
}
