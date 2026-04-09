import { and, desc, eq, lt } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { redis } from '@/cache'
import { db } from '@/database'
import { schemas } from '@/database/schemas'
import { commentSelectSchema } from '@/database/schemas/comments'
import { middlewares } from '@/http/middlewares'
import { getCached } from '@/utils/get-cached'

const EXPIRATION_COMMENTS_LIST = 30

export const listStoryComments = new Elysia().use(middlewares).get(
  '/stories/:storyId/comments',
  async ({ params, query, status }) => {
    const { storyId } = params
    const { cursor, limit } = query

    const key = `stories:${storyId}:comments`

    if (!cursor) {
      const cached = await getCached(key, z.array(commentSelectSchema))

      if (cached) {
        const hasMore = cached.length > limit
        const items = hasMore ? cached.slice(0, limit) : cached
        const lastItem = items.at(-1)
        const nextCursor = hasMore && lastItem ? lastItem.id : null

        return status(200, {
          comments: items,
          nextCursor,
        })
      }
    }

    const comments = await db
      .select()
      .from(schemas.comments)
      .where(
        and(
          eq(schemas.comments.storyId, storyId),
          cursor ? lt(schemas.comments.id, cursor) : undefined
        )
      )
      .orderBy(desc(schemas.comments.id))
      .limit(limit + 1)

    if (!cursor) {
      await redis.set(
        key,
        JSON.stringify(comments),
        'EX',
        EXPIRATION_COMMENTS_LIST
      )
    }

    const hasMore = comments.length > limit
    const items = hasMore ? comments.slice(0, limit) : comments
    const lastItem = items.at(-1)
    const nextCursor = hasMore && lastItem ? lastItem.id : null

    return status(200, {
      comments: items,
      nextCursor,
    })
  },
  {
    auth: true,
    detail: {
      tags: ['Comments'],
      summary: 'List story comments',
      description: 'List comments by story Id',
      operationId: 'listStoryComments',
    },
    params: z.object({
      storyId: z.string(),
    }),
    query: z.object({
      cursor: z.uuidv7().optional(),
      limit: z.coerce.number().min(1).max(100).default(20),
    }),
    response: {
      200: z.object({
        comments: z.array(commentSelectSchema),
        nextCursor: z.uuidv7().nullable(),
      }),
    },
  }
)
