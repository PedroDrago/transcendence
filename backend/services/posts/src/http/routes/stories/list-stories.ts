import {
  and,
  desc,
  eq,
  getTableColumns,
  gt,
  isNull,
  lt,
  sql,
} from 'drizzle-orm'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { redis } from '@/cache'
import { db } from '@/database'
import { schemas } from '@/database/schemas'
import { storySelectSchema } from '@/database/schemas/stories'
import { middlewares } from '@/http/middlewares'
import { getCached } from '@/utils/get-cached'
import { withSignedUrls } from '@/utils/with-signed-urls'

const EXPIRATION_STORIES_LIST = 30

export const listStories = new Elysia().use(middlewares).get(
  '/users/:userId/stories',
  async ({ params, query, status }) => {
    const { userId } = params
    const { cursor, limit } = query

    const key = `stories:user:${userId}`

    if (!cursor) {
      const cached = await getCached(
        key,
        z.array(
          storySelectSchema.extend({
            mediaUrl: z.string(),
            likeCount: z.number(),
            commentCount: z.number(),
          })
        )
      )

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
      .select({
        ...getTableColumns(schemas.stories),
        likeCount: sql<number>`count(distinct ${schemas.likes.id})::int`,
        commentCount: sql<number>`count(distinct ${schemas.comments.id})::int`,
      })
      .from(schemas.stories)
      .leftJoin(schemas.likes, eq(schemas.likes.storyId, schemas.stories.id))
      .leftJoin(
        schemas.comments,
        and(
          eq(schemas.comments.storyId, schemas.stories.id),
          isNull(schemas.comments.replyId)
        )
      )
      .where(
        and(
          eq(schemas.stories.userId, userId),
          gt(schemas.stories.expiresAt, sql`now()`),
          cursor ? lt(schemas.stories.id, cursor) : undefined
        )
      )
      .groupBy(schemas.stories.id)
      .orderBy(desc(schemas.stories.id))
      .limit(limit + 1)

    if (!cursor) {
      await redis.set(
        key,
        JSON.stringify(stories),
        'EX',
        EXPIRATION_STORIES_LIST
      )
    }

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
            likeCount: z.number(),
            commentCount: z.number(),
          })
        ),
        nextCursor: z.uuidv7().nullable(),
      }),
    },
  }
)
