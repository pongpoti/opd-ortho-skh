import { readFile } from "fs/promises";
import path from "path";

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import type { CastVisitSummary } from "./cast-dashboard-actions";
import {
  CAST_CASE_LOG_PAY_PER_CASE,
  CAST_CASE_LOG_ROWS_PER_PAGE,
} from "./cast-case-log-constants";
import { thaiBahtInWords } from "./thai-baht-words";
import { THAI_MONTHS } from "./thai-date";

/** A4 landscape in PDF points (1pt = 1/72"). */
const PAGE_W = 841.89;
const PAGE_H = 595.28;
const MARGIN_TOP = 22;
const ROWS_PER_PAGE = CAST_CASE_LOG_ROWS_PER_PAGE;
const PAY = String(CAST_CASE_LOG_PAY_PER_CASE);
const HEADER_ROW_H = 28;
const DATA_ROW_H = 28;

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
  return visit.casts
    .map((c) => (c.count > 1 ? `${c.label} ×${c.count}` : c.label))
    .join(", ");
}

function chunk<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [[]];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
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

/** Soft-break tokens: prefer splitting after commas/spaces; else by character (Thai). */
function tokenizeForWrap(text: string): string[] {
  const tokens: string[] = [];
  let buf = "";
  for (const ch of text) {
    buf += ch;
    if (ch === " " || ch === ",") {
      tokens.push(buf);
      buf = "";
    }
  }
  if (buf) tokens.push(buf);
  return tokens;
}

function ellipsizeToWidth(text: string, font: PDFFont, size: number, maxWidth: number): string {
  let value = text;
  if (font.widthOfTextAtSize(value, size) <= maxWidth) return value;
  while (value.length > 1 && font.widthOfTextAtSize(`${value}…`, size) > maxWidth) {
    value = value.slice(0, -1);
  }
  return `${value}…`;
}

/**
 * Wrap long diagnosis / multi-cast treatment into up to `maxLines` lines.
 * Prefers breaks after commas/spaces; otherwise wraps by character (Thai text).
 * Remaining overflow on the last line is ellipsized.
 */
function wrapFittedLines(
  text: string,
  maxWidth: number,
  size: number,
  font: PDFFont,
  maxLines: number
): { lines: string[]; size: number } {
  const value = text.trim();
  if (!value) return { lines: [], size };

  let drawSize = size;
  if (font.widthOfTextAtSize(value, drawSize) > maxWidth) {
    // Try shrinking before wrapping when a single line almost fits.
    while (drawSize > 7.5 && font.widthOfTextAtSize(value, drawSize) > maxWidth * 1.35) {
      drawSize -= 0.5;
    }
  }

  const tokens = tokenizeForWrap(value);
  const lines: string[] = [];
  let current = "";
  let overflow = false;

  const widthOk = (s: string) => font.widthOfTextAtSize(s, drawSize) <= maxWidth;

  const startNewLine = () => {
    if (current) lines.push(current);
    current = "";
    return lines.length < maxLines;
  };

  const appendChars = (chunk: string) => {
    for (const ch of chunk) {
      const next = current + ch;
      if (current && !widthOk(next)) {
        if (!startNewLine()) {
          overflow = true;
          // Restore last line so ellipsize can mark that more text existed.
          current = lines.pop() ?? "";
          return;
        }
        current = ch;
        if (!widthOk(current)) {
          overflow = true;
          return;
        }
      } else {
        current = next;
      }
    }
  };

  for (const token of tokens) {
    if (overflow) break;

    const candidate = current + token;
    if (!current || widthOk(candidate)) {
      current = candidate;
      continue;
    }

    if (!startNewLine()) {
      overflow = true;
      // Keep a remnant on the last line for ellipsis.
      current = (lines.pop() ?? "") + token;
      break;
    }

    if (widthOk(token)) {
      current = token;
    } else {
      appendChars(token);
    }
  }

  if (current) {
    if (lines.length < maxLines) {
      lines.push(current);
    } else {
      overflow = true;
      if (lines.length > 0) {
        lines[lines.length - 1] = lines[lines.length - 1] + current;
      } else {
        lines.push(current);
      }
    }
  }

  if (lines.length === 0) return { lines: [], size: drawSize };

  if (overflow || !widthOk(lines[lines.length - 1])) {
    lines[lines.length - 1] = ellipsizeToWidth(lines[lines.length - 1], font, drawSize, maxWidth);
  }

  // Keep original size when one short line already fits.
  if (lines.length === 1 && font.widthOfTextAtSize(lines[0], size) <= maxWidth) {
    return { lines, size };
  }

  return { lines, size: drawSize };
}

