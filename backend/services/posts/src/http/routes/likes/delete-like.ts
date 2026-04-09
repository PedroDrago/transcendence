import { and, eq } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { redis } from '@/cache'
import { db } from '@/database'
import { schemas } from '@/database/schemas'
import { middlewares } from '@/http/middlewares'

export const deleteLike = new Elysia().use(middlewares).delete(
  '/likes/:likeId',
  async ({ userId, params, status }) => {
    const { likeId } = params

    const [deleted] = await db
      .delete(schemas.likes)
      .where(
        and(eq(schemas.likes.userId, userId), eq(schemas.likes.id, likeId))
      )
      .returning()

    if (!deleted) {
      return status(404, {
        error: 'Not found',
        message: 'Like not found',
      })
    }

    if (deleted.postId) {
      await redis.del(
        `posts:${deleted.postId}:likes`,
        `posts:${deleted.postId}:likes:count`
      )
    } else if (deleted.storyId) {
      await redis.del(
        `stories:${deleted.storyId}:likes`,
        `stories:${deleted.storyId}:likes:count`
      )
    } else if (deleted.commentId) {
      await redis.del(
        `comments:${deleted.commentId}:likes`,
        `comments:${deleted.commentId}:likes:count`
      )
    }

    return status(204, undefined)
  },
  {
    auth: true,
    detail: {
      tags: ['Likes'],
      summary: 'Delete a like',
      description: 'Delete a like by its Id',
      operationId: 'deleteLike',
    },
    params: z.object({
      likeId: z.uuidv7(),
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
