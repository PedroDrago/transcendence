import { eq, sql } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { redis } from '@/cache'
import { db } from '@/database'
import { schemas } from '@/database/schemas'
import { middlewares } from '@/http/middlewares'
import { getCached } from '@/utils/get-cached'

const EXPIRATION = 600

export const countCommentReplies = new Elysia().use(middlewares).get(
  '/comments/:commentId/replies/count',
  async ({ params, status }) => {
    const { commentId } = params

    const key = `comments:${commentId}:replies:count`

    const cached = await getCached(key, z.object({ count: z.number() }))

    if (cached) {
      return status(200, cached)
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

    const [{ count = 0 } = {}] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schemas.comments)
      .where(eq(schemas.comments.replyId, commentId))

    await redis.set(key, JSON.stringify({ count }), 'EX', EXPIRATION)

    return status(200, { count })
  },
  {
    auth: true,
    detail: {
      tags: ['Comments'],
      summary: 'Count comment replies',
      description: 'Get the total number of replies for the specified comment',
      operationId: 'countCommentReplies',
    },
    params: z.object({
      commentId: z.uuidv7(),
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
