CREATE TABLE "cast_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visit_id" text NOT NULL,
	"shift_date" date NOT NULL,
	"hn" text NOT NULL,
	"patient_name" text NOT NULL,
	"doctor_name" text NOT NULL,
	"cast_type" text NOT NULL,
	"cast_label" text NOT NULL,
	"count" integer NOT NULL,
	"logged_by_line_user_id" text,
	"logged_by_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
