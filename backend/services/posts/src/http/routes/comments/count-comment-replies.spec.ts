import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createTestToken } from '@test/helpers/auth'
import { createComment } from '@test/helpers/create-comment'
import { createPost } from '@test/helpers/create-post'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { api } from '@/http/app'

describe('Count comment replies tests', () => {
  let token: string
  let userId: string

  beforeEach(async () => {
    userId = uuidv7()
    token = await createTestToken(userId)
  })

  afterEach(async () => {
    await teardown()
  })

  it('should return 0 when comment has no replies', async () => {
    const { id: postId } = await createPost({ userId })
    const { id: commentId } = await createComment({ userId, postId })

    const { status, data, error } = await api
      .comments({ commentId })
      .replies.count.get({
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    expect(status).toBe(200)
    expect(error).toBeNull()
    expect(data?.count).toBe(0)
  })

  it('should return correct reply count', async () => {
    const { id: postId } = await createPost({ userId })
    const { id: commentId } = await createComment({ userId, postId })
    await createComment({ userId, replyId: commentId, rootId: commentId })
    await createComment({ userId, replyId: commentId, rootId: commentId })

    const { status, data } = await api
      .comments({ commentId })
      .replies.count.get({
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    expect(status).toBe(200)
    expect(data?.count).toBe(2)
  })

  it('should only count direct replies, not nested replies', async () => {
    const { id: postId } = await createPost({ userId })
    const root = await createComment({ userId, postId })
    const replyA = await createComment({
      userId,
      replyId: root.id,
      rootId: root.id,
    })
    await createComment({ userId, replyId: replyA.id, rootId: root.id })

    const { data } = await api
      .comments({ commentId: root.id })
      .replies.count.get({
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    expect(data?.count).toBe(1)
  })

  it('should only count replies for the specified comment', async () => {
    const { id: postId } = await createPost({ userId })
    const { id: commentId } = await createComment({ userId, postId })
    const { id: otherCommentId } = await createComment({ userId, postId })
    await createComment({ userId, replyId: commentId, rootId: commentId })
    await createComment({
      userId,
      replyId: otherCommentId,
      rootId: otherCommentId,
    })
    await createComment({
      userId,
      replyId: otherCommentId,
      rootId: otherCommentId,
    })

    const { data } = await api.comments({ commentId }).replies.count.get({
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.count).toBe(1)
  })

  it('should return 404 if comment does not exist', async () => {
    const { status, error } = await api
      .comments({ commentId: uuidv7() })
      .replies.count.get({
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
      .replies.count.get({
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    expect(status).toBe(422)
  })
})
