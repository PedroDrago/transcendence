import { bearer } from '@elysiajs/bearer'
import { Elysia } from 'elysia'
import { decodeJwt } from 'jose'

export const auth = new Elysia().use(bearer()).macro({
  auth: {
    resolve({ bearer }) {
      const { sub } = decodeJwt(bearer as string)

      return { userId: sub as string }
    },
  },
})
