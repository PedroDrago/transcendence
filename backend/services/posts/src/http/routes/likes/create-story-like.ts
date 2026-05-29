import { eq } from 'drizzle-orm'
import { Elysia, status } from 'elysia'
import { z } from 'zod'
import { redis } from '@/cache'
import { db } from '@/database'
import { schemas } from '@/database/schemas'
import { likeInsertSchema } from '@/database/schemas/likes'
import { middlewares } from '@/http/middlewares'

export const createStoryLike = new Elysia().use(middlewares).post(
  '/stories/:storyId/likes',
  async ({ userId, params }) => {
    const { storyId } = params

    const [story] = await db
      .select({ id: schemas.stories.id })
      .from(schemas.stories)
      .where(eq(schemas.stories.id, storyId))

    if (!story) {
      return status(404, {
        error: 'Not found',
        message: 'Story not found',
      })
    }

    const [like] = await db
      .insert(schemas.likes)
      .values({
        userId,
        storyId,
      })
      .onConflictDoNothing()
      .returning()

    if (!like) {
      return status(409, {
        error: 'Conflict',
        message: 'Story already liked',
      })
    }

    await redis.del(
      `stories:${storyId}:likes`,
      `stories:${storyId}:likes:count`
    )

    return status(201, { ...like })
  },
  {
    auth: true,
    detail: {
      tags: ['Likes'],
      summary: 'Create a like',
      description: 'Create a new like for the specified story',
      operationId: 'createStoryLike',
    },
    params: z.object({
      storyId: z.uuidv7(),
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
