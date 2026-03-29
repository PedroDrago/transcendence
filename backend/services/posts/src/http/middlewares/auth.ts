import { bearer } from '@elysiajs/bearer'
import { jwt } from '@elysiajs/jwt'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { env } from '@/env'

export const auth = new Elysia()
  .use(bearer())
  .use(
    jwt({
      secret: env.JWT_SECRET,
      schema: z.object({
        sub: z.string(),
      }),
    })
  )
  .macro({
    auth: {
      async resolve({ bearer, jwt, status }) {
        if (!bearer) {
          return status(401, {
            error: 'Unauthorized',
            message: 'Authentication required.',
          })
        }

        const payload = await jwt.verify(bearer)

        if (!payload) {
          return status(401, {
            error: 'Unauthorized',
            message: 'Invalid or expired token.',
          })
        }

        return {
          userId: payload.sub,
        }
      },
    },
  })
