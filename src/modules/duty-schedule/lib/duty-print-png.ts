import { readFile } from "fs/promises";
import path from "path";

import sharp from "sharp";

import { getDutyDay } from "./duty-data";
import { OPD_FIXED_SCHEDULE } from "./opd-fixed-schedule";

/** A4 portrait at 150 DPI — keeps PNG under LINE preview 1 MB limit. */
export const DUTY_PRINT_WIDTH = 1240;
export const DUTY_PRINT_HEIGHT = 1754;

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const THAI_WD = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];
const BE_OFFSET = 543;

const COLORS = {
  ink: "#0d4f5c",
  inkMuted: "#3d6b75",
  headerBg: "#0d5c6b",
  headerFg: "#ffffff",
  rowAlt: "#eef6f8",
  rowBg: "#ffffff",
  border: "#c5d9de",
  weekend: "#d4eef7",
  holiday: "#f8d4d8",
  holidayFg: "#c0392b",
  pageTop: "#d8eef4",
  pageBottom: "#ffffff",
  cardBg: "#ffffff",
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

/** Monday-first weekday index: 0=Mon .. 6=Sun. */
function mondayIndex(jsDay: number) {
  return (jsDay + 6) % 7;
}

type CalCell = {
  day: number | null;
  name: string;
  weekend: boolean;
  holiday: boolean;
};

function buildCalendarCells(year: number, month: number): CalCell[] {
  const n = daysInMonth(year, month);
  const firstWd = mondayIndex(new Date(year, month, 1).getDay());
  const cells: CalCell[] = [];

  for (let i = 0; i < firstWd; i++) {
    cells.push({ day: null, name: "", weekend: false, holiday: false });
  }

  for (let d = 1; d <= n; d++) {
    const weekday = new Date(year, month, d).getDay();
    const duty = getDutyDay(year, month, d);
    const staff = duty.entries.d1;
    cells.push({
      day: d,
      name: staff && staff !== "งด" ? staff : "-",
      weekend: weekday === 0 || weekday === 6,
      holiday: duty.holiday,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ day: null, name: "", weekend: false, holiday: false });
  }
  return cells;
}

async function loadFontDataUris(): Promise<{ regular: string; bold: string }> {
  const dir = path.join(process.cwd(), "public", "fonts");
  const [regularBuf, boldBuf] = await Promise.all([
    readFile(path.join(dir, "Sarabun-Regular.ttf")),
    readFile(path.join(dir, "Sarabun-Bold.ttf")),
  ]);
  return {
    regular: `data:font/ttf;base64,${regularBuf.toString("base64")}`,
    bold: `data:font/ttf;base64,${boldBuf.toString("base64")}`,
  };
}

function roundRect(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke?: string,
  strokeWidth = 1
): string {
  const sw = stroke ? ` stroke="${stroke}" stroke-width="${strokeWidth}"` : "";
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="${fill}"${sw}/>`;
}

function buildSvg(year: number, month: number, fonts: { regular: string; bold: string }): string {
  const W = DUTY_PRINT_WIDTH;
  const H = DUTY_PRINT_HEIGHT;
  const marginX = 56;
  const contentW = W - marginX * 2;
  const monthLabel = `${THAI_MONTHS[month]} ${year + BE_OFFSET}`;

  // --- OPD table geometry ---
  const opdTop = 130;
  const opdTitleY = opdTop;
  const tableY = opdTop + 42;
  const colDay = 150;
  const colAm = (contentW - colDay) / 2;
  const colPm = colAm;
  const headerH = 48;
  const rowH = 52;
  const tableH = headerH + OPD_FIXED_SCHEDULE.length * rowH;

  // --- Staff calendar geometry ---
  const calTitleY = tableY + tableH + 56;
  const calHeaderY = calTitleY + 42;
  const calGridY = calHeaderY + 40;
  const calRows = Math.ceil(buildCalendarCells(year, month).length / 7);
  const gap = 10;
  const cellW = (contentW - gap * 6) / 7;
  const cellH = Math.min(118, (H - calGridY - 56 - (calRows - 1) * gap) / calRows);

  const cells = buildCalendarCells(year, month);

  let body = "";

  // Page background gradient
  body += `
  <defs>
    <linearGradient id="pageBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${COLORS.pageTop}"/>
      <stop offset="55%" stop-color="${COLORS.pageBottom}"/>
      <stop offset="100%" stop-color="${COLORS.pageBottom}"/>
    </linearGradient>
    <style>
      @font-face {
        font-family: 'Sarabun';
        src: url('${fonts.regular}') format('truetype');
        font-weight: 400;
      }
      @font-face {
        font-family: 'Sarabun';
        src: url('${fonts.bold}') format('truetype');
        font-weight: 700;
      }
      .title { font-family: Sarabun; font-weight: 700; fill: ${COLORS.ink}; }
      .muted { font-family: Sarabun; font-weight: 400; fill: ${COLORS.inkMuted}; }
      .headerFg { font-family: Sarabun; font-weight: 700; fill: ${COLORS.headerFg}; }
      .cellText { font-family: Sarabun; font-weight: 400; fill: ${COLORS.ink}; }
      .cellBold { font-family: Sarabun; font-weight: 700; fill: ${COLORS.ink}; }
      .holidayText { font-family: Sarabun; font-weight: 700; fill: ${COLORS.holidayFg}; }
    </style>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#pageBg)"/>`;

  // Header
  body += `<text x="${marginX}" y="72" class="title" font-size="36">ตารางเวรแพทย์ออร์โธปิดิกส์</text>`;
  body += `<text x="${W - marginX}" y="72" class="title" font-size="32" text-anchor="end">${escapeXml(monthLabel)}</text>`;

  // OPD section title
  body += `<text x="${marginX}" y="${opdTitleY}" class="title" font-size="26">ตารางออกตรวจ OPD</text>`;

  // OPD table (rounded clip + header/rows drawn inside)
  body += `<clipPath id="opdClip"><rect x="${marginX}" y="${tableY}" width="${contentW}" height="${tableH}" rx="16" ry="16"/></clipPath>`;
  body += `<g clip-path="url(#opdClip)">`;
  body += `<rect x="${marginX}" y="${tableY}" width="${contentW}" height="${headerH}" fill="${COLORS.headerBg}"/>`;

  const hx = marginX;
  const hy = tableY + headerH / 2 + 7;
  body += `<text x="${hx + colDay / 2}" y="${hy}" class="headerFg" font-size="18" text-anchor="middle">วัน</text>`;
  body += `<text x="${hx + colDay + colAm / 2}" y="${hy}" class="headerFg" font-size="18" text-anchor="middle">09.00 – 12.00 น.</text>`;
  body += `<text x="${hx + colDay + colAm + colPm / 2}" y="${hy}" class="headerFg" font-size="18" text-anchor="middle">13.00 – 16.00 น.</text>`;

  OPD_FIXED_SCHEDULE.forEach((row, i) => {
    const y = tableY + headerH + i * rowH;
    const bg = i % 2 === 0 ? COLORS.rowAlt : COLORS.rowBg;
    body += `<rect x="${marginX}" y="${y}" width="${contentW}" height="${rowH}" fill="${bg}"/>`;
    if (i < OPD_FIXED_SCHEDULE.length - 1) {
      body += `<line x1="${marginX}" y1="${y + rowH}" x2="${marginX + contentW}" y2="${y + rowH}" stroke="${COLORS.border}" stroke-width="1"/>`;
    }
    const ty = y + rowH / 2 + 6;
    body += `<text x="${hx + colDay / 2}" y="${ty}" class="cellBold" font-size="18" text-anchor="middle">${escapeXml(row.day)}</text>`;
    body += `<text x="${hx + colDay + 16}" y="${ty}" class="cellText" font-size="17">${escapeXml(row.morning)}</text>`;
    body += `<text x="${hx + colDay + colAm + 16}" y="${ty}" class="cellText" font-size="17">${escapeXml(row.afternoon)}</text>`;
  });

  body += `<line x1="${hx + colDay}" y1="${tableY}" x2="${hx + colDay}" y2="${tableY + tableH}" stroke="${COLORS.border}" stroke-width="1"/>`;
  body += `<line x1="${hx + colDay + colAm}" y1="${tableY}" x2="${hx + colDay + colAm}" y2="${tableY + tableH}" stroke="${COLORS.border}" stroke-width="1"/>`;
  body += `</g>`;
  body += roundRect(marginX, tableY, contentW, tableH, 16, "transparent", COLORS.border, 1.5);

  // Staff calendar title
  body += `<text x="${marginX}" y="${calTitleY}" class="title" font-size="26">ตารางเวร staff</text>`;

  // Weekday headers
  THAI_WD.forEach((wd, i) => {
    const x = marginX + i * (cellW + gap) + cellW / 2;
    body += `<text x="${x}" y="${calHeaderY + 18}" class="muted" font-size="16" text-anchor="middle" font-weight="700">${wd}</text>`;
  });

  cells.forEach((cell, i) => {
    const col = i % 7;
    const row = Math.floor(i / 7);
    const x = marginX + col * (cellW + gap);
    const y = calGridY + row * (cellH + gap);

    if (cell.day == null) {
      body += roundRect(x, y, cellW, cellH, 12, "transparent");
      return;
    }

    let fill = COLORS.cardBg;
    if (cell.holiday) fill = COLORS.holiday;
    else if (cell.weekend) fill = COLORS.weekend;

    body += roundRect(x, y, cellW, cellH, 12, fill, COLORS.border, 1.2);

    const dayColor = cell.holiday ? COLORS.holidayFg : COLORS.ink;
    body += `<text x="${x + 12}" y="${y + 28}" class="cellBold" font-size="20" fill="${dayColor}">${cell.day}</text>`;

    if (cell.holiday) {
      body += `<text x="${x + 36}" y="${y + 26}" class="holidayText" font-size="13">วันหยุด</text>`;
    }

    body += `<text x="${x + cellW / 2}" y="${y + cellH / 2 + 18}" class="cellText" font-size="16" text-anchor="middle">${escapeXml(cell.name)}</text>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${body}
</svg>`;
}

export async function buildDutySchedulePng(
  year: number,
  month: number,
  options?: { preview?: boolean }
): Promise<Buffer> {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 0 || month > 11) {
    throw new Error("Invalid year/month");
  }

  const fonts = await loadFontDataUris();
  const svg = buildSvg(year, month, fonts);
  let pipeline = sharp(Buffer.from(svg)).png({ compressionLevel: 9 });

  if (options?.preview) {
    pipeline = sharp(Buffer.from(svg))
      .resize(Math.round(DUTY_PRINT_WIDTH * 0.55))
      .png({ compressionLevel: 9 });
  }

  return pipeline.toBuffer();
}

export function dutyPrintFilename(year: number, month: number): string {
  const m = String(month + 1).padStart(2, "0");
  return `duty-schedule-${year}-${m}.png`;
}
