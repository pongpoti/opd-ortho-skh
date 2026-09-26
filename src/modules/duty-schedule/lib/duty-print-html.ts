import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";

import { getDutyDay } from "./duty-data";
import { OPD_FIXED_SCHEDULE } from "./opd-fixed-schedule";

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

const WEEKDAYS = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];
const BE_OFFSET = 543;

function resolvePosterDir(): string {
  const candidates = [
    path.join(process.cwd(), "src/modules/duty-schedule/print-poster"),
    path.join(process.cwd(), "print-poster"),
  ];
  for (const dir of candidates) {
    if (existsSync(path.join(dir, "styles.css"))) return dir;
  }
  return candidates[0];
}

const POSTER_DIR = resolvePosterDir();

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

/** Monday-first: 0=Mon .. 6=Sun */
function mondayFirstCol(year: number, month: number) {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

/**
 * Fixed OPD rows from the poster template (morning names joined with · in HTML).
 * Kept as structured lists to match the zip's `schedule-data.js`.
 */
function opdMorningNames(morning: string): string[] {
  return morning.split(",").map((s) => s.trim()).filter(Boolean);
}

async function loadPosterCss(): Promise<string> {
  const raw = await readFile(path.join(POSTER_DIR, "styles.css"), "utf8");
  const fontsDir = path.join(POSTER_DIR, "fonts");

  // Embed fonts as data URIs. file:// URLs from setContent do not load reliably
  // in Vercel/Chromium, which made Thai text vanish (only Latin remnants showed).
  const fontCache = new Map<string, string>();
  async function dataUriFor(file: string): Promise<string> {
    const cached = fontCache.get(file);
    if (cached) return cached;
    const buf = await readFile(path.join(fontsDir, file));
    const uri = `url("data:font/ttf;base64,${buf.toString("base64")}")`;
    fontCache.set(file, uri);
    return uri;
  }

  const matches = [...raw.matchAll(/url\("fonts\/([^"]+)"\)/g)];
  let css = raw;
  for (const match of matches) {
    const [full, file] = match;
    const uri = await dataUriFor(file);
    css = css.replace(full, uri);
  }
  return css;
}

function buildOpdTableHtml(): string {
  const morningTime = "09.00 – 12.00 น.";
  const afternoonTime = "13.00 – 16.00 น.";

  let rows = `<div class="opd-row opd-head"><div class="opd-cell">วัน</div><div class="opd-cell">${morningTime}</div><div class="opd-cell opd-pm">${afternoonTime}</div></div>`;

  for (const r of OPD_FIXED_SCHEDULE) {
    const names = opdMorningNames(r.morning)
      .map((name, i) => {
        const sep = i > 0 ? `<span class="opd-sep">·</span>` : "";
        return `${sep}<span>${escapeHtml(name)}</span>`;
      })
      .join("");
    rows += `<div class="opd-row"><div class="opd-cell opd-day">${escapeHtml(r.day)}</div><div class="opd-cell opd-names">${names}</div><div class="opd-cell opd-pm opd-names">${escapeHtml(r.afternoon)}</div></div>`;
  }

  return `<div id="opd-table" class="opd-table">${rows}</div>`;
}

function buildCalendarHtml(year: number, month: number): string {
  const n = daysInMonth(year, month);
  const firstCol = mondayFirstCol(year, month);
  const weeks = Math.ceil((firstCol + n) / 7);

  let html = `<div id="calendar" class="calendar" style="grid-template-rows: auto repeat(${weeks}, minmax(0, 1fr))">`;

  WEEKDAYS.forEach((d, i) => {
    const cls = i >= 5 ? "cal-label is-weekend" : "cal-label";
    html += `<div class="${cls}">${d}</div>`;
  });

  for (let i = 0; i < weeks * 7; i++) {
    const date = i - firstCol + 1;
    if (date < 1 || date > n) {
      html += `<div class="cal-cell is-empty"></div>`;
      continue;
    }

    const col = i % 7;
    const duty = getDutyDay(year, month, date);
    const holiday = duty.holiday;
    const rawName = duty.entries.d1;
    const name = rawName && rawName !== "งด" ? rawName : "";

    const classes = ["cal-cell"];
    if (col >= 5) classes.push("is-weekend");
    if (holiday) classes.push("is-holiday");
    if (!name) classes.push("is-missing");

    const tag = holiday ? `<div class="cal-tag">วันหยุด</div>` : "";
    html += `<div class="${classes.join(" ")}"><div class="cal-top"><div class="cal-date">${date}</div>${tag}</div><div class="cal-name">${escapeHtml(name || "—")}</div></div>`;
  }

  html += `</div>`;
  return html;
}

/** Build the exact A4 poster HTML from the ortho-schedule zip template. */
export async function buildDutyPosterHtml(year: number, month: number): Promise<{
  html: string;
  monthLabel: string;
  filenameBase: string;
}> {
  const css = await loadPosterCss();
  const monthLabel = `${THAI_MONTHS[month]} ${year + BE_OFFSET}`;
  const title = "ตารางเวรแพทย์ออร์โธปิดิกส์";
  const filenameBase = `ortho-schedule-${year + BE_OFFSET}-${String(month + 1).padStart(2, "0")}`;

  const html = `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)} ${escapeHtml(monthLabel)}</title>
  <style>${css}
/* Export chrome: no outer chrome, page fills viewport like the zip exporter */
html, body { margin: 0; padding: 0; background: #fff; }
body { display: block; min-height: 0; }
</style>
</head>
<body>
  <main class="page">
    <header class="page-header">
      <h1>${escapeHtml(title)}</h1>
      <div class="month-label">${escapeHtml(monthLabel)}</div>
    </header>
    <section class="section">
      <h2 class="section-title">ตารางออกตรวจ OPD</h2>
      ${buildOpdTableHtml()}
    </section>
    <section class="section section-calendar">
      <h2 class="section-title">ตารางเวร staff</h2>
      ${buildCalendarHtml(year, month)}
    </section>
  </main>
</body>
</html>`;

  return { html, monthLabel, filenameBase };
}
