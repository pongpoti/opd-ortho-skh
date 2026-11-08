import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import type { SecondCallSlot, SubDuty } from "./second-call-assign";
import { validSecondCallMonth } from "./second-call-share";

const MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const firstName = (name: string) => name.trim().split(/\s+/u)[0];

export async function buildSecondCallPdf(input: {
  year: number;
  /** Zero-indexed, like the duty calendar. */
  month: number;
  /** This month's interns; `key` matches `cells`, `name` is null until the roster knows them. */
  interns: Array<{ key: string; name: string | null }>;
  staff: Array<{ fullName: string; title: string | null; secondCallOrder: number | null }>;
  /**
   * Shift marks per person (staff full name or intern key), one entry per
   * day column plus the next month's 1st. Omitted: a blank template.
   */
  cells?: Map<string, string[]>;
  /**
   * For the first page (the hospital order): each day's holiday flag (index
   * 0 = day 1) and the month's sub-duties, including the 1st's ด carried in
   * from the previous month. Omitted slots: the order's table is left blank.
   */
  days?: { holiday: boolean }[];
  slots?: SecondCallSlot[];
}): Promise<Uint8Array> {
  const { year, month } = input;
  if (!validSecondCallMonth(year, month)) throw new Error("Invalid month");
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fontDir = path.join(process.cwd(), "public", "fonts");
  const [regularBytes, boldBytes] = await Promise.all([
    readFile(path.join(fontDir, "Sarabun-Regular.ttf")),
    readFile(path.join(fontDir, "Sarabun-Bold.ttf")),
  ]);
  const regular = await doc.embedFont(regularBytes, { subset: true });
  const bold = await doc.embedFont(boldBytes, { subset: true });
  const label = `${MONTHS[month]} ${year + 543}`;
  doc.setTitle(`ตารางเวร second-call ${label}`);
  doc.setAuthor("กลุ่มงานศัลยกรรมกระดูก โรงพยาบาลสมุทรสาคร");
  drawOrderPage(doc, { regular, bold }, input);
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  function centered(text: string, x: number, y: number, width: number, size: number, heading = false) {
    const font = heading ? bold : regular;
    page.drawText(text, { x: x + (width - font.widthOfTextAtSize(text, size)) / 2, y, size, font });
  }
  centered("ตารางเวรกลุ่มงานศัลยกรรมกระดูก โรงพยาบาลสมุทรสาคร", 0, 553, PAGE_WIDTH, 12, true);
  centered("แนบท้ายคำสั่งที่ .................... ลงวันที่ ....................", 0, 535, PAGE_WIDTH, 10);
  centered(`ประจำเดือน ${label}     (  ) ปฏิบัติงานปกติ     ( / ) ปฏิบัติงานนอกเวลาและวันหยุด`, 0, 516, PAGE_WIDTH, 10, true);

  type Row = { name: string; number?: number; key?: string };
  const staff = [...input.staff].sort((a, b) => (a.secondCallOrder ?? Infinity) - (b.secondCallOrder ?? Infinity) || a.fullName.localeCompare(b.fullName, "th"));
  const rows: Row[] = staff.map((person, i) => ({
    name: `${person.title ? `${person.title} ` : ""}${person.fullName}`, number: i + 1, key: person.fullName,
  }));
  rows.push({ name: "" }, { name: "" });
  const interns = [...new Map(input.interns.map((intern) => [intern.key, intern])).values()];
  // Unknown interns keep their row and marks but no name; never invent people or surnames.
  if (interns.length) interns.forEach((intern, i) => rows.push({ name: intern.name ?? "", number: staff.length + 1 + i, key: intern.key }));
  else rows.push({ name: "" }, { name: "" }, { name: "" });
  rows.push({ name: "" }, { name: "" });

  const left = 20;
  const top = 502;
  const width = PAGE_WIDTH - left * 2;
  const headerHeight = 19;
  const rowHeight = Math.min(16, (top - 100 - headerHeight) / rows.length);
  const bottom = top - headerHeight - rows.length * rowHeight;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const widths = [22, 154, 32, ...Array<number>(days + 1).fill((width - 208) / (days + 1))];
  const boundaries = [left];
  for (const columnWidth of widths) boundaries.push(boundaries[boundaries.length - 1] + columnWidth);
  page.drawRectangle({ x: left, y: top - headerHeight, width, height: headerHeight, color: rgb(0.95, 0.95, 0.95) });
  for (const x of boundaries) page.drawLine({ start: { x, y: bottom }, end: { x, y: top }, thickness: 0.55 });
  for (const y of [top, ...Array.from({ length: rows.length + 1 }, (_, i) => top - headerHeight - i * rowHeight)]) {
    page.drawLine({ start: { x: left, y }, end: { x: left + width, y }, thickness: 0.55 });
  }
  const headings = ["ลำดับ", "ชื่อ-สกุล", "ตำแหน่ง", ...Array.from({ length: days }, (_, i) => String(i + 1)), "1"];
  headings.forEach((text, i) => centered(text, boundaries[i], top - 13, widths[i], i < 3 ? 9 : 10, true));
  rows.forEach((row, i) => {
    if (row.number === undefined) return;
    const size = Math.min(9, rowHeight * 0.56);
    const y = top - headerHeight - (i + 0.5) * rowHeight - size * 0.36;
    centered(String(row.number), left, y, widths[0], size);
    // Fit long names inside their cell without wrapping into another row.
    const nameSize = Math.min(size, (widths[1] - 7) / regular.widthOfTextAtSize(row.name, 1));
    page.drawText(row.name, { x: boundaries[1] + 3.5, y, font: regular, size: nameSize });
    centered("แพทย์", boundaries[2], y, widths[2], size);
    if (!input.cells || !row.key) return;
    const marks = input.cells.get(row.key) ?? [];
    for (let column = 0; column <= days; column++) {
      centered(marks[column] || "-", boundaries[3 + column], y, widths[3 + column], size);
    }
  });
  return doc.save();
}

