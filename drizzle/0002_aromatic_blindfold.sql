CREATE TABLE "plan_add_ons" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"key" text NOT NULL,
	"name" jsonb NOT NULL,
	"kind" text NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "plan_add_ons_plan_id_key_unique" UNIQUE("plan_id","key")
);
--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "add_ons" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "plan_add_ons" ADD CONSTRAINT "plan_add_ons_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;