CREATE TABLE "player_combat_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"region" text NOT NULL,
	"name" text NOT NULL,
	"tag" text NOT NULL,
	"name_key" text NOT NULL,
	"tag_key" text NOT NULL,
	"sample_size" integer NOT NULL,
	"kdr" double precision NOT NULL,
	"kpr" double precision NOT NULL,
	"acs" integer NOT NULL,
	"hs_percentage" double precision,
	"kast" double precision,
	"first_bloods" integer,
	"first_deaths" integer,
	"matches" integer NOT NULL,
	"rounds" integer NOT NULL,
	"aim_class" text NOT NULL,
	"impact_class" text NOT NULL,
	"contextual_rating" jsonb NOT NULL,
	"coaching_hooks" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "player_combat_snapshots_lookup_idx" ON "player_combat_snapshots" USING btree ("region","name_key","tag_key","created_at");