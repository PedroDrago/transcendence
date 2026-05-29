import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createTestToken } from '@test/helpers/auth'
import { createLike } from '@test/helpers/create-like'
import { createStory } from '@test/helpers/create-story'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { api } from '@/http/app'

describe('List story likes tests', () => {
  let token: string
  let userId: string

  beforeEach(async () => {
    userId = uuidv7()
    token = await createTestToken(userId)
  })

  afterEach(async () => {
    await teardown()
  })

  it('should be able to list likes for a story', async () => {
    const { id: storyId } = await createStory({ userId })
    await createLike({ userId, storyId })
    await createLike({ userId: uuidv7(), storyId })

    const { status, data, error } = await api.stories({ storyId }).likes.get({
      query: {
        limit: 20,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(status).toBe(200)
    expect(error).toBeNull()
    expect(data?.likes).toHaveLength(2)
    expect(data?.nextCursor).toBeNull()
  })

  it('should return empty list when story has no likes', async () => {
    const { id: storyId } = await createStory({ userId })

    const { status, data } = await api.stories({ storyId }).likes.get({
      query: {
        limit: 20,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(status).toBe(200)
    expect(data?.likes).toHaveLength(0)
    expect(data?.nextCursor).toBeNull()
  })

  it('should return likes in descending order', async () => {
    const { id: storyId } = await createStory({ userId })
    const first = await createLike({ userId, storyId })
    const second = await createLike({ userId: uuidv7(), storyId })

    const { data } = await api.stories({ storyId }).likes.get({
      query: {
        limit: 20,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.likes[0]?.id).toBe(second.id)
    expect(data?.likes[1]?.id).toBe(first.id)
  })

  it('should be able to paginate with limit', async () => {
    const { id: storyId } = await createStory({ userId })
    await createLike({ userId, storyId })
    await createLike({ userId: uuidv7(), storyId })
    await createLike({ userId: uuidv7(), storyId })

    const { data } = await api.stories({ storyId }).likes.get({
      query: {
        limit: 2,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.likes).toHaveLength(2)
    expect(data?.nextCursor).not.toBeNull()
  })

  it('should be able to paginate with cursor', async () => {
    const { id: storyId } = await createStory({ userId })
    const first = await createLike({ userId, storyId })
    const second = await createLike({ userId: uuidv7(), storyId })
    const third = await createLike({ userId: uuidv7(), storyId })

    const { data } = await api.stories({ storyId }).likes.get({
      query: {
        cursor: third.id,
        limit: 2,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.likes).toHaveLength(2)
    expect(data?.likes[0]?.id).toBe(second.id)
    expect(data?.likes[1]?.id).toBe(first.id)
    expect(data?.nextCursor).toBeNull()
  })

  it('should only return likes for the specified story', async () => {
    const { id: storyId } = await createStory({ userId })
    const { id: otherStoryId } = await createStory({ userId })
    await createLike({ userId, storyId })
    await createLike({ userId: uuidv7(), storyId: otherStoryId })

    const { data } = await api.stories({ storyId }).likes.get({
      query: {
        limit: 20,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.likes).toHaveLength(1)
    expect(data?.likes[0]?.storyId).toBe(storyId)
  })

  it('should return 404 if story does not exist', async () => {
    const { status, error } = await api
      .stories({ storyId: uuidv7() })
      .likes.get({
        query: {
          limit: 20,
        },
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

    expect(status).toBe(404)
    expect(error?.value.message).toBe('Story not found')
  })
})
