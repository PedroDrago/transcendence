import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createTestToken } from '@test/helpers/auth'
import { createComment } from '@test/helpers/create-comment'
import { createPost } from '@test/helpers/create-post'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { api } from '@/http/app'

describe('Get comment tests', () => {
  let token: string
  let userId: string

  beforeEach(async () => {
    userId = uuidv7()
    token = await createTestToken(userId)
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
        authorization: `Bearer ${token}`,
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

    const headers = { authorization: `Bearer ${token}` }

    const { data: first } = await api.comments({ commentId }).get({ headers })
    const { data: second } = await api.comments({ commentId }).get({ headers })

    expect(first?.id).toBe(second?.id)
    expect(first?.content).toBe(second?.content)
  })

  it('should return 404 if comment does not exist', async () => {
    const { status } = await api.comments({ commentId: uuidv7() }).get({
      headers: { authorization: `Bearer ${token}` },
    })

    expect(status).toBe(404)
  })
})
