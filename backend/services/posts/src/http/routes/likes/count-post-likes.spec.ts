import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createTestToken } from '@test/helpers/auth'
import { createLike } from '@test/helpers/create-like'
import { createPost } from '@test/helpers/create-post'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { api } from '@/http/app'

describe('Count post likes tests', () => {
  let token: string
  let userId: string

  beforeEach(async () => {
    userId = uuidv7()
    token = await createTestToken(userId)
  })

  afterEach(async () => {
    await teardown()
  })

  it('should return 0 when post has no likes', async () => {
    const { id: postId } = await createPost({ userId })

    const { status, data, error } = await api
      .posts({ postId })
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
    await createLike({ userId, postId })
    await createLike({ userId: uuidv7(), postId })

    const { status, data } = await api.posts({ postId }).likes.count.get({
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(status).toBe(200)
    expect(data?.count).toBe(2)
  })

  it('should only count likes for the specified post', async () => {
    const { id: postId } = await createPost({ userId })
    const { id: otherPostId } = await createPost({ userId })
    await createLike({ userId, postId })
    await createLike({ userId: uuidv7(), postId: otherPostId })

    const { data } = await api.posts({ postId }).likes.count.get({
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.count).toBe(1)
  })

  it('should return 404 if post does not exist', async () => {
    const { status, error } = await api
      .posts({ postId: uuidv7() })
      .likes.count.get({
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
      .likes.count.get({
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    expect(status).toBe(422)
  })
})
