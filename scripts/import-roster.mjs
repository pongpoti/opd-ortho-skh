import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { neon } from "@neondatabase/serverless";

const sourceUrl = new URL("./data/historical-roster.json", import.meta.url);

export async function readHistoricalRoster() {
  return JSON.parse(await readFile(sourceUrl, "utf8"));
}

function textLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value !== "string" || value.includes("\0")) {
    throw new Error("Invalid historical text value");
  }
  // Quoting is confined to this checked-in import snapshot, never user input.
  return `'${value.replaceAll("'", "''")}'`;
}

function textArray(values) {
  return `ARRAY[${values.map(textLiteral).join(", ")}]::text[]`;
}

export function validateHistoricalRoster(data) {
  if (data.version !== 1) throw new Error("Unsupported historical roster version");
  const identities = new Set();
  for (const person of data.personnel) {
    if (!["staff", "intern", "nurse"].includes(person.role) || !person.fullName.trim()) {
      throw new Error("Invalid historical personnel entry");
    }
    const key = `${person.role}:${person.fullName}`;
    if (identities.has(key)) throw new Error(`Duplicate personnel entry: ${key}`);
    identities.add(key);
  }
  let days = 0;
  let slots = 0;
  for (const [key, roster] of Object.entries(data.rosters)) {
    const [year, month] = key.split("-").map(Number);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 0 || month > 11) {
      throw new Error(`Invalid historical month: ${key}`);
    }
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    for (const [rawDay, entries] of Object.entries(roster)) {
      const day = Number(rawDay);
      if (!Number.isInteger(day) || day < 1 || day > lastDay) {
        throw new Error(`Invalid historical date: ${key}-${rawDay}`);
      }
      days++;
      for (const [dutyKey, name] of Object.entries(entries)) {
        if (["holiday", "holidayLabel"].includes(dutyKey)) continue;
        if (!/^d[1-5]$/u.test(dutyKey) || typeof name !== "string" || !name.trim()) {
          throw new Error(`Invalid historical duty slot: ${key}-${rawDay}/${dutyKey}`);
        }
        slots++;
      }
    }
  }
  return {
    personnel: data.personnel.length,
    days,
    slots,
    fixedHolidays: data.fixedHolidays.length,
    opdWeekdays: data.opdSchedule.length,
  };
}

/** Inserts only missing historical data, then copies newer legacy edits.
 * Existing canonical user edits and reference rows survive repeated imports.
 */
