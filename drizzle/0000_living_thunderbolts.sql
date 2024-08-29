CREATE TABLE IF NOT EXISTS "measure" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_code" text,
	"measure_datetime" text,
	"measure_type" text,
	"measure_value" integer,
	"has_confirmed" boolean DEFAULT false,
	"image_url" text
);
