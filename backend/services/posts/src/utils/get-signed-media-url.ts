import { redis } from '@/cache'
import { r2 } from '@/storage'

const EXPIRATION_SIGNED_URL = 3600

const EXPIRATION_SIGNED_URL_CACHE = 3000

export async function getSignedMediaUrl(key: string) {
  const url = `signed-url:${key}`

  const cached = await redis.get(url)

  if (cached) {
    return cached
  }

  const file = r2.file(key)

  const signedUrl = file.presign({
    expiresIn: EXPIRATION_SIGNED_URL,
  })

  await redis.set(url, signedUrl, 'EX', EXPIRATION_SIGNED_URL_CACHE)

  return signedUrl
}
