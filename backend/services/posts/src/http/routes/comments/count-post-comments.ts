import { and, eq, isNull, sql } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { redis } from '@/cache'
import { db } from '@/database'
import { schemas } from '@/database/schemas'
import { middlewares } from '@/http/middlewares'
import { getCached } from '@/utils/get-cached'

const EXPIRATION = 600

export const countPostComments = new Elysia().use(middlewares).get(
  '/posts/:postId/comments/count',
  async ({ params, status }) => {
    const { postId } = params

    const key = `posts:${postId}:comments:count`

    const cached = await getCached(key, z.object({ count: z.number() }))

    if (cached) {
      return status(200, cached)
    }

    const [post] = await db
      .select({ id: schemas.posts.id })
      .from(schemas.posts)
      .where(eq(schemas.posts.id, postId))
      .limit(1)

    if (!post) {
      return status(404, {
        error: 'Not found',
        message: 'Post not found',
      })
    }

    const [{ count = 0 } = {}] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schemas.comments)
      .where(
        and(
          eq(schemas.comments.postId, postId),
          isNull(schemas.comments.replyId)
        )
      )

    await redis.set(key, JSON.stringify({ count }), 'EX', EXPIRATION)

    return status(200, { count })
  },
  {
    auth: true,
    detail: {
      tags: ['Comments'],
      summary: 'Count post comments',
      description:
        'Get the total number of top-level comments for the specified post',
      operationId: 'countPostComments',
    },
    params: z.object({
      postId: z.uuidv7(),
    }),
    response: {
      200: z.object({ count: z.number() }),
      404: z.object({
        error: z.string(),
        message: z.string(),
      }),
    },
  }
)
