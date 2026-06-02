import {
  and,
  desc,
  eq,
  getTableColumns,
  inArray,
  isNull,
  lt,
  sql,
} from 'drizzle-orm'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { redis } from '@/cache'
import { db } from '@/database'
import { schemas } from '@/database/schemas'
import { postSelectSchema } from '@/database/schemas/posts'
import { middlewares } from '@/http/middlewares'
import { getCached } from '@/utils/get-cached'
import { getFriendIds } from '@/utils/get-friend-ids'
import { withSignedUrls } from '@/utils/with-signed-urls'

const EXPIRATION_FEED = 15

export const listFeed = new Elysia().use(middlewares).get(
  '/posts/feed',
  async ({ userId, query, status }) => {
    const { cursor, limit } = query

    const key = `feed:${userId}`

    if (!cursor) {
      const cached = await getCached(
        key,
        z.array(
          postSelectSchema.extend({
            mediaUrl: z.string(),
            likeCount: z.number(),
            commentCount: z.number(),
          })
        )
      )

      if (cached) {
        const hasMore = cached.length > limit
        const items = hasMore ? cached.slice(0, limit) : cached
        const lastItem = items.at(-1)
        const nextCursor = hasMore && lastItem ? lastItem.id : null

        return status(200, {
          posts: await withSignedUrls(items),
          nextCursor,
        })
      }
    }

    const friendIds = await getFriendIds(userId)
    const authorIds = [userId, ...friendIds]

    const posts = await db
      .select({
        ...getTableColumns(schemas.posts),
        likeCount: sql<number>`count(distinct ${schemas.likes.id})::int`,
        commentCount: sql<number>`count(distinct ${schemas.comments.id})::int`,
      })
      .from(schemas.posts)
      .leftJoin(schemas.likes, eq(schemas.likes.postId, schemas.posts.id))
      .leftJoin(
        schemas.comments,
        and(
          eq(schemas.comments.postId, schemas.posts.id),
          isNull(schemas.comments.replyId)
        )
      )
      .where(
        and(
          inArray(schemas.posts.userId, authorIds),
          cursor ? lt(schemas.posts.id, cursor) : undefined
        )
      )
      .groupBy(schemas.posts.id)
      .orderBy(desc(schemas.posts.id))
      .limit(limit + 1)

    if (!cursor) {
      await redis.set(key, JSON.stringify(posts), 'EX', EXPIRATION_FEED)
    }

    const hasMore = posts.length > limit
    const items = hasMore ? posts.slice(0, limit) : posts
    const lastItem = items.at(-1)
    const nextCursor = hasMore && lastItem ? lastItem.id : null

    return status(200, {
      posts: await withSignedUrls(items),
      nextCursor,
    })
  },
  {
    auth: true,
    detail: {
      tags: ['Posts'],
      summary: 'Get feed',
      description:
        "Get the authenticated user's feed with posts from friends and themselves",
      operationId: 'listFeed',
    },
    query: z.object({
      cursor: z.uuidv7().optional(),
      limit: z.coerce.number().min(1).max(100).default(20),
    }),
    response: {
      200: z.object({
        posts: z.array(
          postSelectSchema.extend({
            mediaUrl: z.string(),
            likeCount: z.number(),
            commentCount: z.number(),
          })
        ),
        nextCursor: z.uuidv7().nullable(),
      }),
    },
  }
)
