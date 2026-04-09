import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createTestToken } from '@test/helpers/auth'
import { createPost } from '@test/helpers/create-post'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { api } from '@/http/app'

const REGEX = /^http/

describe('List posts tests', () => {
  let token: string
  let userId: string

  beforeEach(async () => {
    userId = uuidv7()
    token = await createTestToken(userId)
  })

  afterEach(async () => {
    await teardown()
  })

  it('should be able to list posts', async () => {
    await createPost({ userId, caption: 'post 1' })
    await createPost({ userId, caption: 'post 2' })

    const { status, data, error } = await api.users({ userId }).posts.get({
      query: {
        limit: 20,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(status).toBe(200)
    expect(error).toBeNull()

    expect(data?.posts).toHaveLength(2)
    expect(data?.nextCursor).toBeNull()
  })

  it('should be able to return posts with signed media URLs', async () => {
    await createPost({ userId })

    const { data } = await api.users({ userId }).posts.get({
      query: {
        limit: 20,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.posts[0]?.mediaUrl).toMatch(REGEX)
  })

  it('should be able to return posts in descending order', async () => {
    const first = await createPost({ userId, caption: 'first' })
    const second = await createPost({ userId, caption: 'second' })

    const { data } = await api.users({ userId }).posts.get({
      query: {
        limit: 20,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.posts[0]?.id).toBe(second.id)
    expect(data?.posts[1]?.id).toBe(first.id)
  })

  it('should be able to return empty list if user has no posts', async () => {
    const { status, data } = await api.users({ userId }).posts.get({
      query: {
        limit: 20,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(status).toBe(200)

    expect(data?.posts).toHaveLength(0)
    expect(data?.nextCursor).toBeNull()
  })

  it('should be able to paginate with limit', async () => {
    await createPost({ userId, caption: 'post 1' })
    await createPost({ userId, caption: 'post 2' })
    await createPost({ userId, caption: 'post 3' })

    const { data } = await api.users({ userId }).posts.get({
      query: {
        limit: 2,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.posts).toHaveLength(2)
    expect(data?.nextCursor).toBeDefined()
    expect(data?.nextCursor).not.toBeNull()
  })

  it('should be able to paginate with cursor', async () => {
    const first = await createPost({ userId, caption: 'post 1' })
    const second = await createPost({ userId, caption: 'post 2' })
    const third = await createPost({ userId, caption: 'post 3' })

    const { data } = await api.users({ userId }).posts.get({
      query: {
        cursor: third.id,
        limit: 2,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.posts).toHaveLength(2)
    expect(data?.posts[0]?.id).toBe(second.id)
    expect(data?.posts[1]?.id).toBe(first.id)
    expect(data?.nextCursor).toBeNull()
  })

  it('should be able to only return posts from the requested user', async () => {
    const otherUserId = uuidv7()
    await createPost({ userId })
    await createPost({ userId: otherUserId })

    const { data } = await api.users({ userId }).posts.get({
      query: {
        limit: 20,
      },
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.posts).toHaveLength(1)
    expect(data?.posts[0]?.userId).toBe(userId)
  })
})
