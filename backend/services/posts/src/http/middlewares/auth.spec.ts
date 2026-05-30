import { describe, expect, it } from 'bun:test'
import { treaty } from '@elysiajs/eden'
import { Elysia } from 'elysia'
import { uuidv7 } from 'uuidv7'
import { auth } from './auth'

const testApp = new Elysia()
  .use(auth)
  .get('/test', ({ userId }) => ({ userId }), { auth: true })

const api = treaty(testApp)

describe('Auth middleware', () => {
  it('should inject userId from gateway header', async () => {
    const userId = uuidv7()

    const { status, data } = await api.test.get({
      headers: {
        'x-user-id': userId,
      },
    })

    expect(status).toBe(200)
    expect(data?.userId).toBe(userId)
  })

  it('should reject requests without gateway user header', async () => {
    const { status } = await api.test.get()

    expect(status).toBe(401)
  })
})
