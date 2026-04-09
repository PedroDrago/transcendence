import { db } from '@/database'
import { schemas } from '@/database/schemas'

interface CreateLikeOptions {
  commentId?: string
  postId?: string
  storyId?: string
  userId: string
}

export async function createLike({
  userId,
  postId,
  storyId,
  commentId,
}: CreateLikeOptions) {
  const [like] = await db
    .insert(schemas.likes)
    .values({ userId, postId, storyId, commentId })
    .returning()

  if (!like) {
    throw new Error('Failed to create like')
  }

  return { ...like }
}
