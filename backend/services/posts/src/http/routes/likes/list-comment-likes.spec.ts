import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createTestToken } from '@test/helpers/auth'
import { createComment } from '@test/helpers/create-comment'
import { createLike } from '@test/helpers/create-like'
import { createPost } from '@test/helpers/create-post'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { api } from '@/http/app'

describe('List comment likes tests', () => {
  let token: string
  let userId: string

  beforeEach(async () => {
    userId = uuidv7()
    token = await createTestToken(userId)
  })

  afterEach(async () => {
    await teardown()
  })

  it('should be able to list likes for a comment', async () => {
    const { id: postId } = await createPost({ userId })
    const { id: commentId } = await createComment({ userId, postId })
    await createLike({ userId, commentId })
    await createLike({ userId: uuidv7(), commentId })

    const { status, data, error } = await api
      .comments({ commentId })
      .likes.get({
        query: {
          limit: 20,
        },
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    expect(status).toBe(200)
    expect(error).toBeNull()
    expect(data?.likes).toHaveLength(2)
    expect(data?.nextCursor).toBeNull()
  })

  it('should return empty list when comment has no likes', async () => {
    const { id: postId } = await createPost({ userId })
    const { id: commentId } = await createComment({ userId, postId })

    const { status, data } = await api.comments({ commentId }).likes.get({
      query: {
        limit: 20,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(status).toBe(200)
    expect(data?.likes).toHaveLength(0)
    expect(data?.nextCursor).toBeNull()
  })

  it('should return likes in descending order', async () => {
    const { id: postId } = await createPost({ userId })
    const { id: commentId } = await createComment({ userId, postId })
    const first = await createLike({ userId, commentId })
    const second = await createLike({ userId: uuidv7(), commentId })

    const { data } = await api.comments({ commentId }).likes.get({
      query: {
        limit: 20,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.likes[0]?.id).toBe(second.id)
    expect(data?.likes[1]?.id).toBe(first.id)
  })

  it('should be able to paginate with limit', async () => {
    const { id: postId } = await createPost({ userId })
    const { id: commentId } = await createComment({ userId, postId })
    await createLike({ userId, commentId })
    await createLike({ userId: uuidv7(), commentId })
    await createLike({ userId: uuidv7(), commentId })

    const { data } = await api.comments({ commentId }).likes.get({
      query: {
        limit: 2,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.likes).toHaveLength(2)
    expect(data?.nextCursor).not.toBeNull()
  })

  it('should be able to paginate with cursor', async () => {
    const { id: postId } = await createPost({ userId })
    const { id: commentId } = await createComment({ userId, postId })
    const first = await createLike({ userId, commentId })
    const second = await createLike({ userId: uuidv7(), commentId })
    const third = await createLike({ userId: uuidv7(), commentId })

    const { data } = await api.comments({ commentId }).likes.get({
      query: {
        cursor: third.id,
        limit: 2,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.likes).toHaveLength(2)
    expect(data?.likes[0]?.id).toBe(second.id)
    expect(data?.likes[1]?.id).toBe(first.id)
    expect(data?.nextCursor).toBeNull()
  })

  it('should only return likes for the specified comment', async () => {
    const { id: postId } = await createPost({ userId })
    const { id: commentId } = await createComment({ userId, postId })
    const { id: otherCommentId } = await createComment({ userId, postId })
    await createLike({ userId, commentId })
    await createLike({ userId: uuidv7(), commentId: otherCommentId })

    const { data } = await api.comments({ commentId }).likes.get({
      query: {
        limit: 20,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.likes).toHaveLength(1)
    expect(data?.likes[0]?.commentId).toBe(commentId)
  })

  it('should return 404 if comment does not exist', async () => {
    const { status, error } = await api
      .comments({ commentId: uuidv7() })
      .likes.get({
        query: {
          limit: 20,
        },
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    expect(status).toBe(404)
    expect(error?.value.message).toBe('Comment not found')
  })
})
