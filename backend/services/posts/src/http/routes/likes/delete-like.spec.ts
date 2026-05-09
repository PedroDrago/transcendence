import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createTestToken } from '@test/helpers/auth'
import { createLike } from '@test/helpers/create-like'
import { createPost } from '@test/helpers/create-post'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { api } from '@/http/app'

describe('Delete like tests', () => {
  let token: string
  let userId: string

  beforeEach(async () => {
    userId = uuidv7()
    token = await createTestToken(userId)
  })

  afterEach(async () => {
    await teardown()
  })

  it('should be able to delete own like', async () => {
    const { id: postId } = await createPost({ userId })
    const { id: likeId } = await createLike({ userId, postId })

    const { status, error } = await api.likes({ likeId }).delete(undefined, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(status).toBe(204)
    expect(error).toBeNull()
  })

  it("should not be able to delete another user's like", async () => {
    const otherUserId = uuidv7()
    const { id: postId } = await createPost({ userId: otherUserId })
    const { id: likeId } = await createLike({ userId: otherUserId, postId })

    const { status } = await api.likes({ likeId }).delete(undefined, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(status).toBe(404)
  })

  it('should return 404 if like does not exist', async () => {
    const { status } = await api.likes({ likeId: uuidv7() }).delete(undefined, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(status).toBe(404)
  })

  it('should cascade delete like when post is deleted', async () => {
    const { id: postId } = await createPost({ userId })
    const { id: likeId } = await createLike({ userId, postId })

    await api.posts({ postId }).delete(undefined, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const { status } = await api.likes({ likeId }).delete(undefined, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(status).toBe(404)
  })
})
