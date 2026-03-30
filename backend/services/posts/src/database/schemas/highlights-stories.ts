import { relations } from 'drizzle-orm'
import { index, integer, timestamp, uuid } from 'drizzle-orm/pg-core'
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-zod'
import { uuidv7 } from 'uuidv7'
import { z } from 'zod'
import { highlights } from './highlights'
import { postsSchema } from './posts-schema'
import { stories } from './stories'

export const highlightStories = postsSchema.table(
  'highlight_stories',
  {
    id: uuid()
      .$defaultFn(() => uuidv7())
      .primaryKey(),
    highlightId: uuid()
      .notNull()
      .references(() => highlights.id, { onDelete: 'cascade' }),
    storyId: uuid()
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    position: integer().default(0).notNull(),
    createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_hl_stories_highlight').on(table.highlightId, table.position),
    index('idx_hl_stories_story').on(table.storyId),
  ]
)

export const highlightStoriesRelations = relations(
  highlightStories,
  ({ one }) => ({
    highlight: one(highlights, {
      fields: [highlightStories.highlightId],
      references: [highlights.id],
    }),
    story: one(stories, {
      fields: [highlightStories.storyId],
      references: [stories.id],
    }),
  })
)

export const highlightStorySelectSchema = createSelectSchema(highlightStories, {
  createdAt: z.string(),
})

export const highlightStoryInsertSchema = createInsertSchema(highlightStories, {
  createdAt: z.string(),
})

export const highlightStoryUpdateSchema = createUpdateSchema(highlightStories, {
  createdAt: z.string(),
})
