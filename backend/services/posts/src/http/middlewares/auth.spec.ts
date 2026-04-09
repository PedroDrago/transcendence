import { describe, expect, it } from 'bun:test'
import { treaty } from '@elysiajs/eden'
import { createTestToken } from '@test/helpers/auth'
import { Elysia } from 'elysia'
import { uuidv7 } from 'uuidv7'
import { auth } from './auth'

const testApp = new Elysia()
  .use(auth)
  .get('/test', ({ userId }) => ({ userId }), { auth: true })

const api = treaty(testApp)

describe('Auth middleware', () => {
  it('should return 401 without authentication', async () => {
    const { status, error } = await api.test.get()

    expect(status).toBe(401)
    expect(error?.value.message).toBe('Authentication required.')
  })

  it('should return 401 with invalid token', async () => {
    const { status, error } = await api.test.get({
      headers: {
        authorization: 'Bearer invalid-token',
      },
    })

    expect(status).toBe(401)
    expect(error?.value.message).toBe('Invalid or expired token.')
  })

  it('should inject userId from valid token', async () => {
    const userId = uuidv7()
    const token = await createTestToken(userId)

    const { status, data } = await api.test.get({
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(status).toBe(200)
    expect(data?.userId).toBe(userId)
  })
})
