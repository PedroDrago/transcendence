import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createTestToken } from '@test/helpers/auth'
import { createComment } from '@test/helpers/create-comment'
import { createPost } from '@test/helpers/create-post'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { api } from '@/http/app'

describe('Count post comments tests', () => {
  let token: string
  let userId: string

  beforeEach(async () => {
    userId = uuidv7()
    token = await createTestToken(userId)
  })

  afterEach(async () => {
    await teardown()
  })

  it('should return 0 when post has no comments', async () => {
    const { id: postId } = await createPost({ userId })

    const { status, data, error } = await api
      .posts({ postId })
      .comments.count.get({
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    expect(status).toBe(200)
    expect(error).toBeNull()
    expect(data?.count).toBe(0)
  })

  it('should return correct comment count', async () => {
    const { id: postId } = await createPost({ userId })
    await createComment({ userId, postId })
    await createComment({ userId, postId })

    const { status, data } = await api.posts({ postId }).comments.count.get({
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(status).toBe(200)
    expect(data?.count).toBe(2)
  })

  it('should only count top-level comments, not replies', async () => {
    const { id: postId } = await createPost({ userId })
    const root = await createComment({ userId, postId })
    await createComment({ userId, postId })
    await createComment({ userId, replyId: root.id, rootId: root.id })

    const { data } = await api.posts({ postId }).comments.count.get({
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.count).toBe(2)
  })

  it('should only count comments for the specified post', async () => {
    const { id: postId } = await createPost({ userId })
    const { id: otherPostId } = await createPost({ userId })
    await createComment({ userId, postId })
    await createComment({ userId, postId: otherPostId })
    await createComment({ userId, postId: otherPostId })

    const { data } = await api.posts({ postId }).comments.count.get({
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.count).toBe(1)
  })

  it('should return 404 if post does not exist', async () => {
    const { status, error } = await api
      .posts({ postId: uuidv7() })
      .comments.count.get({
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    expect(status).toBe(404)
    expect(error?.value.message).toBe('Post not found')
  })

  it('should return 422 for invalid postId', async () => {
    const { status } = await api
      .posts({ postId: 'not-a-uuid' })
      .comments.count.get({
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    expect(status).toBe(422)
  })
})
