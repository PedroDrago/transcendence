import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createPost } from '@test/helpers/create-post'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { api } from '@/http/app'

const REGEX = /^http/

describe('Get posts tests', () => {
  let userId: string

  beforeEach(() => {
    userId = uuidv7()
  })

  afterEach(async () => {
    await teardown()
  })

  it('should be able to get a post', async () => {
    const { id } = await createPost({
      userId,
      caption: 'My test post!',
    })

    const { status, data, error } = await api.posts({ id }).get({
      headers: {
        'x-user-id': userId,
      },
    })

    expect(status).toBe(200)
    expect(error).toBeNull()

    expect(data?.id).toBe(id)
    expect(data?.userId).toBe(userId)
    expect(data?.caption).toBe('My test post!')
    expect(data?.mediaUrl).toBeDefined()
  })

  it('should return a signed media URL', async () => {
    const { id } = await createPost({ userId })

    const { data } = await api.posts({ id }).get({
      headers: {
        'x-user-id': userId,
      },
    })

    expect(data?.mediaUrl).toMatch(REGEX)
  })

  it('should be able to return the same data when called twice (cache hit)', async () => {
    const { id } = await createPost({ userId, caption: 'cached post' })

    const headers = { 'x-user-id': userId }

    const { data: first } = await api.posts({ id }).get({ headers })
    const { data: second } = await api.posts({ id }).get({ headers })

    expect(first?.id).toBe(second?.id)
    expect(first?.caption).toBe(second?.caption)
  })

  it('should be able to return 404 if post does not exist', async () => {
    const { status } = await api.posts({ id: uuidv7() }).get({
      headers: {
        'x-user-id': userId,
      },
    })

    expect(status).toBe(404)
  })
})
