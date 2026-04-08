import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createTestToken } from '@test/helpers/auth'
import { createStory } from '@test/helpers/create-story'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { api } from '@/http/app'
import { r2 } from '@/storage'

describe('Delete story tests', () => {
  let token: string
  let userId: string

  beforeEach(async () => {
    userId = uuidv7()
    token = await createTestToken(userId)
  })

  afterEach(async () => {
    await teardown()
  })

  it('should be able to delete a story', async () => {
    const { id } = await createStory({ userId })

    const { status, error } = await api.stories({ id }).delete(undefined, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(status).toBe(204)
    expect(error).toBeNull()
  })

  it('should be able to remove media from R2 after deletion', async () => {
    const { id, mediaKey } = await createStory({ userId })

    await api.stories({ id }).delete(undefined, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const exists = await r2.exists(mediaKey)

    expect(exists).toBe(false)
  })

  it('should not be able to delete a story from another user', async () => {
    const otherUserId = uuidv7()

    const { id } = await createStory({ userId: otherUserId })

    const { status } = await api.stories({ id }).delete(undefined, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(status).toBe(404)
  })

  it('should be able to return 404 if story does not exist', async () => {
    const { status } = await api.stories({ id: uuidv7() }).delete(undefined, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(status).toBe(404)
  })

  it('should fail without authentication', async () => {
    const { id } = await createStory({ userId })

    const { status } = await api.stories({ id }).delete()

    expect(status).toBe(401)
  })

  it('should fail with invalid token', async () => {
    const { id } = await createStory({ userId })

    const { status } = await api.stories({ id }).delete(undefined, {
      headers: {
        authorization: 'Bearer invalid-token',
      },
    })

    expect(status).toBe(401)
  })
})
