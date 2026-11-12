CREATE TABLE "payment_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"lead_id" integer NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"opened_at" timestamp,
	"revoked_at" timestamp,
	CONSTRAINT "payment_links_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "online" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_links" ADD CONSTRAINT "payment_links_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_links" ADD CONSTRAINT "payment_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Until now only the website made quotes without a user, so those are the online choices
UPDATE "quotes" SET "online" = true WHERE "created_by" IS NULL;