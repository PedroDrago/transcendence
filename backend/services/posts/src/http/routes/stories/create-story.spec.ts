import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createTestToken } from '@test/helpers/auth'
import { upload } from '@test/helpers/upload'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { api } from '@/http/app'
import { r2 } from '@/storage'

describe('Create story tests', () => {
  let token: string
  let userId: string

  beforeEach(async () => {
    userId = uuidv7()
    token = await createTestToken(userId)
  })

  afterEach(async () => {
    await teardown()
  })

  it('should be able to create a story', async () => {
    const { key } = await upload(token, { context: 'story' })

    const { status, data, error } = await api.stories.post(
      {
        key,
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    )

    expect(status).toBe(201)
    expect(error).toBeNull()

    expect(data?.mediaKey).not.toContain('tmp/')
    expect(data?.mediaType).toBe('image')
    expect(data?.userId).toBe(userId)
  })

  it('should be able to set mediaType as video for mp4 files', async () => {
    const { key } = await upload(token, {
      context: 'story',
      contentType: 'video/mp4',
    })

    const { status, data } = await api.stories.post(
      {
        key,
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    )

    expect(status).toBe(201)
    expect(data?.mediaType).toBe('video')
  })

  it('should be able to move media from tmp/ to permanent path after stories creation', async () => {
    const { key } = await upload(token)

    await api.stories.post(
      {
        key,
      },
      {
        headers: { authorization: `Bearer ${token}` },
      }
    )

    const tmpStillExists = await r2.exists(key)
    const permanentExists = await r2.exists(key.replace('tmp/', ''))

    expect(tmpStillExists).toBe(false)
    expect(permanentExists).toBe(true)
  })

  it('should fail if media key does not exist in storage', async () => {
    const { status } = await api.stories.post(
      {
        key: 'tmp/story/non-existent-file.jpeg',
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    )

    expect(status).toBe(400)
  })

  it('should fail if key does not start with tmp/', async () => {
    const { status } = await api.stories.post(
      {
        key: 'stories/user/file.jpeg',
      } as any,
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    )

    expect(status).toBe(422)
  })

  it('should fail without authentication', async () => {
    const { status } = await api.stories.post({
      key: 'tmp/story/some-file.jpeg',
    })

    expect(status).toBe(401)
  })

  it('should fail with invalid token', async () => {
    const { status } = await api.stories.post(
      {
        key: 'tmp/story/some-file.jpeg',
      },
      {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      }
    )

    expect(status).toBe(401)
  })
})
