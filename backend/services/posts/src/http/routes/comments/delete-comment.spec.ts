import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createTestToken } from '@test/helpers/auth'
import { createComment } from '@test/helpers/create-comment'
import { createPost } from '@test/helpers/create-post'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { api } from '@/http/app'

describe('Delete comment tests', () => {
  let token: string
  let userId: string

  beforeEach(async () => {
    userId = uuidv7()
    token = await createTestToken(userId)
  })

  afterEach(async () => {
    await teardown()
  })

  it('should be able to delete own comment', async () => {
    const { id: postId } = await createPost({ userId })
    const { id: commentId } = await createComment({ userId, postId })

    const { status, error } = await api
      .comments({ commentId })
      .delete(undefined, {
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    expect(status).toBe(204)
    expect(error).toBeNull()
  })

  it("should not be able to delete another user's comment", async () => {
    const otherUserId = uuidv7()
    const { id: postId } = await createPost({ userId: otherUserId })
    const { id: commentId } = await createComment({
      userId: otherUserId,
      postId,
    })

    const { status } = await api.comments({ commentId }).delete(undefined, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(status).toBe(404)
  })

  it('should return 404 if comment does not exist', async () => {
    const { status } = await api
      .comments({ commentId: uuidv7() })
      .delete(undefined, {
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    expect(status).toBe(404)
  })

  it('should cascade delete replies when parent comment is deleted', async () => {
    const { id: postId } = await createPost({ userId })
    const parent = await createComment({ userId, postId })
    const reply = await createComment({
      userId,
      replyId: parent.id,
      rootId: parent.id,
    })

    await api.comments({ commentId: parent.id }).delete(undefined, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const { status } = await api.comments({ commentId: reply.id }).get({
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(status).toBe(404)
  })
})
