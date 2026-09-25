import { readFile } from "fs/promises";
import path from "path";

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import type { CastVisitSummary } from "./cast-dashboard-actions";
import {
  CAST_CASE_LOG_PAY_PER_CASE,
  CAST_CASE_LOG_ROWS_PER_PAGE,
} from "./cast-case-log-constants";
import {
  CAST_CASE_LOG_LAYOUT,
  formatCastTreatment,
  measureVisitRowHeight,
  paginateVisitsByHeight,
  wrapLines,
  type WidthFn,
} from "./cast-case-log-layout";
import { thaiBahtInWords } from "./thai-baht-words";
import { THAI_MONTHS } from "./thai-date";

/** A4 landscape in PDF points (1pt = 1/72"). */
const PAGE_W = 841.89;
const PAGE_H = 595.28;
const MARGIN_TOP = 22;
/** Empty-row fill target when all visits are single-line (~28pt each). */
const ROWS_PER_PAGE = CAST_CASE_LOG_ROWS_PER_PAGE;
const PAY = String(CAST_CASE_LOG_PAY_PER_CASE);
const HEADER_ROW_H = CAST_CASE_LOG_LAYOUT.HEADER_ROW_H;
/** Minimum / empty data-row height (single-line). */
const DATA_ROW_H = CAST_CASE_LOG_LAYOUT.DATA_ROW_H;
const CELL_FONT_SIZE = CAST_CASE_LOG_LAYOUT.CELL_FONT_SIZE;
const CELL_LINE_GAP = CAST_CASE_LOG_LAYOUT.CELL_LINE_GAP;
const FOOTER_SPACE = CAST_CASE_LOG_LAYOUT.FOOTER_SPACE;

const INK = rgb(0, 0, 0);

export type CastCaseLogPdfStaff = {
  name: string;
  position?: string;
  group?: string;
};

export type CastCaseLogPdfInput = {
  month: number; // 1-12
  year: number; // Gregorian
  staff: CastCaseLogPdfStaff;
  visits: CastVisitSummary[];
  /** Optional override for the top-right label (defaults to `ฉบับที่ {page}`). */
  sequenceNumber?: string;
};

type EmbeddedFonts = { regular: PDFFont; bold: PDFFont };

type Col = { key: string; label: string; width: number };

/** Column widths sum to usable content width. Multi-line headers use `\n`. */
const COLS: Col[] = [
  { key: "time", label: "เวลา", width: 48 },
  { key: "hn", label: "HN", width: 58 },
  { key: "patient", label: "ชื่อ-นามสกุลผู้ป่วย", width: 118 },
  { key: "diagnosis", label: "วินิจฉัยโรค", width: 128 },
  { key: "treatment", label: "การรักษา, หัตถการ", width: 132 },
  { key: "payVolume", label: "ค่าตอบแทนตาม\nปริมาณงาน", width: 92 },
  { key: "payMin", label: "ค่าตอบแทน\nขั้นต่ำ", width: 78 },
  { key: "payActual", label: "ค่าตอบแทน\nจริง", width: 78 },
];

const TABLE_W = COLS.reduce((sum, c) => sum + c.width, 0);

function dots(len: number) {
  return ".".repeat(len);
}

function formatTimeBangkok(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/** Join cast types for the treatment column, e.g. `Short Leg Slab, Long Arm Slab ×2`. */
function formatTreatment(visit: CastVisitSummary): string {
  return formatCastTreatment(visit);
}

function drawCentered(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  width: number,
  size: number,
  font: PDFFont
) {
  const tw = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: x + Math.max(0, (width - tw) / 2),
    y,
    size,
    font,
    color: INK,
  });
}

function drawFitted(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  font: PDFFont,
  align: "left" | "center" = "left"
) {
  let value = text.trim();
  if (!value) return;

  let drawSize = size;
  while (drawSize > 7 && font.widthOfTextAtSize(value, drawSize) > maxWidth) {
    drawSize -= 0.5;
  }

  if (font.widthOfTextAtSize(value, drawSize) > maxWidth) {
    while (value.length > 1 && font.widthOfTextAtSize(`${value}…`, drawSize) > maxWidth) {
      value = value.slice(0, -1);
    }
    value = `${value}…`;
  }

  const tw = font.widthOfTextAtSize(value, drawSize);
  const drawX = align === "center" ? x + Math.max(0, (maxWidth - tw) / 2) : x;
  page.drawText(value, { x: drawX, y, size: drawSize, font, color: INK });
}

