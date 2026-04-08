import { and, desc, eq, gt, lt, sql } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { db } from '@/database'
import { schemas } from '@/database/schemas'
import { storySelectSchema } from '@/database/schemas/stories'
import { middlewares } from '@/http/middlewares'
import { getCached } from '@/utils/get-cached'
import { withSignedUrls } from '@/utils/with-signed-urls'

export const listStories = new Elysia().use(middlewares).get(
  '/users/:userId/stories',
  async ({ params, query, status }) => {
    const { userId } = params
    const { cursor, limit } = query

    if (!cursor) {
      const key = `stories:user:${userId}`

      const cached = await getCached(key, z.array(storySelectSchema))

      if (cached) {
        const active = cached.filter((s) => new Date(s.expiresAt) > new Date())
        const hasMore = active.length > limit
        const items = hasMore ? active.slice(0, limit) : active
        const lastItem = items.at(-1)
        const nextCursor = hasMore && lastItem ? lastItem.id : null

        return status(200, {
          stories: await withSignedUrls(items),
          nextCursor,
        })
      }
    }

    const stories = await db
      .select()
      .from(schemas.stories)
      .where(
        and(
          eq(schemas.stories.userId, userId),
          gt(schemas.stories.expiresAt, sql`now()`),
          cursor ? lt(schemas.stories.id, cursor) : undefined
        )
      )
      .orderBy(desc(schemas.stories.id))
      .limit(limit + 1)

    const hasMore = stories.length > limit
    const items = hasMore ? stories.slice(0, limit) : stories
    const lastItem = items.at(-1)
    const nextCursor = hasMore && lastItem ? lastItem.id : null

    return status(200, {
      stories: await withSignedUrls(items),
      nextCursor,
    })
  },
  {
    auth: true,
    detail: {
      tags: ['Stories'],
      summary: 'List stories',
      description: 'List active stories by user Id',
      operationId: 'listStories',
    },
    params: z.object({
      userId: z.string(),
    }),
    query: z.object({
      cursor: z.uuidv7().optional(),
      limit: z.coerce.number().min(1).max(100).default(20),
    }),
    response: {
      200: z.object({
        stories: z.array(
          storySelectSchema.extend({
            mediaUrl: z.string(),
          })
        ),
        nextCursor: z.uuidv7().nullable(),
      }),
    },
  }
)
