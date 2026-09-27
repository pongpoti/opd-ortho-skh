CREATE TABLE "duty_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shift_date" date NOT NULL,
	"duty_key" text NOT NULL,
	"person_name" text NOT NULL,
	"updated_by_line_user_id" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "duty_overrides_shift_date_duty_key_unique" UNIQUE("shift_date","duty_key")
);
