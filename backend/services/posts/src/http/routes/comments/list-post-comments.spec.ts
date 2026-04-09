import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createTestToken } from '@test/helpers/auth'
import { createComment } from '@test/helpers/create-comment'
import { createLike } from '@test/helpers/create-like'
import { createPost } from '@test/helpers/create-post'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { api } from '@/http/app'

describe('List post comments tests', () => {
  let token: string
  let userId: string

  beforeEach(async () => {
    userId = uuidv7()
    token = await createTestToken(userId)
  })

  afterEach(async () => {
    await teardown()
  })

  it('should be able to list comments for a post', async () => {
    const { id: postId } = await createPost({ userId })
    await createComment({ userId, postId })
    await createComment({ userId, postId })

    const { status, data, error } = await api.posts({ postId }).comments.get({
      query: {
        limit: 20,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(status).toBe(200)
    expect(error).toBeNull()

    expect(data?.comments).toHaveLength(2)
    expect(data?.nextCursor).toBeNull()
  })

  it('should return comments in descending order', async () => {
    const { id: postId } = await createPost({ userId })
    const first = await createComment({ userId, postId })
    const second = await createComment({ userId, postId })

    const { data } = await api.posts({ postId }).comments.get({
      query: {
        limit: 20,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.comments[0]?.id).toBe(second.id)
    expect(data?.comments[1]?.id).toBe(first.id)
  })

  it('should return empty list if no comments', async () => {
    const { id: postId } = await createPost({ userId })

    const { status, data } = await api.posts({ postId }).comments.get({
      query: {
        limit: 20,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(status).toBe(200)
    expect(data?.comments).toHaveLength(0)
    expect(data?.nextCursor).toBeNull()
  })

  it('should be able to paginate with limit', async () => {
    const { id: postId } = await createPost({ userId })
    await createComment({ userId, postId })
    await createComment({ userId, postId })
    await createComment({ userId, postId })

    const { data } = await api.posts({ postId }).comments.get({
      query: {
        limit: 2,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.comments).toHaveLength(2)
    expect(data?.nextCursor).not.toBeNull()
  })

  it('should be able to paginate with cursor', async () => {
    const { id: postId } = await createPost({ userId })
    const first = await createComment({ userId, postId })
    const second = await createComment({ userId, postId })
    const third = await createComment({ userId, postId })

    const { data } = await api.posts({ postId }).comments.get({
      query: {
        cursor: third.id,
        limit: 2,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.comments).toHaveLength(2)
    expect(data?.comments[0]?.id).toBe(second.id)
    expect(data?.comments[1]?.id).toBe(first.id)
    expect(data?.nextCursor).toBeNull()
  })

  it('should only return comments for the specified post', async () => {
    const { id: postId } = await createPost({ userId })
    const { id: otherPostId } = await createPost({ userId })

    await createComment({ userId, postId })
    await createComment({ userId, postId: otherPostId })

    const { data } = await api.posts({ postId }).comments.get({
      query: {
        limit: 20,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.comments).toHaveLength(1)
    expect(data?.comments[0]?.postId).toBe(postId)
  })

  it('should return likeCount and replyCount per comment', async () => {
    const { id: postId } = await createPost({ userId })
    const { id: commentId } = await createComment({ userId, postId })
    await createLike({ userId, commentId })
    await createLike({ userId: uuidv7(), commentId })
    await createComment({ userId, replyId: commentId, rootId: commentId })

    const { data } = await api.posts({ postId }).comments.get({
      query: {
        limit: 20,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.comments[0]?.likeCount).toBe(2)
    expect(data?.comments[0]?.replyCount).toBe(1)
  })

  it('should return 0 counts when comment has no likes or replies', async () => {
    const { id: postId } = await createPost({ userId })
    await createComment({ userId, postId })

    const { data } = await api.posts({ postId }).comments.get({
      query: {
        limit: 20,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.comments[0]?.likeCount).toBe(0)
    expect(data?.comments[0]?.replyCount).toBe(0)
  })
})
