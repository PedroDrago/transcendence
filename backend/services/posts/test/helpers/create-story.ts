import { uuidv7 } from 'uuidv7'
import { db } from '@/database'
import { schemas } from '@/database/schemas'

interface CreateStoryOptions {
  mediaKey?: string
  mediaType?: 'image' | 'video'
  userId: string
}

export async function createStory({
  userId,
  mediaKey = `stories/${userId}/${uuidv7()}.jpeg`,
  mediaType = 'image',
}: CreateStoryOptions) {
  const [story] = await db
    .insert(schemas.stories)
    .values({ userId, mediaKey, mediaType })
    .returning()

  if (!story) {
    throw new Error('Failed to create story')
  }

  return { ...story }
}
