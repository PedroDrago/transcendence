import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createComment } from '@test/helpers/create-comment'
import { createPost } from '@test/helpers/create-post'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { api } from '@/http/app'

describe('Get comment tests', () => {
  let userId: string

  beforeEach(() => {
    userId = uuidv7()
  })

  afterEach(async () => {
    await teardown()
  })

  it('should be able to get a comment', async () => {
    const { id: postId } = await createPost({ userId })
    const { id: commentId } = await createComment({
      userId,
      postId,
      content: 'Test comment',
    })

    const { status, data, error } = await api.comments({ commentId }).get({
      headers: {
        'x-user-id': userId,
      },
    })

    expect(status).toBe(200)
    expect(error).toBeNull()

    expect(data?.id).toBe(commentId)
    expect(data?.content).toBe('Test comment')
    expect(data?.userId).toBe(userId)
  })

  it('should return the same data on second call (cache hit)', async () => {
    const { id: postId } = await createPost({ userId })
    const { id: commentId } = await createComment({
      userId,
      postId,
      content: 'Cached comment',
    })

    const headers = { 'x-user-id': userId }

    const { data: first } = await api.comments({ commentId }).get({ headers })
    const { data: second } = await api.comments({ commentId }).get({ headers })

    expect(first?.id).toBe(second?.id)
    expect(first?.content).toBe(second?.content)
  })

  it('should return 404 if comment does not exist', async () => {
    const { status } = await api.comments({ commentId: uuidv7() }).get({
      headers: { 'x-user-id': userId },
    })

    expect(status).toBe(404)
  })
})
