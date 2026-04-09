import { eq } from 'drizzle-orm'
import { Elysia, status } from 'elysia'
import { z } from 'zod'
import { redis } from '@/cache'
import { db } from '@/database'
import { schemas } from '@/database/schemas'
import { likeInsertSchema } from '@/database/schemas/likes'
import { middlewares } from '@/http/middlewares'

export const createPostLike = new Elysia().use(middlewares).post(
  '/posts/:postId/likes',
  async ({ userId, params }) => {
    const { postId } = params

    const [post] = await db
      .select({ id: schemas.posts.id })
      .from(schemas.posts)
      .where(eq(schemas.posts.id, postId))

    if (!post) {
      return status(404, {
        error: 'Not found',
        message: 'Post not found',
      })
    }

    const [like] = await db
      .insert(schemas.likes)
      .values({
        userId,
        postId,
      })
      .onConflictDoNothing()
      .returning()

    if (!like) {
      return status(409, {
        error: 'Conflict',
        message: 'Post already liked',
      })
    }

    await redis.del(`posts:${postId}:likes`)

    return status(201, { ...like })
  },
  {
    auth: true,
    detail: {
      tags: ['Likes'],
      summary: 'Create a like',
      description: 'Create a new like for the specified post',
      operationId: 'createPostLike',
    },
    params: z.object({
      postId: z.uuidv7(),
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
