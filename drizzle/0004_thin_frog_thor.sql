ALTER TABLE "user_riot_account" ADD COLUMN "puuid" text;--> statement-breakpoint
ALTER TABLE "user_riot_account" ADD COLUMN "linked_via" text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_riot_account" ADD COLUMN "profile_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_riot_account" ADD CONSTRAINT "user_riot_account_puuid_unique" UNIQUE("puuid");