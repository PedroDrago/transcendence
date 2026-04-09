import type { schemas } from '@/database/schemas'

type Comment = typeof schemas.comments.$inferSelect
type TargetColumn = Extract<keyof Comment, 'postId' | 'storyId' | 'replyId'>

const CACHE_TARGET_MAP: Record<TargetColumn, (id: string) => string> = {
  postId: (id) => `posts:${id}:comments`,
  storyId: (id) => `stories:${id}:comments`,
  replyId: (id) => `comments:${id}:replies`,
}

export function getCommentCacheKeys(comment: Partial<Comment>): string[] {
  const keys = [`comments:${comment.id}`]

  for (const [column, keyBuilder] of Object.entries(CACHE_TARGET_MAP)) {
    const targetId = comment[column as TargetColumn]

    if (targetId) {
      keys.push(keyBuilder(targetId))
      break
    }
  }

  return keys
}
