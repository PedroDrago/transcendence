import { relations } from 'drizzle-orm'
import { index, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-zod'
import { uuidv7 } from 'uuidv7'
import { z } from 'zod'
import { highlightStories } from './highlights-stories'
import { mediaTypeEnum } from './media-types'
import { postsSchema } from './posts-schema'

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000

export const stories = postsSchema.table(
  'stories',
  {
    id: uuid()
      .$defaultFn(() => uuidv7())
      .primaryKey(),
    userId: uuid().notNull(),
    mediaKey: text().notNull(),
    mediaType: mediaTypeEnum().notNull(),
    expiresAt: timestamp({ mode: 'string' })
      .$defaultFn(() => new Date(Date.now() + ONE_DAY_IN_MS).toISOString())
      .notNull(),
    createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_stories_user_expires').on(table.userId, table.expiresAt),
  ]
)

export const storiesRelations = relations(stories, ({ many }) => ({
  highlightStories: many(highlightStories),
}))

export const storySelectSchema = createSelectSchema(stories, {
  expiresAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
})

export const storyInsertSchema = createInsertSchema(stories, {
  expiresAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
})
export const storyUpdateSchema = createUpdateSchema(stories, {
  expiresAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
})
