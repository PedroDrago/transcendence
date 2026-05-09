import { uuidv7 } from 'uuidv7'
import { db } from '@/database'
import { schemas } from '@/database/schemas'

interface CreatePostOptions {
  caption?: string
  mediaKey?: string
  mediaType?: 'image' | 'video'
  userId: string
}

export async function createPost({
  userId,
  caption,
  mediaKey = `post/${userId}/${uuidv7()}.jpeg`,
  mediaType = 'image',
}: CreatePostOptions) {
  const [post] = await db
    .insert(schemas.posts)
    .values({ userId, caption, mediaKey, mediaType })
    .returning()

  if (!post) {
    throw new Error('Failed to create post')
  }

  return { ...post }
}
