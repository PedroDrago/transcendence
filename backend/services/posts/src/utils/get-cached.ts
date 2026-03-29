import type { z } from 'zod'
import { redis } from '@/cache'

export async function getCached<T>(key: string, schema: z.ZodType<T>) {
  const raw = await redis.get(key)

  if (!raw) {
    return null
  }

  const { error, data } = schema.safeParse(JSON.parse(raw))

  if (error) {
    await redis.del(key)

    return null
  }

  return data
}
