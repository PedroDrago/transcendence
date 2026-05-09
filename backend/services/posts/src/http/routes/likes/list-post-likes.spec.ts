import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createTestToken } from '@test/helpers/auth'
import { createLike } from '@test/helpers/create-like'
import { createPost } from '@test/helpers/create-post'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { api } from '@/http/app'

describe('List post likes tests', () => {
  let token: string
  let userId: string

  beforeEach(async () => {
    userId = uuidv7()
    token = await createTestToken(userId)
  })

  afterEach(async () => {
    await teardown()
  })

  it('should be able to list likes for a post', async () => {
    const { id: postId } = await createPost({ userId })
    await createLike({ userId, postId })
    await createLike({ userId: uuidv7(), postId })

    const { status, data, error } = await api.posts({ postId }).likes.get({
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

  it('should return empty list when post has no likes', async () => {
    const { id: postId } = await createPost({ userId })

    const { status, data } = await api.posts({ postId }).likes.get({
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
    const first = await createLike({ userId, postId })
    const second = await createLike({ userId: uuidv7(), postId })

    const { data } = await api.posts({ postId }).likes.get({
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
    await createLike({ userId, postId })
    await createLike({ userId: uuidv7(), postId })
    await createLike({ userId: uuidv7(), postId })

    const { data } = await api.posts({ postId }).likes.get({
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
    const first = await createLike({ userId, postId })
    const second = await createLike({ userId: uuidv7(), postId })
    const third = await createLike({ userId: uuidv7(), postId })

    const { data } = await api.posts({ postId }).likes.get({
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

  it('should only return likes for the specified post', async () => {
    const { id: postId } = await createPost({ userId })
    const { id: otherPostId } = await createPost({ userId })
    await createLike({ userId, postId })
    await createLike({ userId: uuidv7(), postId: otherPostId })

    const { data } = await api.posts({ postId }).likes.get({
      query: {
        limit: 20,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.likes).toHaveLength(1)
    expect(data?.likes[0]?.postId).toBe(postId)
  })

  it('should return 404 if post does not exist', async () => {
    const { status, error } = await api.posts({ postId: uuidv7() }).likes.get({
      query: {
        limit: 20,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(status).toBe(404)
    expect(error?.value.message).toBe('Post not found')
  })
})
