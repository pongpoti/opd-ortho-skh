import { date, integer, pgTable, text, time, timestamp, unique, uuid } from "drizzle-orm/pg-core";

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

/** Admin overrides layered on the verified seed roster in duty-data.ts. */
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