function fontWidthFn(font: PDFFont): WidthFn {
  return (text, size) => font.widthOfTextAtSize(text, size);
}

function maxTableBodyHeight(tableTop: number): number {
  return Math.max(DATA_ROW_H, tableTop - FOOTER_SPACE - HEADER_ROW_H);
}

function drawWrappedCellInRow(
  page: PDFPage,
  text: string,
  x: number,
  rowBottom: number,
  rowHeight: number,
  maxWidth: number,
  font: PDFFont
) {
  const lines = wrapLines(text, maxWidth, CELL_FONT_SIZE, fontWidthFn(font));
  if (lines.length === 0) return;

  const blockH =
    lines.length * CELL_FONT_SIZE + (lines.length - 1) * CELL_LINE_GAP;
  let y = rowBottom + (rowHeight - blockH) / 2;

  for (let i = lines.length - 1; i >= 0; i--) {
    page.drawText(lines[i], {
      x,
      y,
      size: CELL_FONT_SIZE,
      font,
      color: INK,
    });
    y += CELL_FONT_SIZE + CELL_LINE_GAP;
  }
}

function drawDottedField(
  page: PDFPage,
  label: string,
  value: string | undefined,
  x: number,
  y: number,
  fieldWidth: number,
  size: number,
  fonts: EmbeddedFonts
) {
  page.drawText(label, { x, y, size, font: fonts.regular, color: INK });
  const labelW = fonts.regular.widthOfTextAtSize(label, size);
  const startX = x + labelW + 4;
  const usable = Math.max(20, fieldWidth - labelW - 4);

  if (value) {
    drawFitted(page, value, startX, y, usable, size, fonts.regular);
  } else {
    // Approximate a dotted underline with repeated dots.
    const dot = ".";
    const unit = fonts.regular.widthOfTextAtSize(dot, size);
    const count = Math.max(4, Math.floor(usable / unit));
    page.drawText(dot.repeat(count), {
      x: startX,
      y,
      size,
      font: fonts.regular,
      color: INK,
    });
  }
}

async function loadFonts(pdf: PDFDocument): Promise<EmbeddedFonts> {
  pdf.registerFontkit(fontkit);
  const dir = path.join(process.cwd(), "public", "fonts");
  const [regularBytes, boldBytes] = await Promise.all([
    readFile(path.join(dir, "Sarabun-Regular.ttf")),
    readFile(path.join(dir, "Sarabun-Bold.ttf")),
  ]);
  const [regular, bold] = await Promise.all([
    pdf.embedFont(regularBytes, { subset: true }),
    pdf.embedFont(boldBytes, { subset: true }),
  ]);
  return { regular, bold };
}

