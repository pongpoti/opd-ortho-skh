CREATE TABLE "duty_days" (
	"shift_date" date PRIMARY KEY NOT NULL,
	"holiday" boolean DEFAULT false NOT NULL,
	"holiday_label" text
);
--> statement-breakpoint
CREATE TABLE "duty_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shift_date" date NOT NULL,
	"duty_key" text NOT NULL,
	"person_name" text NOT NULL,
	"source" text DEFAULT 'admin' NOT NULL,
	"updated_by_line_user_id" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "duty_slots_shift_date_duty_key_unique" UNIQUE("shift_date","duty_key"),
	CONSTRAINT "duty_slots_duty_key_check" CHECK ("duty_slots"."duty_key" IN ('d1', 'd2', 'd3', 'd4', 'd5')),
	CONSTRAINT "duty_slots_person_name_check" CHECK (length(trim("duty_slots"."person_name")) > 0),
	CONSTRAINT "duty_slots_source_check" CHECK ("duty_slots"."source" IN ('import', 'legacy', 'admin'))
);
--> statement-breakpoint
CREATE TABLE "fixed_holidays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"month" integer NOT NULL,
	"day" integer NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "fixed_holidays_month_day_unique" UNIQUE("month","day"),
	CONSTRAINT "fixed_holidays_month_check" CHECK ("fixed_holidays"."month" BETWEEN 0 AND 11),
	CONSTRAINT "fixed_holidays_day_check" CHECK ("fixed_holidays"."day" BETWEEN 1 AND 31)
);
--> statement-breakpoint
CREATE TABLE "opd_weekly_schedule" (
	"weekday" integer PRIMARY KEY NOT NULL,
	"day" text NOT NULL,
	"morning" text NOT NULL,
	"afternoon" text NOT NULL,
	CONSTRAINT "opd_weekly_schedule_weekday_check" CHECK ("opd_weekly_schedule"."weekday" BETWEEN 0 AND 6)
);
--> statement-breakpoint
CREATE TABLE "roster_personnel" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" text NOT NULL,
	"full_name" text NOT NULL,
	"aliases" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"title" text,
	"second_call_order" integer,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "roster_personnel_role_full_name_unique" UNIQUE("role","full_name"),
	CONSTRAINT "roster_personnel_role_check" CHECK ("roster_personnel"."role" IN ('staff', 'intern', 'nurse')),
	CONSTRAINT "roster_personnel_full_name_check" CHECK (length(trim("roster_personnel"."full_name")) > 0),
	CONSTRAINT "roster_personnel_second_call_order_check" CHECK ("roster_personnel"."second_call_order" IS NULL OR "roster_personnel"."second_call_order" > 0)
);
