CREATE TABLE "second_call_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"duty_date" date NOT NULL,
	"shift_date" date NOT NULL,
	"shift" text NOT NULL,
	"person_name" text NOT NULL,
	"source" text DEFAULT 'auto' NOT NULL,
	"updated_by_line_user_id" text,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "second_call_slots_shift_person_unique" UNIQUE("shift_date","shift","person_name"),
	CONSTRAINT "second_call_slots_shift_check" CHECK ("second_call_slots"."shift" IN ('ด', 'ช', 'บ')),
	CONSTRAINT "second_call_slots_person_name_check" CHECK (length(trim("second_call_slots"."person_name")) > 0),
	CONSTRAINT "second_call_slots_source_check" CHECK ("second_call_slots"."source" IN ('auto', 'admin'))
);