function drawHeader(
  page: PDFPage,
  fonts: EmbeddedFonts,
  input: CastCaseLogPdfInput,
  pageIndex: number
) {
  const contentLeft = (PAGE_W - TABLE_W) / 2;
  let y = PAGE_H - MARGIN_TOP;

  // Rightmost edition label, e.g. "ฉบับที่ 1"
  const edition =
    input.sequenceNumber?.trim() ||
    `ฉบับที่ ${pageIndex + 1}`;
  const editionSize = 10;
  const editionText = edition.startsWith("ฉบับที่")
    ? edition
    : `ฉบับที่ ${edition}`;
  const editionW = fonts.regular.widthOfTextAtSize(editionText, editionSize);
  page.drawText(editionText, {
    x: contentLeft + TABLE_W - editionW,
    y: y - 12,
    size: editionSize,
    font: fonts.regular,
    color: INK,
  });

  y -= 30;
  const title =
    "บันทึกรายการดูแลรักษา-การรับปรึกษาและการทำหัตถการผู้ป่วยนอกเวลาราชการ";
  drawCentered(page, title, contentLeft, y, TABLE_W, 13, fonts.bold);

  y -= 20;
  const monthName = THAI_MONTHS[input.month - 1] ?? "";
  const be = String(input.year + 543);
  const monthLabel = "ประจำเดือน ";
  const yearLabel = " พ.ศ. ";
  const monthValue = monthName || dots(28);
  const yearValue = be;

  const midSize = 11;
  const monthBlock = `${monthLabel}${monthValue}${yearLabel}${yearValue}`;
  drawCentered(page, monthBlock, contentLeft, y, TABLE_W, midSize, fonts.regular);

  y -= 22;
  const staffSize = 10;
  const staffY = y;
  const third = TABLE_W / 3;
  drawDottedField(
    page,
    "ชื่อเจ้าหน้าที่ผู้ปฏิบัติงาน ",
    input.staff.name,
    contentLeft,
    staffY,
    third - 8,
    staffSize,
    fonts
  );
  drawDottedField(
    page,
    "ตำแหน่ง ",
    input.staff.position,
    contentLeft + third,
    staffY,
    third - 8,
    staffSize,
    fonts
  );
  drawDottedField(
    page,
    "กลุ่มงาน ",
    input.staff.group,
    contentLeft + third * 2,
    staffY,
    third,
    staffSize,
    fonts
  );

  return y - 14;
}

function drawTable(
  page: PDFPage,
  fonts: EmbeddedFonts,
  topY: number,
  visits: CastVisitSummary[]
) {
  const left = (PAGE_W - TABLE_W) / 2;
  const widthOf = fontWidthFn(fonts.regular);
  const maxBody = maxTableBodyHeight(topY);

  const visitHeights = visits.map((v) => measureVisitRowHeight(v, widthOf));
  let used = visitHeights.reduce((sum, h) => sum + h, 0);

  // Pad leftover body space with empty single-line rows (keeps form look).
  const emptyHeights: number[] = [];
  const shortContent =
    visits.length <= ROWS_PER_PAGE && visitHeights.every((h) => h <= DATA_ROW_H);
  while (used + DATA_ROW_H <= maxBody) {
    if (shortContent && visits.length + emptyHeights.length >= ROWS_PER_PAGE) break;
    emptyHeights.push(DATA_ROW_H);
    used += DATA_ROW_H;
  }

  const rowHeights = [...visitHeights, ...emptyHeights];
  // Always keep at least the classic empty grid when there are no visits.
  if (rowHeights.length === 0) {
    for (let i = 0; i < ROWS_PER_PAGE; i++) rowHeights.push(DATA_ROW_H);
  }

  const bodyH = rowHeights.reduce((sum, h) => sum + h, 0);
  const tableH = HEADER_ROW_H + bodyH;
  const bottom = topY - tableH;

  page.drawRectangle({
    x: left,
    y: bottom,
    width: TABLE_W,
    height: tableH,
    borderColor: INK,
    borderWidth: 1,
  });

  page.drawLine({
    start: { x: left, y: topY - HEADER_ROW_H },
    end: { x: left + TABLE_W, y: topY - HEADER_ROW_H },
    thickness: 1,
    color: INK,
  });

  let x = left;
  for (const col of COLS) {
    if (x > left) {
      page.drawLine({
        start: { x, y: bottom },
        end: { x, y: topY },
        thickness: 1,
        color: INK,
      });
    }

    const size = 9;
    const lines = col.label.split("\n");
    if (lines.length > 1) {
      drawCentered(page, lines[0], x, topY - 12, col.width, size, fonts.bold);
      drawCentered(page, lines[1], x, topY - 23, col.width, size, fonts.bold);
    } else {
      drawCentered(page, col.label, x, topY - 17, col.width, size, fonts.bold);
    }
    x += col.width;
  }

  let rowTop = topY - HEADER_ROW_H;
  for (let i = 0; i < rowHeights.length; i++) {
    const rowH = rowHeights[i];
    const rowBottom = rowTop - rowH;
    if (i > 0) {
      page.drawLine({
        start: { x: left, y: rowTop },
        end: { x: left + TABLE_W, y: rowTop },
        thickness: 0.75,
        color: INK,
      });
    }

    const visit = visits[i] ?? null;
    if (visit) {
      const cells = [
        formatTimeBangkok(visit.createdAt),
        visit.hn,
        visit.patientName,
        visit.diagnosis,
        formatTreatment(visit),
        PAY,
        "",
        PAY,
      ];

      let cx = left;
      const textY = rowBottom + (rowH - CELL_FONT_SIZE) / 2;
      for (let c = 0; c < COLS.length; c++) {
        const pad = 3;
        const cellX = cx + pad;
        const cellW = COLS[c].width - pad * 2;
        const value = cells[c] ?? "";

        if (c === 3 || c === 4) {
          drawWrappedCellInRow(
            page,
            value,
            cellX,
            rowBottom,
            rowH,
            cellW,
            fonts.regular
          );
        } else {
          drawFitted(
            page,
            value,
            cellX,
            textY,
            cellW,
            CELL_FONT_SIZE,
            fonts.regular,
            c <= 1 || c >= 5 ? "center" : "left"
          );
        }
        cx += COLS[c].width;
      }
    }

    rowTop = rowBottom;
  }

  return bottom;
}

