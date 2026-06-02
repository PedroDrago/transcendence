import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createPost } from '@test/helpers/create-post'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { api } from '@/http/app'

describe('Create post comment tests', () => {
  let userId: string

  beforeEach(() => {
    userId = uuidv7()
  })

  afterEach(async () => {
    await teardown()
  })

  it('should be able to create a comment on a post', async () => {
    const { id: postId } = await createPost({ userId })

    const { status, data, error } = await api.posts({ postId }).comments.post(
      {
        content: 'Hello post!',
      },
      {
        headers: {
          'x-user-id': userId,
        },
      }
    )

    expect(status).toBe(201)
    expect(error).toBeNull()

    expect(data?.content).toBe('Hello post!')
    expect(data?.userId).toBe(userId)
    expect(data?.postId).toBe(postId)
  })

  it('should return 404 if post does not exist', async () => {
    const { status, error } = await api
      .posts({ postId: uuidv7() })
      .comments.post(
        {
          content: 'Hello!',
        },
        {
          headers: {
            'x-user-id': userId,
          },
        }
      )

    expect(status).toBe(404)
    expect(error?.value.message).toBe('Post not found')
  })

  it('should return 422 for empty content', async () => {
    const { id: postId } = await createPost({ userId })

    const { status } = await api.posts({ postId }).comments.post(
      {
        content: '',
      },
      {
        headers: {
          'x-user-id': userId,
        },
      }
    )

    expect(status).toBe(422)
  })

  it('should return 422 for content exceeding 2200 chars', async () => {
    const { id: postId } = await createPost({ userId })

    const { status } = await api.posts({ postId }).comments.post(
      {
        content: 'x'.repeat(2201),
      },
      {
        headers: {
          'x-user-id': userId,
        },
      }
    )

    expect(status).toBe(422)
  })
})
