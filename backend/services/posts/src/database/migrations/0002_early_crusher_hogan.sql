CREATE TABLE "posts"."comments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"root_id" uuid,
	"post_id" uuid,
	"story_id" uuid,
	"reply_id" uuid,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "posts"."comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "posts"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts"."comments" ADD CONSTRAINT "comments_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "posts"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts"."comments" ADD CONSTRAINT "comments_reply_id_fk" FOREIGN KEY ("reply_id") REFERENCES "posts"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_comments_post" ON "posts"."comments" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_comments_story" ON "posts"."comments" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_comments_reply" ON "posts"."comments" USING btree ("reply_id");