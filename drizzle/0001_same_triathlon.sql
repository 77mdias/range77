CREATE TABLE "match_cache" (
	"match_id" text PRIMARY KEY NOT NULL,
	"region" text NOT NULL,
	"payload" jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "match_cache_expires_at_idx" ON "match_cache" USING btree ("expires_at");