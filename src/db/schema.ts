import { date, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  lineUserId: text("line_user_id").notNull().unique(),
  displayName: text("display_name"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  position: text("position", { enum: ["doctor", "nurse"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// One row per (visit x cast type) — a visit with two cast types written in
// one submit shares visitId across two rows, so a per-type aggregate (e.g.
// "how many short leg slabs this month") is a single GROUP BY on castType.
export const castLogs = pgTable("cast_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  visitId: text("visit_id").notNull(),
  shiftDate: date("shift_date").notNull(),
  hn: text("hn").notNull(),
  patientName: text("patient_name").notNull(),
  doctorName: text("doctor_name").notNull(),
  castType: text("cast_type").notNull(),
  castLabel: text("cast_label").notNull(),
  count: integer("count").notNull(),
  loggedByLineUserId: text("logged_by_line_user_id"),
  loggedByName: text("logged_by_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
