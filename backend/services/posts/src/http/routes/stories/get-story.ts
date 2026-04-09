import { and, eq, gt, sql } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { redis } from '@/cache'
import { db } from '@/database'
import { schemas } from '@/database/schemas'
import { storySelectSchema } from '@/database/schemas/stories'
import { getCached } from '@/utils/get-cached'
import { getSignedMediaUrl } from '@/utils/get-signed-media-url'

const EXPIRATION = 600

export const getStory = new Elysia().get(
  '/stories/:storyId',
  async ({ params, status }) => {
    const { storyId } = params

    const key = `stories:${storyId}`

    const cached = await getCached(key, storySelectSchema)

    if (cached) {
      if (new Date(cached.expiresAt) <= new Date()) {
        await redis.del(key)

        return status(404, {
          error: 'Not found',
          message: 'Story not found',
        })
      }

      return status(200, {
        ...cached,
        mediaUrl: await getSignedMediaUrl(cached.mediaKey),
      })
    }

    const [story] = await db
      .select()
      .from(schemas.stories)
      .where(
        and(
          eq(schemas.stories.id, storyId),
          gt(schemas.stories.expiresAt, sql`now()`)
        )
      )
      .limit(1)

    if (!story) {
      return status(404, {
        error: 'Not found',
        message: 'Story not found',
      })
    }

    await redis.set(key, JSON.stringify(story), 'EX', EXPIRATION)

    return status(200, {
      ...story,
      mediaUrl: await getSignedMediaUrl(story.mediaKey),
    })
  },
  {
    auth: true,
    detail: {
      tags: ['Stories'],
      summary: 'Get a story',
      description: 'Get a story by its Id',
      operationId: 'getStory',
    },
    params: z.object({
      storyId: z.string(),
    }),
    response: {
      200: storySelectSchema.extend({
        mediaUrl: z.string(),
      }),
      404: z.object({
        error: z.string(),
        message: z.string(),
      }),
    },
  }
)
