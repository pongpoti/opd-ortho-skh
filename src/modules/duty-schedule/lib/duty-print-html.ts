import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";

import {
  ambiguousDutyFirstNames,
  dutyApplies,
  formatDutyDisplayName,
  getDutyDay,
  isDutyMarker,
  type DutyKey,
  type DutyMonthData,
} from "./duty-data";

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
const DEPARTMENT = "กลุ่มงานออร์โธปิดิกส์ โรงพยาบาลสมุทรสาคร";

/** Light-theme duty colors from `src/theme.ts`, used as print accents. */
const DUTY_COLORS: Record<DutyKey, string> = {
  d1: "#2f6fb0",
  d2: "#7c5cbf",
  d3: "#b8842a",
  d4: "#2f9e6b",
  d5: "#d1483f",
};

/** One accent per person (interns, cast-room nurses), in first-seen order. */
const PERSON_COLORS = [
  DUTY_COLORS.d2,
  DUTY_COLORS.d1,
  DUTY_COLORS.d3,
  DUTY_COLORS.d4,
  DUTY_COLORS.d5,
  "#1f8f86",
  "#c0508a",
  "#5b6b7a",
];

export type OpdScheduleRow = {
  weekday: number;
  day: string;
  morning: string;
  afternoon: string;
};

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

