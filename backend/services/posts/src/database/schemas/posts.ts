import { relations } from 'drizzle-orm'
import { index, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-zod'
import { uuidv7 } from 'uuidv7'
import { z } from 'zod'
import { comments } from './comments'
import { likes } from './likes'
import { mediaTypeEnum } from './media-types'
import { postsSchema } from './posts-schema'

export const posts = postsSchema.table(
  'posts',
  {
    id: uuid()
      .$defaultFn(() => uuidv7())
      .primaryKey(),
    userId: uuid().notNull(),
    caption: text(),
    mediaKey: text().notNull(),
    mediaType: mediaTypeEnum().notNull(),
    createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: 'string' })
      .defaultNow()
      .$onUpdate(() => new Date().toISOString())
      .notNull(),
  },
  (table) => [index('idx_posts_user_created').on(table.userId, table.createdAt)]
)

export const postsRelations = relations(posts, ({ many }) => ({
  comments: many(comments),
  likes: many(likes),
}))

export const postSelectSchema = createSelectSchema(posts, {
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const postInsertSchema = createInsertSchema(posts, {
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const postUpdateSchema = createUpdateSchema(posts, {
  createdAt: z.string(),
  updatedAt: z.string(),
})
