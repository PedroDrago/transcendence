import { and, eq } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { redis } from '@/cache'
import { db } from '@/database'
import { schemas } from '@/database/schemas'
import { postUpdateSchema } from '@/database/schemas/posts'
import { middlewares } from '@/http/middlewares'
import { getSignedMediaUrl } from '@/utils/get-signed-media-url'

export const updatePost = new Elysia().use(middlewares).patch(
  '/posts/:postId',
  async ({ userId, params, body, status }) => {
    const { postId } = params
    const { caption } = body

    const [updated] = await db
      .update(schemas.posts)
      .set({ caption })
      .where(
        and(eq(schemas.posts.userId, userId), eq(schemas.posts.id, postId))
      )
      .returning()

    if (!updated) {
      return status(404, {
        error: 'Not found',
        message: 'Post not found',
      })
    }

    const postsKey = `posts:${postId}`

    const userPostsKey = `posts:user:${userId}`

    await Promise.all([redis.del(postsKey), redis.del(userPostsKey)])

    return status(200, {
      ...updated,
      mediaUrl: await getSignedMediaUrl(updated.mediaKey),
    })
  },
  {
    auth: true,
    detail: {
      tags: ['Posts'],
      summary: 'Update a post',
      description: 'Update a post by its Id',
      operationId: 'updatePost',
    },
    params: z.object({
      postId: z.string(),
    }),
    body: z.object({
      caption: z.string(),
    }),
    response: {
      200: postUpdateSchema.extend({
        mediaUrl: z.string(),
      }),
      404: z.object({
        error: z.string(),
        message: z.string(),
      }),
    },
  }
)
