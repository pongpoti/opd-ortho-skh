import { CAST_CASE_LOG_ROWS_PER_PAGE } from "./cast-case-log-constants";
import type { CastVisitSummary } from "./cast-dashboard-actions";

/** Keep column widths in sync with `cast-case-log-pdf.ts` COLS. */
const DIAGNOSIS_COL_W = 128;
const TREATMENT_COL_W = 132;
const CELL_PAD_X = 6;

const PAGE_H = 595.28;
const MARGIN_TOP = 22;
const HEADER_ROW_H = 28;
const DATA_ROW_H = 28;
const CELL_FONT_SIZE = 9;
const CELL_LINE_GAP = 2;
const CELL_PAD_Y = 5;
const FOOTER_SPACE = 100;
const TABLE_TOP_Y = PAGE_H - MARGIN_TOP - 86;

export type WidthFn = (text: string, size: number) => number;

/** Join cast types for the treatment column, e.g. `Short Leg Slab, Long Arm Slab ×2`. */
export function formatCastTreatment(visit: CastVisitSummary): string {
  return visit.casts
    .map((c) => (c.count > 1 ? `${c.label} ×${c.count}` : c.label))
    .join(", ");
}

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

/**
 * Wrap text to any number of lines — no ellipsis / truncation.
 * Used for diagnosis + treatment so multi-line input is fully visible.
 */
export function wrapLines(
  text: string,
  maxWidth: number,
  size: number,
  widthOf: WidthFn
): string[] {
  const value = text.trim();
  if (!value) return [];

  const widthOk = (s: string) => widthOf(s, size) <= maxWidth;
  const tokens = tokenizeForWrap(value);
  const lines: string[] = [];
  let current = "";

  const flush = () => {
    if (current) {
      lines.push(current);
      current = "";
    }
  };

  const appendChars = (chunk: string) => {
    for (const ch of chunk) {
      const next = current + ch;
      if (current && !widthOk(next)) {
        flush();
        current = ch;
      } else {
        current = next;
      }
    }
  };

  for (const token of tokens) {
    if (current && widthOk(current + token)) {
      current += token;
      continue;
    }
    if (current) flush();
    if (widthOk(token)) {
      current = token;
    } else {
      appendChars(token);
    }
  }
  flush();
  return lines;
}

/** Heuristic glyph width for UI page-count estimates (no font embed). */
export function approxWidthFn(): WidthFn {
  return (text, size) => {
    let w = 0;
    for (const ch of text) {
      const code = ch.codePointAt(0) ?? 0;
      w += code < 0x100 ? size * 0.5 : size * 0.9;
    }
    return w;
  };
}

export function lineBlockHeight(lineCount: number, fontSize = CELL_FONT_SIZE): number {
  if (lineCount <= 0) return 0;
  return lineCount * fontSize + (lineCount - 1) * CELL_LINE_GAP;
}

export function measureVisitRowHeight(visit: CastVisitSummary, widthOf: WidthFn): number {
  const dxLines = wrapLines(
    visit.diagnosis,
    DIAGNOSIS_COL_W - CELL_PAD_X,
    CELL_FONT_SIZE,
    widthOf
  );
  const txLines = wrapLines(
    formatCastTreatment(visit),
    TREATMENT_COL_W - CELL_PAD_X,
    CELL_FONT_SIZE,
    widthOf
  );
  const lines = Math.max(1, dxLines.length, txLines.length);
  return Math.max(DATA_ROW_H, lineBlockHeight(lines) + CELL_PAD_Y * 2);
}

function maxTableBodyHeight(tableTop: number): number {
  return Math.max(DATA_ROW_H, tableTop - FOOTER_SPACE - HEADER_ROW_H);
}

/**
 * Pack visits onto pages by measured row height (not a fixed 12-row grid).
 * A 3-line diagnosis/cast row is taller, so later persons spill to the next page.
 */
export function paginateVisitsByHeight(
  visits: CastVisitSummary[],
  widthOf: WidthFn,
  tableTop = TABLE_TOP_Y
): CastVisitSummary[][] {
  if (visits.length === 0) return [[]];

  const maxBody = maxTableBodyHeight(tableTop);
  const pages: CastVisitSummary[][] = [];
  let i = 0;

  while (i < visits.length) {
    const pageVisits: CastVisitSummary[] = [];
    let used = 0;

    while (i < visits.length) {
      const h = measureVisitRowHeight(visits[i], widthOf);
      if (pageVisits.length > 0 && used + h > maxBody) break;
      pageVisits.push(visits[i]);
      used += h;
      i += 1;
      if (h > maxBody) break;
    }

    pages.push(pageVisits);
  }

  return pages;
}

function sortVisits(visits: CastVisitSummary[]): CastVisitSummary[] {
  return [...visits].sort((a, b) => {
    const byDate = a.shiftDate.localeCompare(b.shiftDate);
    if (byDate !== 0) return byDate;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

/** Estimate PDF page count for the admin UI (heuristic widths, no font load). */
export function estimateCastCaseLogPageCount(visits: CastVisitSummary[]): number {
  if (visits.length === 0) return 1;
  return paginateVisitsByHeight(sortVisits(visits), approxWidthFn()).length;
}

export const CAST_CASE_LOG_LAYOUT = {
  HEADER_ROW_H,
  DATA_ROW_H,
  CELL_FONT_SIZE,
  CELL_LINE_GAP,
  CELL_PAD_Y,
  FOOTER_SPACE,
  TABLE_TOP_Y,
  ROWS_PER_PAGE: CAST_CASE_LOG_ROWS_PER_PAGE,
  DIAGNOSIS_COL_W,
  TREATMENT_COL_W,
} as const;
