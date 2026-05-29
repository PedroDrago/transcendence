import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createTestToken } from '@test/helpers/auth'
import { createStory } from '@test/helpers/create-story'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { api } from '@/http/app'

describe('Create story like tests', () => {
  let token: string
  let userId: string

  beforeEach(async () => {
    userId = uuidv7()
    token = await createTestToken(userId)
  })

  afterEach(async () => {
    await teardown()
  })

  it('should be able to like a story', async () => {
    const { id: storyId } = await createStory({ userId })

    const { status, data, error } = await api
      .stories({ storyId })
      .likes.post(undefined, {
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    expect(status).toBe(201)
    expect(error).toBeNull()

    expect(data?.userId).toBe(userId)
    expect(data?.storyId).toBe(storyId)
  })

  it('should return 404 if story does not exist', async () => {
    const { status, error } = await api
      .stories({ storyId: uuidv7() })
      .likes.post(undefined, {
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    expect(status).toBe(404)
    expect(error?.value.message).toBe('Story not found')
  })

  it('should return 409 if story is already liked by the same user', async () => {
    const { id: storyId } = await createStory({ userId })

    await api.stories({ storyId }).likes.post(undefined, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const { status, error } = await api
      .stories({ storyId })
      .likes.post(undefined, {
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    expect(status).toBe(409)
    expect(error?.value.message).toBe('Story already liked')
  })

  it('should return 422 for invalid storyId', async () => {
    const { status } = await api
      .stories({ storyId: 'not-a-uuid' })
      .likes.post(undefined, {
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    expect(status).toBe(422)
  })
})
