import { eq } from 'drizzle-orm'
import { Elysia, status } from 'elysia'
import { z } from 'zod'
import { redis } from '@/cache'
import { db } from '@/database'
import { schemas } from '@/database/schemas'
import { commentInsertSchema } from '@/database/schemas/comments'
import { middlewares } from '@/http/middlewares'

export const createStoryComment = new Elysia().use(middlewares).post(
  '/stories/:storyId/comments',
  async ({ userId, params, body }) => {
    const { storyId } = params
    const { content } = body

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

    const [comment] = await db
      .insert(schemas.comments)
      .values({
        userId,
        storyId,
        content,
      })
      .returning()

    await redis.del(
      `stories:${storyId}:comments`,
      `stories:${storyId}:comments:count`
    )

    return status(201, { ...comment })
  },
  {
    auth: true,
    detail: {
      tags: ['Comments'],
      summary: 'Create a comment',
      description: 'Create a new comment for the specified story',
      operationId: 'createStoryComment',
    },
    params: z.object({
      storyId: z.uuidv7(),
    }),
    body: z.object({
      content: z.string().min(1).max(2200),
    }),
    response: {
      201: commentInsertSchema,
      404: z.object({
        error: z.string(),
        message: z.string(),
      }),
    },
  }
)
