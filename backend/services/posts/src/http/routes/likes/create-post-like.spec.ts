import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createTestToken } from '@test/helpers/auth'
import { createPost } from '@test/helpers/create-post'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { api } from '@/http/app'

describe('Create post like tests', () => {
  let token: string
  let userId: string

  beforeEach(async () => {
    userId = uuidv7()
    token = await createTestToken(userId)
  })

  afterEach(async () => {
    await teardown()
  })

  it('should be able to like a post', async () => {
    const { id: postId } = await createPost({ userId })

    const { status, data, error } = await api
      .posts({ postId })
      .likes.post(undefined, {
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    expect(status).toBe(201)
    expect(error).toBeNull()

    expect(data?.userId).toBe(userId)
    expect(data?.postId).toBe(postId)
  })

  it('should return 404 if post does not exist', async () => {
    const { status, error } = await api
      .posts({ postId: uuidv7() })
      .likes.post(undefined, {
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    expect(status).toBe(404)
    expect(error?.value.message).toBe('Post not found')
  })

  it('should return 409 if post is already liked by the same user', async () => {
    const { id: postId } = await createPost({ userId })

    await api.posts({ postId }).likes.post(undefined, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const { status, error } = await api
      .posts({ postId })
      .likes.post(undefined, {
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    expect(status).toBe(409)
    expect(error?.value.message).toBe('Post already liked')
  })

  it('should return 422 for invalid postId', async () => {
    const { status } = await api
      .posts({ postId: 'not-a-uuid' })
      .likes.post(undefined, {
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    expect(status).toBe(422)
  })
})
