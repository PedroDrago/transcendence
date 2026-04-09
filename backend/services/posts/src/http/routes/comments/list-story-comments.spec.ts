import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createTestToken } from '@test/helpers/auth'
import { createComment } from '@test/helpers/create-comment'
import { createStory } from '@test/helpers/create-story'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { api } from '@/http/app'

describe('List story comments tests', () => {
  let token: string
  let userId: string

  beforeEach(async () => {
    userId = uuidv7()
    token = await createTestToken(userId)
  })

  afterEach(async () => {
    await teardown()
  })

  it('should be able to list comments for a story', async () => {
    const { id: storyId } = await createStory({ userId })
    await createComment({ userId, storyId })
    await createComment({ userId, storyId })

    const { status, data, error } = await api
      .stories({ storyId })
      .comments.get({
        query: {
          limit: 20,
        },
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    expect(status).toBe(200)
    expect(error).toBeNull()

    expect(data?.comments).toHaveLength(2)
    expect(data?.nextCursor).toBeNull()
  })

  it('should return comments in descending order', async () => {
    const { id: storyId } = await createStory({ userId })
    const first = await createComment({ userId, storyId })
    const second = await createComment({ userId, storyId })

    const { data } = await api.stories({ storyId }).comments.get({
      query: {
        limit: 20,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.comments[0]?.id).toBe(second.id)
    expect(data?.comments[1]?.id).toBe(first.id)
  })

  it('should return empty list if no comments', async () => {
    const { id: storyId } = await createStory({ userId })

    const { status, data } = await api.stories({ storyId }).comments.get({
      query: {
        limit: 20,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(status).toBe(200)
    expect(data?.comments).toHaveLength(0)
    expect(data?.nextCursor).toBeNull()
  })

  it('should be able to paginate with limit', async () => {
    const { id: storyId } = await createStory({ userId })
    await createComment({ userId, storyId })
    await createComment({ userId, storyId })
    await createComment({ userId, storyId })

    const { data } = await api.stories({ storyId }).comments.get({
      query: {
        limit: 2,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.comments).toHaveLength(2)
    expect(data?.nextCursor).not.toBeNull()
  })

  it('should be able to paginate with cursor', async () => {
    const { id: storyId } = await createStory({ userId })
    const first = await createComment({ userId, storyId })
    const second = await createComment({ userId, storyId })
    const third = await createComment({ userId, storyId })

    const { data } = await api.stories({ storyId }).comments.get({
      query: {
        cursor: third.id,
        limit: 2,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.comments).toHaveLength(2)
    expect(data?.comments[0]?.id).toBe(second.id)
    expect(data?.comments[1]?.id).toBe(first.id)
    expect(data?.nextCursor).toBeNull()
  })

  it('should only return comments for the specified story', async () => {
    const { id: storyId } = await createStory({ userId })
    const { id: otherStoryId } = await createStory({ userId })

    await createComment({ userId, storyId })
    await createComment({ userId, storyId: otherStoryId })

    const { data } = await api.stories({ storyId }).comments.get({
      query: {
        limit: 20,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })
    expect(data?.comments).toHaveLength(1)
    expect(data?.comments[0]?.storyId).toBe(storyId)
  })
})
