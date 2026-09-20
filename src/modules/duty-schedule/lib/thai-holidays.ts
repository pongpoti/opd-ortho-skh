/**
 * Official Thai public holidays that fall on the same Gregorian date every
 * year (month is 0-indexed to match the rest of this module). Lunar-calendar
 * holidays (Makha Bucha, Visakha Bucha, Asalha Bucha, Buddhist Lent Day) move
 * every year and are deliberately left out rather than guessed — add them
 * per-year via `holidayLabel` on the affected day once the date is known.
 */
const FIXED_DATE_HOLIDAYS: { month: number; day: number; name: string }[] = [
  { month: 0, day: 1, name: "วันขึ้นปีใหม่" },
  { month: 3, day: 6, name: "วันจักรี" },
  { month: 3, day: 13, name: "วันสงกรานต์" },
  { month: 3, day: 14, name: "วันสงกรานต์" },
  { month: 3, day: 15, name: "วันสงกรานต์" },
  { month: 4, day: 1, name: "วันแรงงานแห่งชาติ" },
  { month: 4, day: 4, name: "วันฉัตรมงคล" },
  { month: 6, day: 28, name: "วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว" },
  { month: 7, day: 12, name: "วันแม่แห่งชาติ" },
  { month: 9, day: 13, name: "วันคล้ายวันสวรรคตพระบาทสมเด็จพระบรมชนกาธิเบศร มหาภูมิพลอดุลยเดชมหาราช บรมนาถบพิตร" },
  { month: 9, day: 23, name: "วันปิยมหาราช" },
  { month: 11, day: 5, name: "วันพ่อแห่งชาติ" },
  { month: 11, day: 10, name: "วันรัฐธรรมนูญ" },
  { month: 11, day: 31, name: "วันสิ้นปี" },
];

export function getThaiHolidayName(month: number, day: number): string | null {
  return FIXED_DATE_HOLIDAYS.find((h) => h.month === month && h.day === day)?.name ?? null;
}
