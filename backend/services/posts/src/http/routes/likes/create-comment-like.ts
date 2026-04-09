import { eq } from 'drizzle-orm'
import { Elysia, status } from 'elysia'
import { z } from 'zod'
import { redis } from '@/cache'
import { db } from '@/database'
import { schemas } from '@/database/schemas'
import { likeInsertSchema } from '@/database/schemas/likes'
import { middlewares } from '@/http/middlewares'

export const createCommentLike = new Elysia().use(middlewares).post(
  '/comments/:commentId/likes',
  async ({ userId, params }) => {
    const { commentId } = params

    const [comment] = await db
      .select({ id: schemas.comments.id })
      .from(schemas.comments)
      .where(eq(schemas.comments.id, commentId))

    if (!comment) {
      return status(404, {
        error: 'Not found',
        message: 'Comment not found',
      })
    }

    const [like] = await db
      .insert(schemas.likes)
      .values({
        userId,
        commentId,
      })
      .onConflictDoNothing()
      .returning()

    if (!like) {
      return status(409, {
        error: 'Conflict',
        message: 'Comment already liked',
      })
    }

    await redis.del(
      `comments:${commentId}:likes`,
      `comments:${commentId}:likes:count`
    )

    return status(201, { ...like })
  },
  {
    auth: true,
    detail: {
      tags: ['Likes'],
      summary: 'Create a like',
      description: 'Create a new like for the specified comment',
      operationId: 'createCommentLike',
    },
    params: z.object({
      commentId: z.uuidv7(),
    }),
    response: {
      201: likeInsertSchema,
      404: z.object({
        error: z.string(),
        message: z.string(),
      }),
      409: z.object({
        error: z.string(),
        message: z.string(),
      }),
    },
  }
)
