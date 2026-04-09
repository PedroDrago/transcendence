import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createTestToken } from '@test/helpers/auth'
import { createComment } from '@test/helpers/create-comment'
import { createStory } from '@test/helpers/create-story'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { api } from '@/http/app'

describe('Count story comments tests', () => {
  let token: string
  let userId: string

  beforeEach(async () => {
    userId = uuidv7()
    token = await createTestToken(userId)
  })

  afterEach(async () => {
    await teardown()
  })

  it('should return 0 when story has no comments', async () => {
    const { id: storyId } = await createStory({ userId })

    const { status, data, error } = await api
      .stories({ storyId })
      .comments.count.get({
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    expect(status).toBe(200)
    expect(error).toBeNull()
    expect(data?.count).toBe(0)
  })

  it('should return correct comment count', async () => {
    const { id: storyId } = await createStory({ userId })
    await createComment({ userId, storyId })
    await createComment({ userId, storyId })

    const { status, data } = await api.stories({ storyId }).comments.count.get({
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(status).toBe(200)
    expect(data?.count).toBe(2)
  })

  it('should only count top-level comments, not replies', async () => {
    const { id: storyId } = await createStory({ userId })
    const root = await createComment({ userId, storyId })
    await createComment({ userId, storyId })
    await createComment({ userId, replyId: root.id, rootId: root.id })

    const { data } = await api.stories({ storyId }).comments.count.get({
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.count).toBe(2)
  })

  it('should only count comments for the specified story', async () => {
    const { id: storyId } = await createStory({ userId })
    const { id: otherStoryId } = await createStory({ userId })
    await createComment({ userId, storyId })
    await createComment({ userId, storyId: otherStoryId })
    await createComment({ userId, storyId: otherStoryId })

    const { data } = await api.stories({ storyId }).comments.count.get({
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.count).toBe(1)
  })

  it('should return 404 if story does not exist', async () => {
    const { status, error } = await api
      .stories({ storyId: uuidv7() })
      .comments.count.get({
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    expect(status).toBe(404)
    expect(error?.value.message).toBe('Story not found')
  })

  it('should return 422 for invalid storyId', async () => {
    const { status } = await api
      .stories({ storyId: 'not-a-uuid' })
      .comments.count.get({
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    expect(status).toBe(422)
  })
})
