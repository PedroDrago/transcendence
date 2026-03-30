import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createTestToken } from '@test/helpers/auth'
import { createTestFile } from '@test/helpers/create-test-file'
import { teardown } from '@test/teardown'
import { uuidv7 } from 'uuidv7'
import { api } from '@/http/app'

describe('Presign URL tests', () => {
  let token: string
  let userId: string

  beforeEach(async () => {
    userId = uuidv7()
    token = await createTestToken(userId)
  })

  afterEach(async () => {
    await teardown()
  })

  it('should be able to generate a presigned URL', async () => {
    const regex = new RegExp(`^tmp/post/${userId}/.+\\.jpeg$`)

    const { status, data, error } = await api['presign-url'].post(
      {
        context: 'post',
        contentType: 'image/jpeg',
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    )

    expect(status).toBe(200)
    expect(error).toBeNull()

    expect(data).toBeDefined()
    expect(data).toHaveProperty('url')
    expect(data).toHaveProperty('key')
    expect(data).toHaveProperty('expiresIn')

    expect(data?.key).toMatch(regex)
    expect(data?.key.endsWith('.jpeg')).toBe(true)
    expect(data?.expiresIn).toBe(600)
  })

  it('should be able to generate a URL that accepts a PUT request', async () => {
    const { data } = await api['presign-url'].post(
      {
        context: 'post',
        contentType: 'image/jpeg',
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    )

    expect(data?.url).toBeDefined()

    const file = createTestFile()

    const response = await fetch(data?.url as string, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: file,
    })

    expect(response.ok).toBe(true)
  })

  it('should fail with invalid context', async () => {
    const { status, error } = await api['presign-url'].post(
      {
        context: 'invalid',
        contentType: 'image/jpeg',
      } as any,
      {
        headers: { authorization: `Bearer ${token}` },
      }
    )

    expect(status).toBe(422)
    expect(error).toBeDefined()
  })

  it('should fail with invalid content type', async () => {
    const { status, error } = await api['presign-url'].post(
      {
        context: 'post',
        contentType: 'application/pdf',
      } as any,
      {
        headers: { authorization: `Bearer ${token}` },
      }
    )

    expect(status).toBe(422)
    expect(error).toBeDefined()
  })

  it('should fail without authentication', async () => {
    const { status } = await api['presign-url'].post({
      context: 'post',
      contentType: 'image/jpeg',
    })

    expect(status).toBe(401)
  })

  it('should fail with invalid token', async () => {
    const { status } = await api['presign-url'].post(
      {
        context: 'post',
        contentType: 'image/jpeg',
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
