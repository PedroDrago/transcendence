import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createTestToken } from '@test/helpers/auth'
import { createStory } from '@test/helpers/create-story'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { db } from '@/database'
import { schemas } from '@/database/schemas'
import { api } from '@/http/app'

const REGEX = /^http/

describe('List stories tests', () => {
  let token: string
  let userId: string

  beforeEach(async () => {
    userId = uuidv7()
    token = await createTestToken(userId)
  })

  afterEach(async () => {
    await teardown()
  })

  it('should be able to list stories', async () => {
    await createStory({ userId })
    await createStory({ userId })

    const { status, data, error } = await api.users({ userId }).stories.get({
      query: {
        limit: 20,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(status).toBe(200)
    expect(error).toBeNull()

    expect(data?.stories).toHaveLength(2)
    expect(data?.nextCursor).toBeNull()
  })

  it('should be able to return stories with signed media URLs', async () => {
    await createStory({ userId })

    const { data } = await api.users({ userId }).stories.get({
      query: {
        limit: 20,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.stories[0]?.mediaUrl).toMatch(REGEX)
  })

  it('should be able to return stories in descending order', async () => {
    const first = await createStory({ userId })
    const second = await createStory({ userId })

    const { data } = await api.users({ userId }).stories.get({
      query: {
        limit: 20,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.stories[0]?.id).toBe(second.id)
    expect(data?.stories[1]?.id).toBe(first.id)
  })

  it('should be able to return empty list if user has no stories', async () => {
    const { status, data } = await api.users({ userId }).stories.get({
      query: {
        limit: 20,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(status).toBe(200)
    expect(data?.stories).toHaveLength(0)
    expect(data?.nextCursor).toBeNull()
  })

  it('should be able to paginate with limit', async () => {
    await createStory({ userId })
    await createStory({ userId })
    await createStory({ userId })

    const { data } = await api.users({ userId }).stories.get({
      query: {
        limit: 2,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.stories).toHaveLength(2)
    expect(data?.nextCursor).toBeDefined()
    expect(data?.nextCursor).not.toBeNull()
  })

  it('should be able to paginate with cursor', async () => {
    const first = await createStory({ userId })
    const second = await createStory({ userId })
    const third = await createStory({ userId })

    const { data } = await api.users({ userId }).stories.get({
      query: {
        cursor: third.id,
        limit: 2,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.stories).toHaveLength(2)
    expect(data?.stories[0]?.id).toBe(second.id)
    expect(data?.stories[1]?.id).toBe(first.id)
    expect(data?.nextCursor).toBeNull()
  })

  it('should be able to only return stories from the requested user', async () => {
    const otherUserId = uuidv7()
    await createStory({ userId })
    await createStory({ userId: otherUserId })

    const { data } = await api.users({ userId }).stories.get({
      query: {
        limit: 20,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.stories).toHaveLength(1)
    expect(data?.stories[0]?.userId).toBe(userId)
  })

  it('should not return expired stories', async () => {
    await createStory({ userId })
    await db.insert(schemas.stories).values({
      userId,
      mediaKey: `stories/${userId}/${uuidv7()}.jpeg`,
      mediaType: 'image',
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    })

    const { data } = await api.users({ userId }).stories.get({
      query: {
        limit: 20,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.stories).toHaveLength(1)
  })
})
