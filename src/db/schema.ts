import { sql } from "drizzle-orm";
import { boolean, check, date, integer, pgTable, text, time, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lineUserId: text("line_user_id").notNull().unique(),
    displayName: text("display_name"),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    position: text("position", { enum: ["doctor", "nurse"] }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [unique("users_first_name_last_name_unique").on(table.firstName, table.lastName)]
);

// One row per (visit x cast type) — a visit with two cast types written in
// one submit shares visitId across two rows, so a per-type aggregate (e.g.
// "how many short leg slabs this month") is a single GROUP BY on castType.
export const castLogs = pgTable("cast_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  visitId: text("visit_id").notNull(),
  shiftDate: date("shift_date").notNull(),
  /** Wall-clock time picked in the form; null = not picked (PDF shows createdAt). */
  visitTime: time("visit_time"),
  hn: text("hn").notNull(),
  patientName: text("patient_name").notNull(),
  diagnosis: text("diagnosis"),
  doctorName: text("doctor_name").notNull(),
  castType: text("cast_type").notNull(),
  castLabel: text("cast_label").notNull(),
  count: integer("count").notNull(),
  loggedByLineUserId: text("logged_by_line_user_id"),
  loggedByName: text("logged_by_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Legacy edits retained during rollout; dutySlots is the canonical roster. */
export const dutyOverrides = pgTable(
  "duty_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shiftDate: date("shift_date").notNull(),
    dutyKey: text("duty_key").notNull(),
    personName: text("person_name").notNull(),
    updatedByLineUserId: text("updated_by_line_user_id"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("duty_overrides_shift_date_duty_key_unique").on(table.shiftDate, table.dutyKey),
  ]
);

/** Hospital personnel reference; monthly intern rotation comes from dutySlots. */
export const rosterPersonnel = pgTable(
  "roster_personnel",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    role: text("role", { enum: ["staff", "intern", "nurse"] }).notNull(),
    fullName: text("full_name").notNull(),
    aliases: text("aliases").array().notNull().default(sql`ARRAY[]::text[]`),
    title: text("title"),
    secondCallOrder: integer("second_call_order"),
    active: boolean("active").notNull().default(true),
  },
  (table) => [
    unique("roster_personnel_role_full_name_unique").on(table.role, table.fullName),
    check("roster_personnel_role_check", sql`${table.role} IN ('staff', 'intern', 'nurse')`),
    check("roster_personnel_full_name_check", sql`length(trim(${table.fullName})) > 0`),
    check("roster_personnel_second_call_order_check", sql`${table.secondCallOrder} IS NULL OR ${table.secondCallOrder} > 0`),
  ]
);

/** Canonical roster slots, including explicit cleared/cancelled markers. */
export const dutySlots = pgTable(
  "duty_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shiftDate: date("shift_date").notNull(),
    dutyKey: text("duty_key", { enum: ["d1", "d2", "d3", "d4", "d5"] }).notNull(),
    personName: text("person_name").notNull(),
    source: text("source", { enum: ["import", "legacy", "admin"] }).notNull().default("admin"),
    updatedByLineUserId: text("updated_by_line_user_id"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("duty_slots_shift_date_duty_key_unique").on(table.shiftDate, table.dutyKey),
    check("duty_slots_duty_key_check", sql`${table.dutyKey} IN ('d1', 'd2', 'd3', 'd4', 'd5')`),
    check("duty_slots_person_name_check", sql`length(trim(${table.personName})) > 0`),
    check("duty_slots_source_check", sql`${table.source} IN ('import', 'legacy', 'admin')`),
  ]
);

/** Confirmed roster dates and their special (non-recurring) holiday labels. */
export const dutyDays = pgTable("duty_days", {
  shiftDate: date("shift_date").primaryKey(),
  holiday: boolean("holiday").notNull().default(false),
  holidayLabel: text("holiday_label"),
});

/** Recurring public holidays; month is zero-indexed like the duty calendar. */
export const fixedHolidays = pgTable(
  "fixed_holidays",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    month: integer("month").notNull(),
    day: integer("day").notNull(),
    name: text("name").notNull(),
  },
  (table) => [
    unique("fixed_holidays_month_day_unique").on(table.month, table.day),
    check("fixed_holidays_month_check", sql`${table.month} BETWEEN 0 AND 11`),
    check("fixed_holidays_day_check", sql`${table.day} BETWEEN 1 AND 31`),
  ]
);

/** Weekly OPD reference, independent of the monthly duty roster. */
export const opdWeeklySchedule = pgTable(
  "opd_weekly_schedule",
  {
    weekday: integer("weekday").primaryKey(),
    day: text("day").notNull(),
    morning: text("morning").notNull(),
    afternoon: text("afternoon").notNull(),
  },
  (table) => [check("opd_weekly_schedule_weekday_check", sql`${table.weekday} BETWEEN 0 AND 6`)]
);
