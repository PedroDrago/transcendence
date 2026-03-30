import { index, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-zod'
import { uuidv7 } from 'uuidv7'
import { z } from 'zod'
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
