import { eq } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { redis } from '@/cache'
import { db } from '@/database'
import { schemas } from '@/database/schemas'
import { postSelectSchema } from '@/database/schemas/posts'
import { getCached } from '@/utils/get-cached'
import { getSignedMediaUrl } from '@/utils/get-signed-media-url'

const EXPIRATION = 600

export const getPost = new Elysia().get(
  '/post/:id',
  async ({ params, status }) => {
    const { id } = params

    const key = `posts:${id}`

    const cached = await getCached(key, postSelectSchema)

    if (cached) {
      return status(200, {
        ...cached,
        mediaUrl: await getSignedMediaUrl(cached.mediaKey),
      })
    }

    const [post] = await db
      .select()
      .from(schemas.posts)
      .where(eq(schemas.posts.id, id))
      .limit(1)

    if (!post) {
      return status(404, {
        error: 'Not found',
        message: 'Post not found',
      })
    }

    await redis.set(key, JSON.stringify(post), 'EX', EXPIRATION)

    return status(200, {
      ...post,
      mediaUrl: await getSignedMediaUrl(post.mediaKey),
    })
  },
  {
    auth: true,
    detail: {
      tags: ['Posts'],
      summary: 'Get a post',
      description: 'Get a post by its Id',
      operationId: 'getPost',
    },
    params: z.object({
      id: z.string(),
    }),
    response: {
      200: postSelectSchema.extend({
        mediaUrl: z.string(),
      }),
      404: z.object({
        error: z.string(),
        message: z.string(),
      }),
    },
  }
)
