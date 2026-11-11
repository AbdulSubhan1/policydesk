ALTER TABLE "opportunities" ADD COLUMN "public_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "details" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "available" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_assigned_at" timestamp;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_public_id_unique" UNIQUE("public_id");--> statement-breakpoint
-- Made-up phones so the live demo's coordinator card has one (new databases get them from the seed)
UPDATE users SET phone = '+923001110001' WHERE email = 'coordinator@policydesk.dev';--> statement-breakpoint
UPDATE users SET phone = '+923001110002' WHERE email = 'advisor@policydesk.dev';--> statement-breakpoint
UPDATE users SET phone = '+923001110003' WHERE email = 'bilal@policydesk.dev';
