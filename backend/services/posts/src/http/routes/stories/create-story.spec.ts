import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { upload } from '@test/helpers/upload'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { api } from '@/http/app'
import { r2 } from '@/storage'

describe('Create story tests', () => {
  let userId: string

  beforeEach(() => {
    userId = uuidv7()
  })

  afterEach(async () => {
    await teardown()
  })

  it('should be able to create a story', async () => {
    const { key } = await upload(userId, { context: 'story' })

    const { status, data, error } = await api.stories.post(
      {
        key,
      },
      {
        headers: {
          'x-user-id': userId,
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
    const { key } = await upload(userId, {
      context: 'story',
      contentType: 'video/mp4',
    })

    const { status, data } = await api.stories.post(
      {
        key,
      },
      {
        headers: {
          'x-user-id': userId,
        },
      }
    )

    expect(status).toBe(201)
    expect(data?.mediaType).toBe('video')
  })

  it('should be able to move media from tmp/ to permanent path after stories creation', async () => {
    const { key } = await upload(userId)

    await api.stories.post(
      {
        key,
      },
      {
        headers: { 'x-user-id': userId },
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
          'x-user-id': userId,
        },
      }
    )

    expect(status).toBe(404)
  })

  it('should fail if key does not start with tmp/', async () => {
    const { status } = await api.stories.post(
      {
        key: 'stories/user/file.jpeg',
      } as any,
      {
        headers: {
          'x-user-id': userId,
        },
      }
    )

    expect(status).toBe(422)
  })
})
