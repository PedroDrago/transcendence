import { db } from '@/database'
import { schemas } from '@/database/schemas'

interface CreateCommentOptions {
  content?: string
  postId?: string
  replyId?: string
  rootId?: string
  storyId?: string
  userId: string
}

export async function createComment({
  userId,
  content = 'Test comment',
  postId,
  storyId,
  replyId,
  rootId,
}: CreateCommentOptions) {
  const [comment] = await db
    .insert(schemas.comments)
    .values({ userId, content, postId, storyId, replyId, rootId })
    .returning()

  if (!comment) {
    throw new Error('Failed to create comment')
  }

  return { ...comment }
}
