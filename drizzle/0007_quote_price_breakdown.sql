ALTER TABLE "quotes" ADD COLUMN "plan_premium" integer;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "discount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "price_overridden" boolean DEFAULT false NOT NULL;