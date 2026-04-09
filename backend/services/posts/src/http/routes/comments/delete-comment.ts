import { and, eq } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { redis } from '@/cache'
import { db } from '@/database'
import { schemas } from '@/database/schemas'
import { middlewares } from '@/http/middlewares'
import { getCommentCacheKeys } from '@/utils/cache-keys'

export const deleteComment = new Elysia().use(middlewares).delete(
  '/comments/:commentId',
  async ({ userId, params, status }) => {
    const { commentId } = params

    const [deleted] = await db
      .delete(schemas.comments)
      .where(
        and(
          eq(schemas.comments.userId, userId),
          eq(schemas.comments.id, commentId)
        )
      )
      .returning()

    if (!deleted) {
      return status(404, {
        error: 'Not found',
        message: 'Comment not found',
      })
    }

    const keys = getCommentCacheKeys(deleted)

    await redis.del(...keys)

    return status(204, undefined)
  },
  {
    auth: true,
    detail: {
      tags: ['Comments'],
      summary: 'Delete a comment',
      description: 'Delete a comment by its Id',
      operationId: 'deleteComment',
    },
    params: z.object({
      commentId: z.uuidv7(),
    }),
    response: {
      204: z.unknown(),
      404: z.object({
        error: z.string(),
        message: z.string(),
      }),
    },
  }
)
