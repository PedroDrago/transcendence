import { isNotNull, relations } from 'drizzle-orm'
import { index, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-zod'
import { uuidv7 } from 'uuidv7'
import { z } from 'zod'
import { comments } from './comments'
import { posts } from './posts'
import { postsSchema } from './posts-schema'
import { stories } from './stories'

export const likes = postsSchema.table(
  'likes',
  {
    id: uuid()
      .$defaultFn(() => uuidv7())
      .primaryKey(),
    userId: uuid().notNull(),
    postId: uuid().references(() => posts.id, { onDelete: 'cascade' }),
    storyId: uuid().references(() => stories.id, { onDelete: 'cascade' }),
    commentId: uuid().references(() => comments.id, { onDelete: 'cascade' }),
    createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_likes_post').on(table.postId),
    index('idx_likes_story').on(table.storyId),
    index('idx_likes_comment').on(table.commentId),
    uniqueIndex('uq_likes_user_post')
      .on(table.userId, table.postId)
      .where(isNotNull(table.postId)),
    uniqueIndex('uq_likes_user_story')
      .on(table.userId, table.storyId)
      .where(isNotNull(table.storyId)),
    uniqueIndex('uq_likes_user_comment')
      .on(table.userId, table.commentId)
      .where(isNotNull(table.commentId)),
  ]
)

export const likesRelations = relations(likes, ({ one }) => ({
  post: one(posts, {
    fields: [likes.postId],
    references: [posts.id],
  }),
  story: one(stories, {
    fields: [likes.storyId],
    references: [stories.id],
  }),
  comment: one(comments, {
    fields: [likes.commentId],
    references: [comments.id],
  }),
}))

export const likeSelectSchema = createSelectSchema(likes, {
  createdAt: z.string(),
})

export const likeInsertSchema = createInsertSchema(likes, {
  createdAt: z.string(),
})

export const likeUpdateSchema = createUpdateSchema(likes, {
  createdAt: z.string(),
})
