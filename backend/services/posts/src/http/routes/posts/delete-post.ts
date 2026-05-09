import { and, eq } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { redis } from '@/cache'
import { db } from '@/database'
import { schemas } from '@/database/schemas'
import { middlewares } from '@/http/middlewares'
import { r2 } from '@/storage'

export const deletePost = new Elysia().use(middlewares).delete(
  '/posts/:postId',
  async ({ userId, params, status }) => {
    const { postId } = params

    const [deleted] = await db
      .delete(schemas.posts)
      .where(
        and(eq(schemas.posts.userId, userId), eq(schemas.posts.id, postId))
      )
      .returning()

    if (!deleted) {
      return status(404, {
        error: 'Not found',
        message: 'Post not found',
      })
    }

    const postsKey = `posts:${postId}`

    const userPostsKey = `posts:user:${userId}`

    const signedUrlKey = `signed-url:${deleted.mediaKey}`

    await Promise.all([
      r2.delete(deleted.mediaKey),
      redis.del(signedUrlKey),
      redis.del(postsKey),
      redis.del(userPostsKey),
    ])

    return status(204, undefined)
  },
  {
    auth: true,
    detail: {
      tags: ['Posts'],
      summary: 'Delete a post',
      description: 'Delete a post by its Id',
      operationId: 'deletePost',
    },
    params: z.object({
      postId: z.uuidv7(),
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
