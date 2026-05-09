CREATE SCHEMA "posts";
--> statement-breakpoint
CREATE TYPE "posts"."media_type" AS ENUM('image', 'video');--> statement-breakpoint
CREATE TABLE "posts"."highlight_stories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"highlight_id" uuid NOT NULL,
	"story_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts"."highlights" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"cover_media_key" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts"."posts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"caption" text,
	"media_key" text NOT NULL,
	"media_type" "posts"."media_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts"."stories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"media_key" text NOT NULL,
	"media_type" "posts"."media_type" NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "posts"."highlight_stories" ADD CONSTRAINT "highlight_stories_highlight_id_highlights_id_fk" FOREIGN KEY ("highlight_id") REFERENCES "posts"."highlights"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts"."highlight_stories" ADD CONSTRAINT "highlight_stories_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "posts"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_hl_stories_highlight" ON "posts"."highlight_stories" USING btree ("highlight_id","position");--> statement-breakpoint
CREATE INDEX "idx_hl_stories_story" ON "posts"."highlight_stories" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_highlights_user_position" ON "posts"."highlights" USING btree ("user_id","position");--> statement-breakpoint
CREATE INDEX "idx_posts_user_created" ON "posts"."posts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_stories_user_expires" ON "posts"."stories" USING btree ("user_id","expires_at");