function drawWrappedCell(
  page: PDFPage,
  text: string,
  x: number,
  rowBottom: number,
  maxWidth: number,
  size: number,
  font: PDFFont,
  maxLines = 2
) {
  const { lines, size: drawSize } = wrapFittedLines(text, maxWidth, size, font, maxLines);
  if (lines.length === 0) return;

  const lineGap = drawSize + 2;
  const blockH = lines.length * drawSize + (lines.length - 1) * 2;
  // Baseline of the bottom line, vertically centered in the row.
  let y = rowBottom + (DATA_ROW_H - blockH) / 2;

  for (let i = lines.length - 1; i >= 0; i--) {
    page.drawText(lines[i], { x, y, size: drawSize, font, color: INK });
    y += lineGap;
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
  rows: Array<CastVisitSummary | null>
) {
  const left = (PAGE_W - TABLE_W) / 2;
  const tableH = HEADER_ROW_H + DATA_ROW_H * ROWS_PER_PAGE;
  const bottom = topY - tableH;

  // Outer border
  page.drawRectangle({
    x: left,
    y: bottom,
    width: TABLE_W,
    height: tableH,
    borderColor: INK,
    borderWidth: 1,
  });

  // Header bottom line
  page.drawLine({
    start: { x: left, y: topY - HEADER_ROW_H },
    end: { x: left + TABLE_W, y: topY - HEADER_ROW_H },
    thickness: 1,
    color: INK,
  });

  // Vertical lines + header labels
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

  // Horizontal row lines + cell values
  for (let i = 0; i < ROWS_PER_PAGE; i++) {
    const rowTop = topY - HEADER_ROW_H - i * DATA_ROW_H;
    const rowBottom = rowTop - DATA_ROW_H;
    if (i > 0) {
      page.drawLine({
        start: { x: left, y: rowTop },
        end: { x: left + TABLE_W, y: rowTop },
        thickness: 0.75,
        color: INK,
      });
    }

    const visit = rows[i] ?? null;
    if (!visit) continue;

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
    const textY = rowBottom + 9;
    for (let c = 0; c < COLS.length; c++) {
      const pad = 3;
      const cellX = cx + pad;
      const cellW = COLS[c].width - pad * 2;
      const value = cells[c] ?? "";

      // Diagnosis + treatment wrap up to 2 lines (multi-cast / long text).
      if (c === 3 || c === 4) {
        drawWrappedCell(page, value, cellX, rowBottom, cellW, 9, fonts.regular, 2);
      } else {
        drawFitted(
          page,
          value,
          cellX,
          textY,
          cellW,
          9,
          fonts.regular,
          c <= 1 || c >= 5 ? "center" : "left"
        );
      }
      cx += COLS[c].width;
    }
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
 * Extra visits spill onto additional pages (12 rows each).
 */
export async function buildCastCaseLogPdf(input: CastCaseLogPdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const fonts = await loadFonts(pdf);

  const sorted = [...input.visits].sort((a, b) => {
    const byDate = a.shiftDate.localeCompare(b.shiftDate);
    if (byDate !== 0) return byDate;
    return a.createdAt.localeCompare(b.createdAt);
  });

  const pages = chunk(sorted, ROWS_PER_PAGE);

  pages.forEach((pageVisits, pageIndex) => {
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    const tableTop = drawHeader(page, fonts, input, pageIndex);
    const padded: Array<CastVisitSummary | null> = [
      ...pageVisits,
      ...Array.from({ length: ROWS_PER_PAGE - pageVisits.length }, () => null),
    ];
    const tableBottom = drawTable(page, fonts, tableTop, padded);
    // Per-page total from rows on this page only (not the whole month).
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
  let wrote = false;

  for (const group of groups) {
    if (group.visits.length === 0) continue;
    wrote = true;

    const sorted = [...group.visits].sort((a, b) => {
      const byDate = a.shiftDate.localeCompare(b.shiftDate);
      if (byDate !== 0) return byDate;
      return a.createdAt.localeCompare(b.createdAt);
    });
    const pages = chunk(sorted, ROWS_PER_PAGE);

    pages.forEach((pageVisits, pageIndex) => {
      const page = pdf.addPage([PAGE_W, PAGE_H]);
      const input: CastCaseLogPdfInput = {
        month,
        year,
        staff: group.staff,
        visits: group.visits,
      };
      const tableTop = drawHeader(page, fonts, input, pageIndex);
      const padded: Array<CastVisitSummary | null> = [
        ...pageVisits,
        ...Array.from({ length: ROWS_PER_PAGE - pageVisits.length }, () => null),
      ];
      const tableBottom = drawTable(page, fonts, tableTop, padded);
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
    const padded = Array.from({ length: ROWS_PER_PAGE }, () => null);
    const tableBottom = drawTable(page, fonts, tableTop, padded);
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
