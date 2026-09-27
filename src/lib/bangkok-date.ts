/**
 * Calendar Y/M/D in Asia/Bangkok (hospital local time); month is 0-indexed.
 *
 * Use this instead of `new Date().getMonth()` etc. anywhere the server picks
 * "today" or "this month" — Vercel runs in UTC, which is still the previous
 * day between 00:00 and 07:00 Bangkok time.
 */
export function bangkokToday(): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const num = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  return { year: num("year"), month: num("month") - 1, day: num("day") };
}
