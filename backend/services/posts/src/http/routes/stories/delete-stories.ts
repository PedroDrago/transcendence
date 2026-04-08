import { and, eq } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { redis } from '@/cache'
import { db } from '@/database'
import { schemas } from '@/database/schemas'
import { middlewares } from '@/http/middlewares'
import { r2 } from '@/storage'

export const deleteStory = new Elysia().use(middlewares).delete(
  '/stories/:id',
  async ({ userId, params, status }) => {
    const { id } = params

    const [deleted] = await db
      .delete(schemas.stories)
      .where(
        and(eq(schemas.stories.userId, userId), eq(schemas.stories.id, id))
      )
      .returning()

    if (!deleted) {
      return status(404, {
        error: 'Not found',
        message: 'Story not found',
      })
    }

    const storiesKey = `stories:${id}`

    const userStoriesKey = `stories:user:${userId}`

    const signedUrlKey = `signed-url:${deleted.mediaKey}`

    await Promise.all([
      r2.delete(deleted.mediaKey),
      redis.del(signedUrlKey),
      redis.del(storiesKey),
      redis.del(userStoriesKey),
    ])

    return status(204, undefined)
  },
  {
    auth: true,
    detail: {
      tags: ['Stories'],
      summary: 'Delete a story',
      description: 'Delete a story by its Id',
      operationId: 'deleteStory',
    },
    params: z.object({
      id: z.string(),
    }),
    response: {
      204: z.undefined(),
      404: z.object({
        error: z.string(),
        message: z.string(),
      }),
    },
  }
)
