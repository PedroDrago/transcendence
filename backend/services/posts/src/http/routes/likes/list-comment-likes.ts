import { and, desc, eq, lt } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { redis } from '@/cache'
import { db } from '@/database'
import { schemas } from '@/database/schemas'
import { likeSelectSchema } from '@/database/schemas/likes'
import { middlewares } from '@/http/middlewares'
import { getCached } from '@/utils/get-cached'

const EXPIRATION = 60

export const listCommentLikes = new Elysia().use(middlewares).get(
  '/comments/:commentId/likes',
  async ({ params, query, status }) => {
    const { commentId } = params
    const { cursor, limit } = query

    const key = `comments:${commentId}:likes`

    if (!cursor) {
      const cached = await getCached(key, z.array(likeSelectSchema))

      if (cached) {
        const hasMore = cached.length > limit
        const items = hasMore ? cached.slice(0, limit) : cached
        const lastItem = items.at(-1)
        const nextCursor = hasMore && lastItem ? lastItem.id : null

        return status(200, { likes: items, nextCursor })
      }
    }

    const [comment] = await db
      .select({ id: schemas.comments.id })
      .from(schemas.comments)
      .where(eq(schemas.comments.id, commentId))
      .limit(1)

    if (!comment) {
      return status(404, {
        error: 'Not found',
        message: 'Comment not found',
      })
    }

    const likes = await db
      .select()
      .from(schemas.likes)
      .where(
        and(
          eq(schemas.likes.commentId, commentId),
          cursor ? lt(schemas.likes.id, cursor) : undefined
        )
      )
      .orderBy(desc(schemas.likes.id))
      .limit(limit + 1)

    if (!cursor) {
      await redis.set(key, JSON.stringify(likes), 'EX', EXPIRATION)
    }

    const hasMore = likes.length > limit
    const items = hasMore ? likes.slice(0, limit) : likes
    const lastItem = items.at(-1)
    const nextCursor = hasMore && lastItem ? lastItem.id : null

    return status(200, { likes: items, nextCursor })
  },
  {
    auth: true,
    detail: {
      tags: ['Likes'],
      summary: 'List comment likes',
      description: 'List likes for the specified comment',
      operationId: 'listCommentLikes',
    },
    params: z.object({
      commentId: z.uuidv7(),
    }),
    query: z.object({
      cursor: z.uuidv7().optional(),
      limit: z.coerce.number().min(1).max(100).default(20),
    }),
    response: {
      200: z.object({
        likes: z.array(likeSelectSchema),
        nextCursor: z.uuidv7().nullable(),
      }),
      404: z.object({
        error: z.string(),
        message: z.string(),
      }),
    },
  }
)
