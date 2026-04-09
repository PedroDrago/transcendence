import { and, eq } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { redis } from '@/cache'
import { db } from '@/database'
import { schemas } from '@/database/schemas'
import { commentUpdateSchema } from '@/database/schemas/comments'
import { middlewares } from '@/http/middlewares'
import { getCommentCacheKeys } from '@/utils/cache-keys'

export const updateComment = new Elysia().use(middlewares).patch(
  '/comments/:commentId',
  async ({ userId, params, body, status }) => {
    const { commentId } = params
    const { content } = body

    const [updated] = await db
      .update(schemas.comments)
      .set({ content })
      .where(
        and(
          eq(schemas.comments.userId, userId),
          eq(schemas.comments.id, commentId)
        )
      )
      .returning()

    if (!updated) {
      return status(404, {
        error: 'Not found',
        message: 'Comment not found',
      })
    }

    const keys = getCommentCacheKeys(updated)

    await redis.del(...keys)

    return status(200, { ...updated })
  },
  {
    auth: true,
    detail: {
      tags: ['Comments'],
      summary: 'Update a comment',
      description: 'Update a comment by its Id',
      operationId: 'updateComment',
    },
    params: z.object({
      commentId: z.string(),
    }),
    body: z.object({
      content: z.string().min(1).max(2200),
    }),
    response: {
      200: commentUpdateSchema,
      404: z.object({
        error: z.string(),
        message: z.string(),
      }),
    },
  }
)
