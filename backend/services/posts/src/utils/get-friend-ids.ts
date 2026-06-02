import { z } from 'zod'
import { redis } from '@/cache'
import { env } from '@/env'

const friendIdsSchema = z.array(z.string())

const FRIEND_IDS_TTL_SECONDS = 60

async function getCachedFriendIds(userId: string): Promise<string[] | null> {
  const key = `feed:friends:${userId}`

  const raw = await redis.get(key)

  if (!raw) {
    return null
  }

  const { success, data } = friendIdsSchema.safeParse(JSON.parse(raw))

  if (!success) {
    await redis.del(key)

    return null
  }

  return data
}

async function cacheFriendIds(userId: string, ids: string[]): Promise<void> {
  const key = `feed:friends:${userId}`

  await redis.set(
    key,
    JSON.stringify(ids),
    'EX',
    FRIEND_IDS_TTL_SECONDS
  )
}

async function fetchFriendIds(userId: string): Promise<string[]> {
  const response = await fetch(`${env.USER_SERVICE_URL}/users/friends/${userId}/ids`, {
    headers: { 'x-user-id': userId },
  })

  if (!response.ok) return []

  return friendIdsSchema.parse(await response.json())
}

export async function getFriendIds(userId: string): Promise<string[]> {
  const cached = await getCachedFriendIds(userId)

  if (cached) {
    return cached
  }

  try {
    const ids = await fetchFriendIds(userId)
    await cacheFriendIds(userId, ids)
    return ids
  } catch {
    return []
  }
}
