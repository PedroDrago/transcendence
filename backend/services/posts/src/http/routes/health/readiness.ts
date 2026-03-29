import { redis, sql } from 'bun'
import { Elysia } from 'elysia'
import { z } from 'zod'

export const readiness = new Elysia().get(
  '/readyz',
  async ({ status }) => {
    const checks = await Promise.allSettled([sql`SELECT 1`, redis.ping()])

    const hasError = checks.some((check) => check.status === 'rejected')

    if (hasError) {
      return status(503, {
        application: 'available',
        database:
          checks[0].status === 'fulfilled' ? 'available' : 'unavailable',
        cache: checks[1].status === 'fulfilled' ? 'available' : 'unavailable',
      })
    }

    return status(200, {
      application: 'available',
      database: 'available',
      cache: 'available',
    })
  },
  {
    detail: {
      tags: ['Health'],
      summary: 'Get readiness status',
      description:
        'Get the readiness status of the service and its dependencies',
      operationId: 'getReadiness',
    },
    response: {
      200: z.object({
        application: z.string(),
        database: z.string(),
        cache: z.string(),
      }),
      503: z.object({
        application: z.string(),
        database: z.string(),
        cache: z.string(),
      }),
    },
  }
)
