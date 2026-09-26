/**
 * Fixed weekly OPD clinic roster (ตารางออกตรวจ OPD).
 * Independent of the monthly staff-duty calendar — same doctors every week.
 */
export type OpdWeekdayRow = {
  day: string;
  morning: string;
  afternoon: string;
};

export const OPD_FIXED_SCHEDULE: OpdWeekdayRow[] = [
  {
    day: "จันทร์",
    morning: "สิทธิพงศ์, ปองสิทธิ์, ชัยวิเชียร",
    afternoon: "โอภาส",
  },
  {
    day: "อังคาร",
    morning: "ธีรฉัตต์, ปิติพงศ์",
    afternoon: "ปราการ",
  },
  {
    day: "พุธ",
    morning: "ชัยวัฒน์, ธนกร",
    afternoon: "วิฑูรย์",
  },
  {
    day: "พฤหัสบดี",
    morning: "เฉลิมพล, วรงค์พร",
    afternoon: "พลสันต์",
  },
  {
    day: "ศุกร์",
    morning: "วันทนันท์, ชวพล",
    afternoon: "เทพรักษา",
  },
];
