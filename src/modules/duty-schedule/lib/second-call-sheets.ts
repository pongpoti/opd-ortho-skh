import { SUB_DUTY_ORDER, slotKey, type SubDuty } from "./second-call-assign";

/**
 * Second-call as written on the signed paper sheets, by sub-duty of the
 * month's duty days ("<day><shift> <first name>"; day `days + 1` is the next
 * month's 1st ด). These months show the sheet as it was, and the turn order
 * for later months carries on from them.
 */
const SHEETS: Record<string, string> = {
  // กันยายน 2569
  "2026-09": `
    1บ เทพรักษา, 2ด สิทธิพงศ์, 2บ เฉลิมพล, 3ด ปิติพงศ์, 3บ ชัยวัฒน์, 4ด ธนกร, 4บ ธีรฉัตต์, 5ด วรงค์พร,
    5ช ปองสิทธิ์, 5บ วิฑูรย์, 6ด ชวพล, 6ช วันทนันท์, 6บ พลสันต์, 7ด พลสันต์, 7บ ปิติพงศ์, 8ด เทพรักษา,
    8บ สิทธิพงศ์, 9ด เฉลิมพล, 9บ ธนกร, 10ด วิฑูรย์, 10บ ธีรฉัตต์, 11ด ปองสิทธิ์, 11บ วรงค์พร, 12ด พลสันต์,
    12ช วันทนันท์, 12บ เฉลิมพล, 13ด ชวพล, 13ช สิทธิพงศ์, 13บ เทพรักษา, 14ด ปิติพงศ์, 14บ ชัยวัฒน์, 15ด ธนกร,
    15บ วิฑูรย์, 16ด วรงค์พร, 16บ ปองสิทธิ์, 17ด วันทนันท์, 17บ ชวพล, 18ด ธีรฉัตต์, 18บ ชัยวัฒน์, 19ด พลสันต์,
    19ช สิทธิพงศ์, 19บ เทพรักษา, 20ด ปิติพงศ์, 20ช เฉลิมพล, 20บ ธนกร, 21ด วิฑูรย์, 21บ วรงค์พร, 22ด ปองสิทธิ์,
    22บ วันทนันท์, 23ด ชัยวัฒน์, 23บ ธีรฉัตต์, 24ด ชวพล, 24บ พลสันต์, 25ด สิทธิพงศ์, 25บ เทพรักษา, 26ด ปิติพงศ์,
    26ช เฉลิมพล, 26บ ธนกร, 27ด วิฑูรย์, 27ช วรงค์พร, 27บ ปองสิทธิ์, 28ด ธีรฉัตต์, 28บ ชวพล, 29ด วันทนันท์,
    29บ สิทธิพงศ์, 30ด พลสันต์, 30บ ชัยวัฒน์, 31ด เทพรักษา`,
  // ตุลาคม 2569
  "2026-10": `
    1บ ปิติพงศ์, 2ด สิทธิพงศ์, 2บ ธนกร, 3ด วิฑูรย์, 3ช วรงค์พร, 3บ ปองสิทธิ์, 4ด ธีรฉัตต์, 4ช วรงค์พร,
    4บ วันทนันท์, 5ด ชัยวัฒน์, 5บ วิฑูรย์, 6ด เฉลิมพล, 6บ เทพรักษา, 7ด ปิติพงศ์, 7บ เฉลิมพล, 8ด ธนกร,
    8บ วิฑูรย์, 9ด ชวพล, 9บ ปองสิทธิ์, 10ด ธีรฉัตต์, 10ช ชวพล, 10บ วันทนันท์, 11ด ชัยวัฒน์, 11ช พลสันต์,
    11บ สิทธิพงศ์, 12ด เทพรักษา, 12บ ธีรฉัตต์, 13ด เฉลิมพล, 13ช ธนกร, 13บ วิฑูรย์, 14ด วรงค์พร, 14บ ชัยวัฒน์,
    15ด ธีรฉัตต์, 15บ ชวพล, 16ด เทพรักษา, 16บ ชัยวัฒน์, 17ด พลสันต์, 17ช สิทธิพงศ์, 17บ เทพรักษา, 18ด ปิติพงศ์,
    18ช วันทนันท์, 18บ วันทนันท์, 19ด วิฑูรย์, 19บ วรงค์พร, 20ด สิทธิพงศ์, 20บ ปิติพงศ์, 21ด ชวพล, 21บ วันทนันท์,
    22ด ปองสิทธิ์, 22บ เฉลิมพล, 23ด ปองสิทธิ์, 23ช ธนกร, 23บ ธนกร, 24ด เฉลิมพล, 24ช เฉลิมพล, 24บ ธนกร,
    25ด วิฑูรย์, 25ช วรงค์พร, 25บ สิทธิพงศ์, 26ด ธีรฉัตต์, 26บ ชวพล, 27ด ชวพล, 27บ ชัยวัฒน์, 28ด พลสันต์,
    28บ สิทธิพงศ์, 29ด เทพรักษา, 29บ ปิติพงศ์, 30ด ปิติพงศ์, 30บ พลสันต์, 31ด วรงค์พร, 31ช ปองสิทธิ์, 31บ ธีรฉัตต์,
    32ด วันทนันท์`,
};

/**
 * A paper sheet's second-call keyed by `slotKey`, with first names resolved
 * against `staff` (full names). Null when the month has no sheet.
 */
export function secondCallSheet(year: number, month: number, staff: readonly string[]): Map<string, string[]> | null {
  const text = SHEETS[`${year}-${String(month + 1).padStart(2, "0")}`];
  if (!text) return null;
  const byFirst = new Map(staff.map((name) => [name.trim().split(/\s+/u)[0], name]));
  const sheet = new Map<string, string[]>();
  for (const item of text.split(",")) {
    const match = item.trim().match(/^(\d+)(\S)\s+(\S+)$/u);
    if (!match || !SUB_DUTY_ORDER.includes(match[2] as SubDuty)) throw new Error(`Bad second-call sheet entry: ${item.trim()}`);
    const name = byFirst.get(match[3]);
    if (!name) continue;
    const key = slotKey({ day: Number(match[1]), shift: match[2] as SubDuty });
    sheet.set(key, [...(sheet.get(key) ?? []), name]);
  }
  return sheet;
}
