CREATE TABLE "user_riot_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"region" text NOT NULL,
	"name_key" text NOT NULL,
	"tag_key" text NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_riot_account" ADD CONSTRAINT "user_riot_account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_riot_account_unique_idx" ON "user_riot_account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_riot_account_lookup_idx" ON "user_riot_account" USING btree ("region","name_key","tag_key");