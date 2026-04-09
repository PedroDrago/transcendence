import { eq } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { redis } from '@/cache'
import { db } from '@/database'
import { schemas } from '@/database/schemas'
import { commentSelectSchema } from '@/database/schemas/comments'
import { getCached } from '@/utils/get-cached'

const EXPIRATION = 600

export const getComment = new Elysia().get(
  '/comments/:commentId',
  async ({ params, status }) => {
    const { commentId } = params

    const key = `comments:${commentId}`

    const cached = await getCached(key, commentSelectSchema)

    if (cached) {
      return status(200, { ...cached })
    }

    const [comment] = await db
      .select()
      .from(schemas.comments)
      .where(eq(schemas.comments.id, commentId))
      .limit(1)

    if (!comment) {
      return status(404, {
        error: 'Not found',
        message: 'Comment not found',
      })
    }

    await redis.set(key, JSON.stringify(comment), 'EX', EXPIRATION)

    return status(200, { ...comment })
  },
  {
    auth: true,
    detail: {
      tags: ['Comments'],
      summary: 'Get a comment',
      description: 'Get a comment by its Id',
      operationId: 'getComment',
    },
    params: z.object({
      commentId: z.string(),
    }),
    response: {
      200: commentSelectSchema,
      404: z.object({
        error: z.string(),
        message: z.string(),
      }),
    },
  }
)
