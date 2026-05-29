import { Elysia } from 'elysia'
import { z } from 'zod'

export const liveness = new Elysia().get(
  '/healthz',
  () => ({
    status: 'available',
    uptime: process.uptime(),
  }),
  {
    detail: {
      tags: ['Health'],
      summary: 'Get liveness status',
      description: 'Get the liveness status of the service',
      operationId: 'getLiveness',
    },
    response: {
      200: z.object({ status: z.string(), uptime: z.number() }),
    },
  }
)
