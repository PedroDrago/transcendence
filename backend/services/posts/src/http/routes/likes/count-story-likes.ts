import { eq, sql } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { redis } from '@/cache'
import { db } from '@/database'
import { schemas } from '@/database/schemas'
import { middlewares } from '@/http/middlewares'
import { getCached } from '@/utils/get-cached'

const EXPIRATION = 600

export const countStoryLikes = new Elysia().use(middlewares).get(
  '/stories/:storyId/likes/count',
  async ({ params, status }) => {
    const { storyId } = params

    const key = `stories:${storyId}:likes:count`

    const cached = await getCached(key, z.object({ count: z.number() }))

    if (cached) {
      return status(200, cached)
    }

    const [story] = await db
      .select({ id: schemas.stories.id })
      .from(schemas.stories)
      .where(eq(schemas.stories.id, storyId))
      .limit(1)

    if (!story) {
      return status(404, {
        error: 'Not found',
        message: 'Story not found',
      })
    }

    const [{ count = 0 } = {}] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schemas.likes)
      .where(eq(schemas.likes.storyId, storyId))

    await redis.set(key, JSON.stringify({ count }), 'EX', EXPIRATION)

    return status(200, { count })
  },
  {
    auth: true,
    detail: {
      tags: ['Likes'],
      summary: 'Count story likes',
      description: 'Get the total number of likes for the specified story',
      operationId: 'countStoryLikes',
    },
    params: z.object({
      storyId: z.uuidv7(),
    }),
    response: {
      200: z.object({ count: z.number() }),
      404: z.object({
        error: z.string(),
        message: z.string(),
      }),
    },
  }
)