function drawSignatureLine(
  page: PDFPage,
  fonts: EmbeddedFonts,
  role: string,
  right: number,
  y: number,
  size: number
) {
  const prefix = "ลงชื่อ ";
  const roleW = fonts.regular.widthOfTextAtSize(role, size);
  const prefixW = fonts.regular.widthOfTextAtSize(prefix, size);
  const dotsWidth = 200;
  const unit = fonts.regular.widthOfTextAtSize(".", size);
  const dots = ".".repeat(Math.max(8, Math.floor(dotsWidth / unit)));
  const dotsW = fonts.regular.widthOfTextAtSize(dots, size);
  const totalW = prefixW + dotsW + 6 + roleW;
  const startX = right - totalW;

  page.drawText(prefix, { x: startX, y, size, font: fonts.regular, color: INK });
  page.drawText(dots, {
    x: startX + prefixW,
    y,
    size,
    font: fonts.regular,
    color: INK,
  });
  page.drawText(role, {
    x: startX + prefixW + dotsW + 6,
    y,
    size,
    font: fonts.regular,
    color: INK,
  });
}

function drawFooter(
  page: PDFPage,
  fonts: EmbeddedFonts,
  tableBottom: number,
  totalAmount: number | null
) {
  const left = (PAGE_W - TABLE_W) / 2;
  const right = left + TABLE_W;
  const size = 10;
  let y = tableBottom - 18;

  // Amount-in-words + total compensation box under last column
  const wordsLabel = "จำนวนเงิน (ตัวอักษร) ";
  page.drawText(wordsLabel, { x: left, y, size, font: fonts.regular, color: INK });
  const wordsLabelW = fonts.regular.widthOfTextAtSize(wordsLabel, size);
  const totalCol = COLS[COLS.length - 1];
  const totalBoxW = totalCol.width;
  const totalBoxX = right - totalBoxW;
  const totalLabel = "รวมค่าตอบแทน";
  const totalLabelW = fonts.regular.widthOfTextAtSize(totalLabel, size);
  const wordsFieldW = totalBoxX - left - wordsLabelW - totalLabelW - 16;

  if (totalAmount != null && totalAmount > 0) {
    const words = thaiBahtInWords(totalAmount);
    drawFitted(page, words, left + wordsLabelW, y, wordsFieldW, size, fonts.regular);
  } else {
    const unit = fonts.regular.widthOfTextAtSize(".", size);
    page.drawText(".".repeat(Math.max(8, Math.floor(wordsFieldW / unit))), {
      x: left + wordsLabelW,
      y,
      size,
      font: fonts.regular,
      color: INK,
    });
  }

  page.drawText(totalLabel, {
    x: totalBoxX - totalLabelW - 6,
    y,
    size,
    font: fonts.regular,
    color: INK,
  });
  page.drawRectangle({
    x: totalBoxX,
    y: y - 4,
    width: totalBoxW,
    height: 18,
    borderColor: INK,
    borderWidth: 1,
  });

  if (totalAmount != null && totalAmount > 0) {
    drawCentered(
      page,
      String(totalAmount),
      totalBoxX,
      y,
      totalBoxW,
      size,
      fonts.regular
    );
  }

  y -= 36;
  drawSignatureLine(page, fonts, "เจ้าหน้าที่ผู้ปฏิบัติงาน", right, y, size);
  y -= 24;
  drawSignatureLine(page, fonts, "ผู้ควบคุม (หัวหน้ากลุ่มงาน)", right, y, size);
}

