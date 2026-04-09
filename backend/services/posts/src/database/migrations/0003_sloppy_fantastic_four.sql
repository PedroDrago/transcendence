CREATE TABLE "posts"."likes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"post_id" uuid,
	"story_id" uuid,
	"comment_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "posts"."likes" ADD CONSTRAINT "likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "posts"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts"."likes" ADD CONSTRAINT "likes_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "posts"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts"."likes" ADD CONSTRAINT "likes_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "posts"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_likes_post" ON "posts"."likes" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_likes_story" ON "posts"."likes" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_likes_comment" ON "posts"."likes" USING btree ("comment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_likes_user_post" ON "posts"."likes" USING btree ("user_id","post_id") WHERE "posts"."likes"."post_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_likes_user_story" ON "posts"."likes" USING btree ("user_id","story_id") WHERE "posts"."likes"."story_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_likes_user_comment" ON "posts"."likes" USING btree ("user_id","comment_id") WHERE "posts"."likes"."comment_id" is not null;--> statement-breakpoint
ALTER TABLE "posts"."comments" ADD CONSTRAINT "comments_root_id_fk" FOREIGN KEY ("root_id") REFERENCES "posts"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_comments_root" ON "posts"."comments" USING btree ("root_id");