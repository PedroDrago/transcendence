import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createTestToken } from '@test/helpers/auth'
import { createPost } from '@test/helpers/create-post'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { api } from '@/http/app'

describe('Update posts tests', () => {
  let token: string
  let userId: string

  beforeEach(async () => {
    userId = uuidv7()
    token = await createTestToken(userId)
  })

  afterEach(async () => {
    await teardown()
  })

  it('should be able to update a post', async () => {
    const { id } = await createPost({
      userId,
      caption: 'My test post!',
    })

    const { status, data, error } = await api.posts({ id }).patch(
      {
        caption: 'updated caption',
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    )

    expect(status).toBe(200)
    expect(error).toBeNull()

    expect(data?.id).toBe(id)
    expect(data?.userId).toBe(userId)
    expect(data?.caption).toBe('updated caption')
    expect(data?.mediaUrl).toBeDefined()
  })

  it('should invalidate cache after update', async () => {
    const { id } = await createPost({ userId, caption: 'original' })

    const headers = { authorization: `Bearer ${token}` }

    await api.posts({ id }).get({ headers })

    await api.posts({ id }).patch({ caption: 'updated' }, { headers })

    const { data } = await api.posts({ id }).get({ headers })

    expect(data?.caption).toBe('updated')
  })

  it('should not be able to update a post from another user', async () => {
    const otherUserId = uuidv7()

    const { id } = await createPost({ userId: otherUserId })

    const { status } = await api.posts({ id }).patch(
      {
        caption: 'hacked',
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    )

    expect(status).toBe(404)
  })

  it('should return 404 if post does not exist', async () => {
    const { status } = await api.posts({ id: uuidv7() }).patch(
      {
        caption: 'updated',
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    )

    expect(status).toBe(404)
  })
})
