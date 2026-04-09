import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createTestToken } from '@test/helpers/auth'
import { createComment } from '@test/helpers/create-comment'
import { createPost } from '@test/helpers/create-post'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { api } from '@/http/app'

describe('Create reply comment tests', () => {
  let token: string
  let userId: string

  beforeEach(async () => {
    userId = uuidv7()
    token = await createTestToken(userId)
  })

  afterEach(async () => {
    await teardown()
  })

  it('should be able to create a reply to a comment', async () => {
    const { id: postId } = await createPost({ userId })
    const { id: commentId } = await createComment({ userId, postId })

    const { status, data, error } = await api
      .comments({ commentId })
      .replies.post(
        {
          content: 'My reply!',
        },
        {
          headers: {
            authorization: `Bearer ${token}`,
          },
        }
      )

    expect(status).toBe(201)
    expect(error).toBeNull()

    expect(data?.content).toBe('My reply!')
    expect(data?.userId).toBe(userId)
    expect(data?.replyId).toBe(commentId)
    expect(data?.rootId).toBe(commentId)
  })

  it('should set rootId to the original root when replying to a reply', async () => {
    const { id: postId } = await createPost({ userId })
    const root = await createComment({ userId, postId })
    const reply = await createComment({
      userId,
      replyId: root.id,
      rootId: root.id,
    })

    const { data } = await api.comments({ commentId: reply.id }).replies.post(
      {
        content: 'Nested reply',
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    )

    expect(data?.replyId).toBe(reply.id)
    expect(data?.rootId).toBe(root.id)
  })

  it('should return 404 if parent comment does not exist', async () => {
    const { status } = await api.comments({ commentId: uuidv7() }).replies.post(
      {
        content: 'Reply to nothing',
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    )

    expect(status).toBe(404)
  })

  it('should return 422 for empty content', async () => {
    const { id: postId } = await createPost({ userId })
    const { id: commentId } = await createComment({ userId, postId })

    const { status } = await api.comments({ commentId }).replies.post(
      {
        content: '',
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    )

    expect(status).toBe(422)
  })
})
