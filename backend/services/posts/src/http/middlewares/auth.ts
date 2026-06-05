import { Elysia } from 'elysia'

export const auth = new Elysia().macro({
  auth: {
    beforeHandle({ headers, status }) {
      const userId = headers['x-user-id']

      if (!userId) {
        return status(401, {
          error: 'Unauthorized',
          message: 'Missing authenticated user',
        })
      }
    },
    resolve({ headers }) {
      return { userId: headers['x-user-id'] as string }
    },
  },
})
