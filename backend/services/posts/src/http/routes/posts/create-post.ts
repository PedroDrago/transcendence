import { Elysia, status } from 'elysia'
import { z } from 'zod'
import { db } from '@/database'
import { schemas } from '@/database/schemas'
import { postInsertSchema } from '@/database/schemas/posts'
import { middlewares } from '@/http/middlewares'
import { r2 } from '@/storage'

export const createPost = new Elysia().use(middlewares).post(
  '/posts',
  async ({ userId, body }) => {
    const { key, caption } = body

    const exists = await r2.exists(key)

    if (!exists) {
      return status(404, {
        error: 'Media not found',
        message: 'The media file could not be found on the server.',
      })
    }

    const mediaKey = key.replace('tmp/', '')

    const ext = key.split('.').pop()

    const mediaType = ext === 'mp4' ? 'video' : 'image'

    const file = r2.file(key)

    await r2.write(mediaKey, file)

    await r2.delete(key)

    const [post] = await db
      .insert(schemas.posts)
      .values({
        userId,
        caption,
        mediaKey,
        mediaType,
      })
      .returning()

    return status(201, { ...post })
  },
  {
    auth: true,
    detail: {
      tags: ['Posts'],
      summary: 'Create a post',
      description: 'Create a new post with the provided media and caption',
      operationId: 'createPost',
    },
    body: z.object({
      key: z.string().startsWith('tmp/'),
      caption: z.string().optional(),
    }),
    response: {
      201: postInsertSchema,
      404: z.object({
        error: z.string(),
        message: z.string(),
      }),
    },
  }
)
