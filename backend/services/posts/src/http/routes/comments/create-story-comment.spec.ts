import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createTestToken } from '@test/helpers/auth'
import { createStory } from '@test/helpers/create-story'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { api } from '@/http/app'

describe('Create story comment tests', () => {
  let token: string
  let userId: string

  beforeEach(async () => {
    userId = uuidv7()
    token = await createTestToken(userId)
  })

  afterEach(async () => {
    await teardown()
  })

  it('should be able to create a comment on a story', async () => {
    const { id: storyId } = await createStory({ userId })

    const { status, data, error } = await api
      .stories({ storyId })
      .comments.post(
        {
          content: 'Nice story!',
        },
        {
          headers: {
            authorization: `Bearer ${token}`,
          },
        }
      )

    expect(status).toBe(201)
    expect(error).toBeNull()

    expect(data?.content).toBe('Nice story!')
    expect(data?.userId).toBe(userId)
    expect(data?.storyId).toBe(storyId)
  })

  it('should return 404 if story does not exist', async () => {
    const { status, error } = await api
      .stories({ storyId: uuidv7() })
      .comments.post(
        {
          content: 'Hello!',
        },
        {
          headers: {
            authorization: `Bearer ${token}`,
          },
        }
      )

    expect(status).toBe(404)
    expect(error?.value.message).toBe('Story not found')
  })

  it('should return 422 for empty content', async () => {
    const { id: storyId } = await createStory({ userId })

    const { status } = await api.stories({ storyId }).comments.post(
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
