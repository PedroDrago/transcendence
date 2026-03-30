import { relations } from 'drizzle-orm'
import { index, integer, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-zod'
import { uuidv7 } from 'uuidv7'
import { z } from 'zod'
import { highlightStories } from './highlights-stories'
import { postsSchema } from './posts-schema'

export const highlights = postsSchema.table(
  'highlights',
  {
    id: uuid()
      .$defaultFn(() => uuidv7())
      .primaryKey(),
    userId: uuid().notNull(),
    title: text().notNull(),
    coverMediaKey: text(),
    position: integer().default(0).notNull(),
    createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: 'string' })
      .defaultNow()
      .$onUpdate(() => new Date().toISOString())
      .notNull(),
  },
  (table) => [
    index('idx_highlights_user_position').on(table.userId, table.position),
  ]
)

export const highlightsRelations = relations(highlights, ({ many }) => ({
  highlightStories: many(highlightStories),
}))

export const highlightSelectSchema = createSelectSchema(highlights, {
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const highlightInsertSchema = createInsertSchema(highlights, {
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const highlightUpdateSchema = createUpdateSchema(highlights, {
  createdAt: z.string(),
  updatedAt: z.string(),
})
