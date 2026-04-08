import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createTestToken } from '@test/helpers/auth'
import { createStory } from '@test/helpers/create-story'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { db } from '@/database'
import { schemas } from '@/database/schemas'
import { api } from '@/http/app'

const REGEX = /^http/

describe('Get story tests', () => {
  let token: string
  let userId: string

  beforeEach(async () => {
    userId = uuidv7()
    token = await createTestToken(userId)
  })

  afterEach(async () => {
    await teardown()
  })

  it('should be able to get a story', async () => {
    const { id } = await createStory({ userId })

    const { status, data, error } = await api.stories({ id }).get({
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(status).toBe(200)
    expect(error).toBeNull()

    expect(data?.id).toBe(id)
    expect(data?.userId).toBe(userId)
    expect(data?.mediaUrl).toBeDefined()
  })

  it('should return a signed media URL', async () => {
    const { id } = await createStory({ userId })

    const { data } = await api.stories({ id }).get({
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(data?.mediaUrl).toMatch(REGEX)
  })

  it('should be able to return the same data when called twice (cache hit)', async () => {
    const { id } = await createStory({ userId })

    const headers = { authorization: `Bearer ${token}` }

    const { data: first } = await api.stories({ id }).get({ headers })
    const { data: second } = await api.stories({ id }).get({ headers })

    expect(first?.id).toBe(second?.id)
    expect(first?.mediaKey).toBe(second?.mediaKey)
  })

  it('should be able to return 404 if story does not exist', async () => {
    const { status } = await api.stories({ id: uuidv7() }).get({
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(status).toBe(404)
  })

  it('should return 404 for an expired story', async () => {
    const [story] = await db
      .insert(schemas.stories)
      .values({
        userId,
        mediaKey: `stories/${userId}/${uuidv7()}.jpeg`,
        mediaType: 'image',
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      })
      .returning()

    const { status } = await api.stories({ id: story?.id }).get({
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(status).toBe(404)
  })

  it('should fail without authentication', async () => {
    const { id } = await createStory({ userId })

    const { status } = await api.stories({ id }).get()

    expect(status).toBe(401)
  })

  it('should fail with invalid token', async () => {
    const { id } = await createStory({ userId })

    const { status } = await api.stories({ id }).get({
      headers: {
        authorization: 'Bearer invalid-token',
      },
    })

    expect(status).toBe(401)
  })
})
