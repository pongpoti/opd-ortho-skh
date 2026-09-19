import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  lineUserId: text("line_user_id").notNull().unique(),
  displayName: text("display_name"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  position: text("position", { enum: ["doctor", "nurse"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
