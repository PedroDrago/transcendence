import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createTestToken } from '@test/helpers/auth'
import { createComment } from '@test/helpers/create-comment'
import { createLike } from '@test/helpers/create-like'
import { createPost } from '@test/helpers/create-post'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { api } from '@/http/app'

describe('Count comment likes tests', () => {
  let token: string
  let userId: string

  beforeEach(async () => {
    userId = uuidv7()
    token = await createTestToken(userId)
  })

  afterEach(async () => {
    await teardown()
  })

  it('should return 0 when comment has no likes', async () => {
    const { id: postId } = await createPost({ userId })
    const { id: commentId } = await createComment({ userId, postId })

    const { status, data, error } = await api
      .comments({ commentId })
      .likes.count.get({
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    expect(status).toBe(200)
    expect(error).toBeNull()
    expect(data?.count).toBe(0)
  })

  it('should return correct like count', async () => {
    const { id: postId } = await createPost({ userId })
    const { id: commentId } = await createComment({ userId, postId })
    await createLike({ userId, commentId })
    await createLike({ userId: uuidv7(), commentId })

    const { status, data } = await api.comments({ commentId }).likes.count.get({
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(status).toBe(200)
    expect(data?.count).toBe(2)
  })

  it('should only count likes for the specified comment', async () => {
    const { id: postId } = await createPost({ userId })
    const { id: commentId } = await createComment({ userId, postId })
    const { id: otherCommentId } = await createComment({ userId, postId })
    await createLike({ userId, commentId })
    await createLike({ userId: uuidv7(), commentId: otherCommentId })

    const { data } = await api.comments({ commentId }).likes.count.get({
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.count).toBe(1)
  })

  it('should return 404 if comment does not exist', async () => {
    const { status, error } = await api
      .comments({ commentId: uuidv7() })
      .likes.count.get({
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    expect(status).toBe(404)
    expect(error?.value.message).toBe('Comment not found')
  })

  it('should return 422 for invalid commentId', async () => {
    const { status } = await api
      .comments({ commentId: 'not-a-uuid' })
      .likes.count.get({
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    expect(status).toBe(422)
  })
})
