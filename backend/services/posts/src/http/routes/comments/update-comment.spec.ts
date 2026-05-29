import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createTestToken } from '@test/helpers/auth'
import { createComment } from '@test/helpers/create-comment'
import { createPost } from '@test/helpers/create-post'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { api } from '@/http/app'

describe('Update comment tests', () => {
  let token: string
  let userId: string

  beforeEach(async () => {
    userId = uuidv7()
    token = await createTestToken(userId)
  })

  afterEach(async () => {
    await teardown()
  })

  it('should be able to update own comment', async () => {
    const { id: postId } = await createPost({ userId })
    const { id: commentId } = await createComment({
      userId,
      postId,
      content: 'Original',
    })

    const { status, data, error } = await api.comments({ commentId }).patch(
      {
        content: 'Updated',
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    )

    expect(status).toBe(200)
    expect(error).toBeNull()

    expect(data?.id).toBe(commentId)
    expect(data?.content).toBe('Updated')
  })

  it('should invalidate cache after update', async () => {
    const { id: postId } = await createPost({ userId })
    const { id: commentId } = await createComment({
      userId,
      postId,
      content: 'Original',
    })

    const headers = { authorization: `Bearer ${token}` }

    await api.comments({ commentId }).get({ headers })

    await api.comments({ commentId }).patch({ content: 'Updated' }, { headers })

    const { data } = await api.comments({ commentId }).get({ headers })

    expect(data?.content).toBe('Updated')
  })

  it("should not be able to update another user's comment", async () => {
    const otherUserId = uuidv7()
    const { id: postId } = await createPost({ userId: otherUserId })
    const { id: commentId } = await createComment({
      userId: otherUserId,
      postId,
    })

    const { status } = await api.comments({ commentId }).patch(
      {
        content: 'Hacked',
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    )

    expect(status).toBe(404)
  })

  it('should return 404 if comment does not exist', async () => {
    const { status } = await api.comments({ commentId: uuidv7() }).patch(
      {
        content: 'Updated',
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    )

    expect(status).toBe(404)
  })
})
