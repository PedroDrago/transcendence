import { and, desc, eq, getTableColumns, lt, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { redis } from '@/cache'
import { db } from '@/database'
import { schemas } from '@/database/schemas'
import { commentSelectSchema } from '@/database/schemas/comments'
import { middlewares } from '@/http/middlewares'
import { getCached } from '@/utils/get-cached'

const EXPIRATION_COMMENTS_LIST = 30

const replies = alias(schemas.comments, 'replies')

export const listPostComments = new Elysia().use(middlewares).get(
  '/posts/:postId/comments',
  async ({ params, query, status }) => {
    const { postId } = params
    const { cursor, limit } = query

    const key = `posts:${postId}:comments`

    if (!cursor) {
      const cached = await getCached(
        key,
        z.array(
          commentSelectSchema.extend({
            likeCount: z.number(),
            replyCount: z.number(),
          })
        )
      )

      if (cached) {
        const hasMore = cached.length > limit
        const items = hasMore ? cached.slice(0, limit) : cached
        const lastItem = items.at(-1)
        const nextCursor = hasMore && lastItem ? lastItem.id : null

        return status(200, { comments: items, nextCursor })
      }
    }

    const comments = await db
      .select({
        ...getTableColumns(schemas.comments),
        likeCount: sql<number>`count(distinct ${schemas.likes.id})::int`,
        replyCount: sql<number>`count(distinct ${replies.id})::int`,
      })
      .from(schemas.comments)
      .leftJoin(schemas.likes, eq(schemas.likes.commentId, schemas.comments.id))
      .leftJoin(replies, eq(replies.replyId, schemas.comments.id))
      .where(
        and(
          eq(schemas.comments.postId, postId),
          cursor ? lt(schemas.comments.id, cursor) : undefined
        )
      )
      .groupBy(schemas.comments.id)
      .orderBy(desc(schemas.comments.id))
      .limit(limit + 1)

    if (!cursor) {
      await redis.set(
        key,
        JSON.stringify(comments),
        'EX',
        EXPIRATION_COMMENTS_LIST
      )
    }

    const hasMore = comments.length > limit
    const items = hasMore ? comments.slice(0, limit) : comments
    const lastItem = items.at(-1)
    const nextCursor = hasMore && lastItem ? lastItem.id : null

    return status(200, { comments: items, nextCursor })
  },
  {
    auth: true,
    detail: {
      tags: ['Comments'],
      summary: 'List post comments',
      description: 'List comments by post Id',
      operationId: 'listPostComments',
    },
    params: z.object({
      postId: z.string(),
    }),
    query: z.object({
      cursor: z.uuidv7().optional(),
      limit: z.coerce.number().min(1).max(100).default(20),
    }),
    response: {
      200: z.object({
        comments: z.array(
          commentSelectSchema.extend({
            likeCount: z.number(),
            replyCount: z.number(),
          })
        ),
        nextCursor: z.uuidv7().nullable(),
      }),
    },
  }
)
