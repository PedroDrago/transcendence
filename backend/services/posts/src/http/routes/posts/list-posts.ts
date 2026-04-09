import { and, desc, eq, lt } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { redis } from '@/cache'
import { db } from '@/database'
import { schemas } from '@/database/schemas'
import { postSelectSchema } from '@/database/schemas/posts'
import { middlewares } from '@/http/middlewares'
import { getCached } from '@/utils/get-cached'
import { withSignedUrls } from '@/utils/with-signed-urls'

const EXPIRATION_POSTS_LIST = 30

export const listPosts = new Elysia().use(middlewares).get(
  '/users/:userId/posts',
  async ({ params, query, status }) => {
    const { userId } = params
    const { cursor, limit } = query

    const key = `posts:user:${userId}`

    if (!cursor) {
      const cached = await getCached(key, z.array(postSelectSchema))

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

    const posts = await db
      .select()
      .from(schemas.posts)
      .where(
        and(
          eq(schemas.posts.userId, userId),
          cursor ? lt(schemas.posts.id, cursor) : undefined
        )
      )
      .orderBy(desc(schemas.posts.id))
      .limit(limit + 1)

    if (!cursor) {
      await redis.set(key, JSON.stringify(posts), 'EX', EXPIRATION_POSTS_LIST)
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
      summary: 'List posts',
      description: 'List posts by user Id',
      operationId: 'listPosts',
    },
    params: z.object({
      userId: z.string(),
    }),
    query: z.object({
      cursor: z.uuidv7().optional(),
      limit: z.coerce.number().min(1).max(100).default(20),
    }),
    response: {
      200: z.object({
        posts: z.array(
          postSelectSchema.extend({
            mediaUrl: z.string(),
          })
        ),
        nextCursor: z.uuidv7().nullable(),
      }),
    },
  }
)
