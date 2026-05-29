import { redis } from '@/cache'
import { r2 } from '@/storage'

const EXPIRATION_SIGNED_URL = 3600

const EXPIRATION_SIGNED_URL_CACHE = 3000

export async function withSignedUrls<T extends { mediaKey: string }>(
  posts: readonly T[]
) {
  if (posts.length === 0) {
    return []
  }

  const cacheKeys = posts.map((post) => `signed-url:${post.mediaKey}`)

  const cached = (await redis.send('MGET', cacheKeys)) as (string | null)[]

  const toCache: [key: string, url: string][] = []

  const results = posts.map((post, i) => {
    const hit = cached[i]
    const cacheKey = cacheKeys[i]

    if (hit) {
      return { ...post, mediaUrl: hit }
    }

    const mediaUrl = r2.file(post.mediaKey).presign({
      expiresIn: EXPIRATION_SIGNED_URL,
    })

    if (cacheKey) {
      toCache.push([cacheKey, mediaUrl])
    }

    return { ...post, mediaUrl }
  })

  if (toCache.length > 0) {
    await Promise.all(
      toCache.map(([key, url]) =>
        redis.set(key, url, 'EX', EXPIRATION_SIGNED_URL_CACHE)
      )
    )
  }

  return results
}
