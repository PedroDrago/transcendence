import { Elysia, status } from 'elysia'
import { z } from 'zod'
import { db } from '@/database'
import { schemas } from '@/database/schemas'
import { storyInsertSchema } from '@/database/schemas/stories'
import { middlewares } from '@/http/middlewares'
import { r2 } from '@/storage'

export const createStory = new Elysia().use(middlewares).post(
  '/stories',
  async ({ userId, body }) => {
    const { key } = body

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

    const [story] = await db
      .insert(schemas.stories)
      .values({
        userId,
        mediaKey,
        mediaType,
      })
      .returning()

    return status(201, { ...story })
  },
  {
    auth: true,
    detail: {
      tags: ['Stories'],
      summary: 'Create a story',
      description: 'Create a new story with the provided media',
      operationId: 'createStory',
    },
    body: z.object({
      key: z.string().startsWith('tmp/'),
    }),
    response: {
      201: storyInsertSchema,
      404: z.object({
        error: z.string(),
        message: z.string(),
      }),
    },
  }
)
