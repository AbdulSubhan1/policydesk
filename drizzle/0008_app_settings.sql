CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "app_settings" ("key", "value", "description") VALUES ('demo_mode', 'true', 'Live demo: public demo accounts with visitor limits. Change only here: update app_settings set value = ''false'' where key = ''demo_mode'';') ON CONFLICT ("key") DO NOTHING;