export async function loadPosterCss(): Promise<string> {
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

function buildOpdTableHtml(opd: OpdScheduleRow[]): string {
  const morningTime = "09.00 – 12.00 น.";
  const afternoonTime = "13.00 – 16.00 น.";

  let rows = `<div class="opd-row opd-head"><div class="opd-cell">วัน</div><div class="opd-cell">${morningTime}</div><div class="opd-cell opd-pm">${afternoonTime}</div></div>`;

  for (const r of [...opd].sort((a, b) => a.weekday - b.weekday)) {
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

function buildPosterCalendarHtml(year: number, month: number, data: DutyMonthData): string {
  const n = daysInMonth(year, month);
  const firstCol = mondayFirstCol(year, month);
  const weeks = Math.ceil((firstCol + n) / 7);

  let html = `<div id="calendar" class="calendar" style="grid-template-rows: auto repeat(${weeks}, minmax(0, 1fr))">`;

  WEEKDAYS.forEach((d, i) => {
    const cls = i >= 5 ? "cal-label is-weekend" : "cal-label";
    html += `<div class="${cls}">${d}</div>`;
  });

  const ambiguousStaff = ambiguousDutyFirstNames(year, month, "d1", data);

  for (let i = 0; i < weeks * 7; i++) {
    const date = i - firstCol + 1;
    if (date < 1 || date > n) {
      html += `<div class="cal-cell is-empty"></div>`;
      continue;
    }

    const col = i % 7;
    const duty = getDutyDay(year, month, date, data);
    const holiday = duty.holiday;
    const rawName = duty.entries.d1;
    // "-" (slot cleared by an admin) and "งด" both mean nobody on duty.
    const name =
      rawName && !isDutyMarker(rawName)
        ? formatDutyDisplayName(rawName, ambiguousStaff)
        : "";

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

/** Top-right block on every page: department above the month. */
function headerSideHtml(monthLabel: string): string {
  return `<div class="header-side"><div class="department">${escapeHtml(DEPARTMENT)}</div><div class="month-label">${escapeHtml(monthLabel)}</div></div>`;
}

function buildPosterPage(input: DutyPrintInput, monthLabel: string): string {
  return `<main class="page">
    <header class="page-header">
      <h1>ตารางเวรแพทย์ออร์โธปิดิกส์</h1>
      ${headerSideHtml(monthLabel)}
    </header>
    <section class="section">
      <h2 class="section-title">ตารางออกตรวจ OPD</h2>
      ${buildOpdTableHtml(input.opd)}
    </section>
    <section class="section section-calendar">
      <h2 class="section-title">ตารางเวร staff</h2>
      ${buildPosterCalendarHtml(input.year, input.month, input.data)}
    </section>
  </main>`;
}

type SheetEntry = { name: string; sub?: string; color: string; muted?: boolean };
type LegendItem = { label: string; detail?: string; color: string };

/** Display name for one slot, or null when the slot has nobody to print. */
function slotName(raw: string | undefined, ambiguous: ReadonlySet<string>): string | null {
  if (!raw || raw === "-") return null;
  return formatDutyDisplayName(raw, ambiguous);
}

/** Stable color per person: sorted Thai order, so it does not depend on the first date. */
function personColors(year: number, month: number, key: DutyKey, data: DutyMonthData) {
  const ambiguous = ambiguousDutyFirstNames(year, month, key, data);
  const seen = new Set<string>();
  for (let day = 1; day <= daysInMonth(year, month); day++) {
    const name = slotName(getDutyDay(year, month, day, data).entries[key], ambiguous);
    if (name && !isDutyMarker(name)) seen.add(name);
  }
  const names = [...seen].sort((a, b) => a.localeCompare(b, "th"));
  const colors = new Map(names.map((name, i) => [name, PERSON_COLORS[i % PERSON_COLORS.length]]));
  return { ambiguous, colors };
}

/** A landscape month grid with the app's calendar look, on white for printing. */
function buildMonthSheet(opts: {
  input: DutyPrintInput;
  monthLabel: string;
  title: string;
  entriesFor: (day: number, jsWeekday: number) => SheetEntry[];
  legend?: LegendItem[];
  note?: string;
}): string {
  const { year, month, data } = opts.input;
  const n = daysInMonth(year, month);
  const firstCol = mondayFirstCol(year, month);
  const weeks = Math.ceil((firstCol + n) / 7);

  let grid = WEEKDAYS.map((d, i) =>
    `<div class="mcal-label${i >= 5 ? " is-weekend" : ""}">${d}</div>`
  ).join("");

  for (let i = 0; i < weeks * 7; i++) {
    const date = i - firstCol + 1;
    if (date < 1 || date > n) {
      grid += `<div class="mcal-cell is-empty"></div>`;
      continue;
    }
    const duty = getDutyDay(year, month, date, data);
    const classes = ["mcal-cell"];
    if (i % 7 >= 5) classes.push("is-weekend");
    if (duty.holiday) classes.push("is-holiday");
    const tag = duty.holiday
      ? `<div class="mcal-tag">${escapeHtml(duty.holidayLabel ?? "วันหยุด")}</div>`
      : "";
    const entries = opts
      .entriesFor(date, new Date(year, month, date).getDay())
      .map((e) => {
        const sub = e.sub ? `<div class="chip-sub">${escapeHtml(e.sub)}</div>` : "";
        return `<div class="chip${e.muted ? " is-muted" : ""}" style="--c: ${e.color}"><div class="chip-name">${escapeHtml(e.name)}</div>${sub}</div>`;
      })
      .join("");
    grid += `<div class="${classes.join(" ")}"><div class="mcal-top"><div class="mcal-date">${date}</div>${tag}</div><div class="mcal-body">${entries}</div></div>`;
  }

  const legend = (opts.legend ?? [])
    .map((item) => {
      const detail = item.detail ? `<span class="legend-detail">${escapeHtml(item.detail)}</span>` : "";
      return `<span class="legend-item"><span class="legend-swatch" style="--c: ${item.color}"></span>${escapeHtml(item.label)}${detail}</span>`;
    })
    .join("");

  return `<section class="sheet">
    <header class="sheet-header">
      <h1>${escapeHtml(opts.title)}</h1>
      ${headerSideHtml(opts.monthLabel)}
    </header>
    <div class="mcal" style="grid-template-rows: auto repeat(${weeks}, minmax(0, 1fr))">${grid}</div>
    ${legend || opts.note ? `<footer class="sheet-foot">
      <div class="legend">${legend}</div>
      ${opts.note ? `<div class="sheet-note">${escapeHtml(opts.note)}</div>` : ""}
    </footer>` : ""}
  </section>`;
}

function buildOutpatientSheet(input: DutyPrintInput, monthLabel: string): string {
  const { year, month, data } = input;
  const ambiguous = {
    d3: ambiguousDutyFirstNames(year, month, "d3", data),
    d4: ambiguousDutyFirstNames(year, month, "d4", data),
  };
  return buildMonthSheet({
    input,
    monthLabel,
    title: "เวร OPD ท่าฉลอม · เกตุม",
    entriesFor: (day, weekday) => {
      const duty = getDutyDay(year, month, day, data);
      const out: SheetEntry[] = [];
      for (const key of ["d4", "d3"] as const) {
        if (!dutyApplies(key, weekday)) continue;
        const name = slotName(duty.entries[key], ambiguous[key]);
        if (!name) continue;
        out.push({
          name,
          sub: key === "d3" ? "ท่าฉลอม" : "เกตุม",
          color: DUTY_COLORS[key],
          muted: isDutyMarker(name),
        });
      }
      return out;
    },
    legend: [
      { label: "โรงพยาบาลเกตุม", detail: "วันจันทร์ · วันพฤหัสบดี", color: DUTY_COLORS.d4 },
      { label: "โรงพยาบาลท่าฉลอม", detail: "วันอังคาร", color: DUTY_COLORS.d3 },
    ],
  });
}

function buildInternSheet(input: DutyPrintInput, monthLabel: string): string {
  const { year, month, data } = input;
  const people = personColors(year, month, "d2", data);
  return buildMonthSheet({
    input,
    monthLabel,
    title: "เวร Intern Ortho",
    entriesFor: (day) => {
      const name = slotName(getDutyDay(year, month, day, data).entries.d2, people.ambiguous);
      if (!name) return [];
      return [{ name, color: people.colors.get(name) ?? DUTY_COLORS.d2, muted: isDutyMarker(name) }];
    },
  });
}

function buildCastRoomSheet(input: DutyPrintInput, monthLabel: string): string {
  const { year, month, data } = input;
  const doctors = ambiguousDutyFirstNames(year, month, "d1", data);
  const nurses = personColors(year, month, "d5", data);
  return buildMonthSheet({
    input,
    monthLabel,
    title: "เวรห้องเฝือก",
    entriesFor: (day) => {
      const duty = getDutyDay(year, month, day, data);
      const doctor = slotName(duty.entries.d1, doctors);
      const nurse = slotName(duty.entries.d5, nurses.ambiguous);
      if (!doctor && !nurse) return [];
      return [{
        name: doctor ?? "—",
        sub: nurse ? `พว.${nurse}` : undefined,
        color: (nurse && nurses.colors.get(nurse)) || DUTY_COLORS.d5,
        muted: !doctor || isDutyMarker(doctor),
      }];
    },
    note: "จันทร์–ศุกร์ ปฏิบัติงาน 16.00–24.00 น. · เสาร์ อาทิตย์ วันหยุด ปฏิบัติงาน 08.00–24.00 น.",
  });
}

export type DutyPrintInput = {
  year: number;
  /** 0-indexed month. */
  month: number;
  data: DutyMonthData;
  opd: OpdScheduleRow[];
};

/**
 * Printable duty schedule: the A4 portrait poster first, then landscape
 * month sheets for OPD ท่าฉลอม/เกตุม, intern and ห้องเฝือก. White
 * background throughout so it prints without wasting ink.
 */
export function renderDutyPrintHtml(input: DutyPrintInput, css: string): string {
  const monthLabel = `${THAI_MONTHS[input.month]} ${input.year + BE_OFFSET}`;
  return `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>ตารางเวรแพทย์ออร์โธปิดิกส์ ${escapeHtml(monthLabel)}</title>
  <style>${css}
/* Export chrome: no outer chrome, pages stack like the printed document */
html, body { margin: 0; padding: 0; background: #fff; }
body { display: block; min-height: 0; }
</style>
</head>
<body>
  ${buildPosterPage(input, monthLabel)}
  ${buildOutpatientSheet(input, monthLabel)}
  ${buildInternSheet(input, monthLabel)}
  ${buildCastRoomSheet(input, monthLabel)}
</body>
</html>`;
}
