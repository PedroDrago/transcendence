import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createComment } from '@test/helpers/create-comment'
import { createPost } from '@test/helpers/create-post'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { api } from '@/http/app'

describe('Create comment like tests', () => {
  let userId: string

  beforeEach(() => {
    userId = uuidv7()
  })

  afterEach(async () => {
    await teardown()
  })

  it('should be able to like a comment', async () => {
    const { id: postId } = await createPost({ userId })
    const { id: commentId } = await createComment({ userId, postId })

    const { status, data, error } = await api
      .comments({ commentId })
      .likes.post(undefined, {
        headers: {
          'x-user-id': userId,
        },
      })

    expect(status).toBe(201)
    expect(error).toBeNull()

    expect(data?.userId).toBe(userId)
    expect(data?.commentId).toBe(commentId)
  })

  it('should return 404 if comment does not exist', async () => {
    const { status, error } = await api
      .comments({ commentId: uuidv7() })
      .likes.post(undefined, {
        headers: {
          'x-user-id': userId,
        },
      })

    expect(status).toBe(404)
    expect(error?.value.message).toBe('Comment not found')
  })

  it('should return 409 if comment is already liked by the same user', async () => {
    const { id: postId } = await createPost({ userId })
    const { id: commentId } = await createComment({ userId, postId })

    await api.comments({ commentId }).likes.post(undefined, {
      headers: {
        'x-user-id': userId,
      },
    })

    const { status, error } = await api
      .comments({ commentId })
      .likes.post(undefined, {
        headers: {
          'x-user-id': userId,
        },
      })

    expect(status).toBe(409)
    expect(error?.value.message).toBe('Comment already liked')
  })

  it('should return 422 for invalid commentId', async () => {
    const { status } = await api
      .comments({ commentId: 'not-a-uuid' })
      .likes.post(undefined, {
        headers: {
          'x-user-id': userId,
        },
      })

    expect(status).toBe(422)
  })
})
