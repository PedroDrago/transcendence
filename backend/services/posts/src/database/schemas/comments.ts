import { relations } from 'drizzle-orm'
import { foreignKey, index, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-zod'
import { uuidv7 } from 'uuidv7'
import { z } from 'zod'
import { posts } from './posts'
import { postsSchema } from './posts-schema'
import { stories } from './stories'

export const comments = postsSchema.table(
  'comments',
  {
    id: uuid()
      .$defaultFn(() => uuidv7())
      .primaryKey(),
    userId: uuid().notNull(),
    rootId: uuid(),
    postId: uuid().references(() => posts.id, { onDelete: 'cascade' }),
    storyId: uuid().references(() => stories.id, { onDelete: 'cascade' }),
    replyId: uuid(),
    content: text().notNull(),
    createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: 'string' })
      .defaultNow()
      .$onUpdate(() => new Date().toISOString())
      .notNull(),
  },
  (table) => [
    index('idx_comments_post').on(table.postId),
    index('idx_comments_story').on(table.storyId),
    index('idx_comments_reply').on(table.replyId),

    foreignKey({
      columns: [table.replyId],
      foreignColumns: [table.id],
      name: 'comments_reply_id_fk',
    }).onDelete('cascade'),
  ]
)

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  story: one(stories, {
    fields: [comments.storyId],
    references: [stories.id],
  }),
  reply: one(comments, {
    fields: [comments.replyId],
    references: [comments.id],
  }),
}))

export const commentSelectSchema = createSelectSchema(comments, {
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const commentInsertSchema = createInsertSchema(comments, {
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const commentUpdateSchema = createUpdateSchema(comments, {
  createdAt: z.string(),
  updatedAt: z.string(),
})
