import { sql } from 'drizzle-orm'
import { redis } from '@/cache'
import { db } from '@/database'
import { r2 } from '@/storage'

export async function teardown() {
  await Promise.all([
    db.execute(
      sql`TRUNCATE TABLE posts.posts, posts.stories, posts.comments RESTART IDENTITY CASCADE`
    ),
    redis.send('FLUSHDB', []),
    r2
      .list()
      .then((objects) =>
        Promise.all((objects.contents ?? []).map((obj) => r2.delete(obj.key)))
      ),
  ])
}
