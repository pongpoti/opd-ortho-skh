import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";
import { PHYSICIANS } from "@/lib/physicians";
import { validSecondCallMonth } from "./second-call-share";

const MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
// Preserve the order in the supplied second-call sheet, independently of the
// alphabetical roster used by the rest of the app.
const STAFF_ORDER = [14, 6, 12, 9, 13, 3, 8, 0, 2, 10, 4, 7, 5, 1, 11];
const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;

export async function buildBlankSecondCallPdf(input: {
  year: number;
  /** Zero-indexed, like the duty calendar. */
  month: number;
  internNames: string[];
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
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const label = `${MONTHS[month]} ${year + 543}`;
  doc.setTitle(`ตารางเวร second-call ${label}`);
  doc.setAuthor("กลุ่มงานศัลยกรรมกระดูก โรงพยาบาลสมุทรสาคร");

  function centered(text: string, x: number, y: number, width: number, size: number, heading = false) {
    const font = heading ? bold : regular;
    page.drawText(text, { x: x + (width - font.widthOfTextAtSize(text, size)) / 2, y, size, font });
  }
  centered("ตารางเวรกลุ่มงานศัลยกรรมกระดูก โรงพยาบาลสมุทรสาคร", 0, 553, PAGE_WIDTH, 12, true);
  centered("แนบท้ายคำสั่งที่ .................... ลงวันที่ ....................", 0, 535, PAGE_WIDTH, 10);
  centered(`ประจำเดือน ${label}     (  ) ปฏิบัติงานปกติ     ( / ) ปฏิบัติงานนอกเวลาและวันหยุด`, 0, 516, PAGE_WIDTH, 10, true);

  type Row = { name: string; number?: number };
  const rows: Row[] = STAFF_ORDER.map((index, i) => ({
    name: `${index === 10 ? "พญ." : "นพ."} ${PHYSICIANS[index]}`, number: i + 1,
  }));
  rows.push({ name: "" }, { name: "" });
  const interns = [...new Set(input.internNames.map((name) => name.trim()).filter(Boolean))];
  // Unknown monthly interns remain blank; do not invent people or surnames.
  if (interns.length) interns.forEach((name, i) => rows.push({ name, number: 16 + i }));
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
    // Deliberately leave all shift cells empty in this initial template export.
  });
  return doc.save();
}
