import { eq } from 'drizzle-orm'
import { Elysia, status } from 'elysia'
import { z } from 'zod'
import { redis } from '@/cache'
import { db } from '@/database'
import { schemas } from '@/database/schemas'
import { commentInsertSchema } from '@/database/schemas/comments'
import { middlewares } from '@/http/middlewares'

export const createReplyComment = new Elysia().use(middlewares).post(
  '/comments/:commentId/replies',
  async ({ userId, params, body }) => {
    const { commentId } = params
    const { content } = body

    const [comment] = await db
      .select({ id: schemas.comments.id, rootId: schemas.comments.rootId })
      .from(schemas.comments)
      .where(eq(schemas.comments.id, commentId))

    if (!comment) {
      return status(404, {
        error: 'Not found',
        message: 'Comment not found',
      })
    }

    const [reply] = await db
      .insert(schemas.comments)
      .values({
        userId,
        content,
        replyId: commentId,
        rootId: comment.rootId ?? commentId,
      })
      .returning()

    await redis.del(`comments:${commentId}:replies`)

    return status(201, { ...reply })
  },
  {
    auth: true,
    detail: {
      tags: ['Comments'],
      summary: 'Create a reply',
      description: 'Create a new reply for the specified comment',
      operationId: 'createReply',
    },
    params: z.object({
      commentId: z.string(),
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