export function buildHistoricalRosterImportStatements(data) {
  validateHistoricalRoster(data);
  const personnelRows = data.personnel.map((person) =>
    `(${textLiteral(person.role)}, ${textLiteral(person.fullName)}, ${textArray(person.aliases)}, ${textLiteral(person.title)}, ${person.secondCallOrder ?? "NULL"})`
  );
  const dayRows = [];
  const slotRows = [];
  for (const [key, roster] of Object.entries(data.rosters)) {
    const [year, month] = key.split("-").map(Number);
    for (const [day, entries] of Object.entries(roster)) {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${day.padStart(2, "0")}`;
      dayRows.push(`(${textLiteral(date)}, ${entries.holiday ? "TRUE" : "FALSE"}, ${textLiteral(entries.holidayLabel)})`);
      for (const [dutyKey, name] of Object.entries(entries)) {
        if (!/^d[1-5]$/u.test(dutyKey)) continue;
        slotRows.push(`(${textLiteral(date)}, ${textLiteral(dutyKey)}, ${textLiteral(name)}, 'import')`);
      }
    }
  }
  const holidayRows = data.fixedHolidays.map((holiday) =>
    `(${holiday.month}, ${holiday.day}, ${textLiteral(holiday.name)})`
  );
  const opdRows = data.opdSchedule.map((row) =>
    `(${row.weekday}, ${textLiteral(row.day)}, ${textLiteral(row.morning)}, ${textLiteral(row.afternoon)})`
  );
  return [
    `INSERT INTO roster_personnel (role, full_name, aliases, title, second_call_order) VALUES\n${personnelRows.join(",\n")}\nON CONFLICT (role, full_name) DO NOTHING`,
    `INSERT INTO duty_days (shift_date, holiday, holiday_label) VALUES\n${dayRows.join(",\n")}\nON CONFLICT (shift_date) DO NOTHING`,
    `INSERT INTO duty_slots (shift_date, duty_key, person_name, source) VALUES\n${slotRows.join(",\n")}\nON CONFLICT (shift_date, duty_key) DO NOTHING`,
    `INSERT INTO fixed_holidays (month, day, name) VALUES\n${holidayRows.join(",\n")}\nON CONFLICT (month, day) DO NOTHING`,
    `INSERT INTO opd_weekly_schedule (weekday, day, morning, afternoon) VALUES\n${opdRows.join(",\n")}\nON CONFLICT (weekday) DO NOTHING`,
    `INSERT INTO duty_slots (shift_date, duty_key, person_name, source, updated_by_line_user_id, updated_at)
SELECT shift_date, duty_key, person_name, 'legacy', updated_by_line_user_id, updated_at
FROM duty_overrides
WHERE duty_key IN ('d1', 'd2', 'd3', 'd4', 'd5')
ON CONFLICT (shift_date, duty_key) DO UPDATE
SET person_name = EXCLUDED.person_name,
    source = EXCLUDED.source,
    updated_by_line_user_id = EXCLUDED.updated_by_line_user_id,
    updated_at = EXCLUDED.updated_at
WHERE duty_slots.source = 'import' OR duty_slots.updated_at < EXCLUDED.updated_at`,
  ];
}

/** Reviewed monthly rosters applied by the deploy hook, each under its own marker. */
const monthlyImportUrls = [new URL("./data/roster-2026-11.json", import.meta.url)];

export async function readMonthlyRosterImports() {
  return Promise.all(monthlyImportUrls.map(async (url) => JSON.parse(await readFile(url, "utf8"))));
}

export function validateMonthlyRosterImport(data) {
  if (data.version !== 1 || !/^roster-\d{4}-\d{2}-v\d+$/u.test(data.name ?? "")) {
    throw new Error("Invalid monthly roster import header");
  }
  const counts = validateHistoricalRoster({ ...data, personnel: [], fixedHolidays: [], opdSchedule: [] });
  return { days: counts.days, slots: counts.slots };
}

/** Adds the month's confirmed dates and slots. Replaces only slots still holding
 * imported values; admin and legacy edits made in the app are kept.
 */
export function buildMonthlyRosterImportStatements(data) {
  validateMonthlyRosterImport(data);
  const dayRows = [];
  const slotRows = [];
  for (const [key, roster] of Object.entries(data.rosters)) {
    const [year, month] = key.split("-").map(Number);
    for (const [day, entries] of Object.entries(roster)) {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${day.padStart(2, "0")}`;
      dayRows.push(`(${textLiteral(date)}, ${entries.holiday ? "TRUE" : "FALSE"}, ${textLiteral(entries.holidayLabel)})`);
      for (const [dutyKey, name] of Object.entries(entries)) {
        if (!/^d[1-5]$/u.test(dutyKey)) continue;
        slotRows.push(`(${textLiteral(date)}, ${textLiteral(dutyKey)}, ${textLiteral(name)}, 'import')`);
      }
    }
  }
  return [
    `INSERT INTO duty_days (shift_date, holiday, holiday_label) VALUES\n${dayRows.join(",\n")}\nON CONFLICT (shift_date) DO NOTHING`,
    `INSERT INTO duty_slots (shift_date, duty_key, person_name, source) VALUES\n${slotRows.join(",\n")}
ON CONFLICT (shift_date, duty_key) DO UPDATE
SET person_name = EXCLUDED.person_name,
    updated_by_line_user_id = NULL,
    updated_at = now()
WHERE duty_slots.source = 'import' AND duty_slots.person_name IS DISTINCT FROM EXCLUDED.person_name`,
  ];
}

async function main() {
  const { values } = parseArgs({
    options: {
      apply: { type: "boolean", default: false },
      "write-sql": { type: "string" },
      "write-json": { type: "string" },
    },
  });
  const data = await readHistoricalRoster();
  const counts = validateHistoricalRoster(data);
  const statements = buildHistoricalRosterImportStatements(data);
  if (values["write-sql"]) {
    const destination = path.resolve(values["write-sql"]);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, `-- Generated by scripts/import-roster.mjs; safe to rerun.\nBEGIN;\n\n${statements.join(";\n\n")};\n\nCOMMIT;\n`);
    console.log(`Wrote import SQL to ${destination}`);
  }
  if (values["write-json"]) {
    const destination = path.resolve(values["write-json"]);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, `${JSON.stringify(statements, null, 2)}\n`);
    console.log(`Wrote transaction statements to ${destination}`);
  }
  if (values.apply) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for --apply");
    const sql = neon(process.env.DATABASE_URL);
    await sql.transaction(statements.map((statement) => sql.query(statement)));
    console.log("Historical roster imported; saved duty overrides preserved.");
  }
  console.log(JSON.stringify(counts));
  for (const monthly of await readMonthlyRosterImports()) {
    console.log(JSON.stringify({ [monthly.name]: validateMonthlyRosterImport(monthly) }));
  }
  if (!values.apply && !values["write-sql"] && !values["write-json"]) {
    console.log("Validated only. Use --apply with DATABASE_URL to import, or --write-sql <path> to review SQL.");
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    // Do not log the connection string or driver's request details.
    console.error(error instanceof Error ? error.message : "Roster import failed");
    process.exitCode = 1;
  });
}
