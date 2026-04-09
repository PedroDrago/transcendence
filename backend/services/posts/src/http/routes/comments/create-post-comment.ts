import { eq } from 'drizzle-orm'
import { Elysia, status } from 'elysia'
import { z } from 'zod'
import { redis } from '@/cache'
import { db } from '@/database'
import { schemas } from '@/database/schemas'
import { commentInsertSchema } from '@/database/schemas/comments'
import { middlewares } from '@/http/middlewares'

export const createPostComment = new Elysia().use(middlewares).post(
  '/posts/:postId/comments',
  async ({ userId, params, body }) => {
    const { postId } = params
    const { content } = body

    const [post] = await db
      .select({ id: schemas.posts.id })
      .from(schemas.posts)
      .where(eq(schemas.posts.id, postId))

    if (!post) {
      return status(404, {
        error: 'Not found',
        message: 'Post not found',
      })
    }

    const [comment] = await db
      .insert(schemas.comments)
      .values({
        userId,
        postId,
        content,
      })
      .returning()

    await redis.del(
      `posts:${postId}:comments`,
      `posts:${postId}:comments:count`
    )

    return status(201, { ...comment })
  },
  {
    auth: true,
    detail: {
      tags: ['Comments'],
      summary: 'Create a comment',
      description: 'Create a new comment for the specified post',
      operationId: 'createPostComment',
    },
    params: z.object({
      postId: z.uuidv7(),
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