/**
 * Build one A4-landscape case-log PDF for a single physician/month.
 * Row height grows with wrapped diagnosis/cast text (no truncation).
 * Persons that no longer fit spill onto the next page; each page totals
 * only its own rows.
 */
export async function buildCastCaseLogPdf(input: CastCaseLogPdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const fonts = await loadFonts(pdf);
  const widthOf = fontWidthFn(fonts.regular);

  const sorted = [...input.visits].sort((a, b) => {
    const byDate = a.shiftDate.localeCompare(b.shiftDate);
    if (byDate !== 0) return byDate;
    return a.createdAt.localeCompare(b.createdAt);
  });

  const pages = paginateVisitsByHeight(sorted, widthOf);

  pages.forEach((pageVisits, pageIndex) => {
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    const tableTop = drawHeader(page, fonts, input, pageIndex);
    const tableBottom = drawTable(page, fonts, tableTop, pageVisits);
    const pageTotal = pageVisits.length * CAST_CASE_LOG_PAY_PER_CASE;
    drawFooter(page, fonts, tableBottom, pageVisits.length > 0 ? pageTotal : null);
  });

  return pdf.save();
}

/**
 * Build a multi-staff PDF: one form (possibly multi-page) per staff member,
 * in the given staff order. Staff with no visits are skipped.
 */
export async function buildCastCaseLogPdfByPhysicians(
  month: number,
  year: number,
  groups: Array<{ staff: CastCaseLogPdfStaff; visits: CastVisitSummary[] }>
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const fonts = await loadFonts(pdf);
  const widthOf = fontWidthFn(fonts.regular);
  let wrote = false;

  for (const group of groups) {
    if (group.visits.length === 0) continue;
    wrote = true;

    const sorted = [...group.visits].sort((a, b) => {
      const byDate = a.shiftDate.localeCompare(b.shiftDate);
      if (byDate !== 0) return byDate;
      return a.createdAt.localeCompare(b.createdAt);
    });
    const pages = paginateVisitsByHeight(sorted, widthOf);

    pages.forEach((pageVisits, pageIndex) => {
      const page = pdf.addPage([PAGE_W, PAGE_H]);
      const input: CastCaseLogPdfInput = {
        month,
        year,
        staff: group.staff,
        visits: group.visits,
      };
      const tableTop = drawHeader(page, fonts, input, pageIndex);
      const tableBottom = drawTable(page, fonts, tableTop, pageVisits);
      const pageTotal = pageVisits.length * CAST_CASE_LOG_PAY_PER_CASE;
      drawFooter(page, fonts, tableBottom, pageVisits.length > 0 ? pageTotal : null);
    });
  }

  if (!wrote) {
    // Empty month: still emit one blank template page.
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    const input: CastCaseLogPdfInput = {
      month,
      year,
      staff: groups[0]?.staff ?? { name: "", position: "แพทย์", group: "ศัลยกรรมกระดูก" },
      visits: [],
    };
    const tableTop = drawHeader(page, fonts, input, 0);
    const tableBottom = drawTable(page, fonts, tableTop, []);
    drawFooter(page, fonts, tableBottom, null);
  }

  return pdf.save();
}

export function castCaseLogFilename(month: number, year: number, doctorName?: string): string {
  const mm = String(month).padStart(2, "0");
  const be = year + 543;
  const who = doctorName ? `-${doctorName.replace(/\s+/g, "_")}` : "";
  return `cast-case-log-${be}-${mm}${who}.pdf`;
}