type Fonts = { regular: PDFFont; bold: PDFFont };

/**
 * The hospital order ("คำสั่งโรงพยาบาลสมุทรสาคร"), portrait A4: one row per
 * day plus the next month's 1st, with first call (real duty) and second call
 * for 00:00-08:00 (ด), 08:00-16:00 (ช, holidays only) and 16:00-24:00 (บ).
 * Weekends and holidays are shaded, like the signed paper sheets.
 */
function drawOrderPage(doc: PDFDocument, fonts: Fonts, input: {
  year: number; month: number; days?: { holiday: boolean }[]; slots?: SecondCallSlot[];
}) {
  const { year, month } = input;
  const width = 595.28;
  const height = 841.89;
  const page = doc.addPage([width, height]);
  const be = year + 543;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const next = new Date(Date.UTC(year, month + 1, 1));

  function centered(text: string, x: number, y: number, w: number, size: number, heading = false) {
    const font = heading ? fonts.bold : fonts.regular;
    // Shrink rather than spill into the next cell.
    const fit = Math.min(size, (w - 4) / Math.max(font.widthOfTextAtSize(text, 1), 0.001));
    page.drawText(text, { x: x + (w - font.widthOfTextAtSize(text, fit)) / 2, y, size: fit, font });
  }
  centered("คำสั่งโรงพยาบาลสมุทรสาคร", 0, 790, width, 15, true);
  centered(`ที่  ............/${be}`, 0, 770, width, 14, true);
  page.drawLine({ start: { x: width / 2 - 80, y: 757 }, end: { x: width / 2 + 80, y: 757 }, thickness: 0.5, dashArray: [2, 2] });
  centered("เพื่อให้การรักษาพยาบาลนอกเวลาราชการเกิดผลดี ต่อผู้มารับบริการในโรงพยาบาลสมุทรสาคร จึงมีคำสั่ง", 0, 737, width, 13, true);
  centered(`ให้เจ้าหน้าที่ในหน่วยงานศัลยกรรมกระดูก ปฏิบัติงานนอกเวลาราชการประจำเดือน ${MONTHS[month]} ${be}  ดังต่อไปนี้`, 0, 720, width, 13, true);

  // Names by sub-duty: [first call, second call].
  const names = new Map<string, [string, string]>();
  for (const slot of input.slots ?? []) {
    names.set(`${slot.day}:${slot.shift}`, [slot.real ? firstName(slot.real) : "", slot.secondCall.map(firstName).join(", ")]);
  }
  type Row = { label: string; day?: number; shaded: boolean; shifts: SubDuty[] };
  const rows: Row[] = Array.from({ length: days }, (_, i) => {
    const weekday = new Date(Date.UTC(year, month, i + 1)).getUTCDay();
    return {
      label: `${i + 1} ${MONTHS[month]} ${be}`, day: i + 1,
      shaded: !!input.days?.[i]?.holiday || weekday === 0 || weekday === 6,
      shifts: ["ด", "ช", "บ"],
    };
  });
  rows.push({ label: `1 ${MONTHS[next.getUTCMonth()]} ${next.getUTCFullYear() + 543}`, day: days + 1, shaded: false, shifts: ["ด"] });
  rows.push({ label: "", shaded: false, shifts: [] });

  const left = 42;
  const tableWidth = width - left * 2;
  const top = 708;
  const headerHeight = 40;
  const rowHeight = Math.min(19, (top - headerHeight - 36) / rows.length);
  const bottom = top - headerHeight - rows.length * rowHeight;
  const dateWidth = 98;
  const nameWidth = (tableWidth - dateWidth) / 6;
  const xs = [left, left + dateWidth, ...Array.from({ length: 6 }, (_, i) => left + dateWidth + (i + 1) * nameWidth)];
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.7 });

  rows.forEach((row, i) => {
    if (!row.shaded) return;
    const y = top - headerHeight - (i + 1) * rowHeight;
    page.drawRectangle({ x: left, y, width: tableWidth, height: rowHeight, color: rgb(0.82, 0.82, 0.82) });
  });
  // Header: date spans both header rows; each period spans its two columns.
  const mid = top - headerHeight / 2;
  line(left, top, left + tableWidth, top);
  line(xs[1], mid, left + tableWidth, mid);
  for (let i = 0; i <= rows.length; i++) line(left, top - headerHeight - i * rowHeight, left + tableWidth, top - headerHeight - i * rowHeight);
  xs.forEach((x, i) => line(x, i === 0 || i === 1 || i % 2 === 1 ? top : mid, x, bottom));
  centered("วันที่", xs[0], mid - 5, dateWidth, 13, true);
  ["00:00-08:00 น.", "08:00-16:00 น.", "16:00-24:00 น."].forEach((text, i) =>
    centered(text, xs[1 + i * 2], mid + 6, nameWidth * 2, 12.5, true));
  for (let i = 0; i < 6; i++) centered(i % 2 ? "Second call" : "First call", xs[1 + i], top - headerHeight + 6, nameWidth, 12);

  const size = Math.min(12, rowHeight * 0.62);
  rows.forEach((row, i) => {
    const y = top - headerHeight - (i + 0.5) * rowHeight - size * 0.32;
    if (row.label) centered(row.label, xs[0], y, dateWidth, size);
    if (row.day === undefined) return;
    (["ด", "ช", "บ"] as const).forEach((shift, period) => {
      if (!row.shifts.includes(shift)) return;
      const [first, second] = names.get(`${row.day}:${shift}`) ?? ["", ""];
      if (first) centered(first, xs[1 + period * 2], y, nameWidth, size);
      if (second) centered(second, xs[2 + period * 2], y, nameWidth, size);
    });
  });
}
