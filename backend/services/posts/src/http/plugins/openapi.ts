import { openapi } from '@elysiajs/openapi'
import { Elysia } from 'elysia'
import { z } from 'zod/v4'

export const openapiPlugin = new Elysia().use(
  openapi({
    exclude: {
      methods: ['OPTIONS'],
      paths: ['/', '/*'],
    },
    documentation: {
      info: {
        title: 'Posts Service',
        description: '',
        version: '1.0.0',
      },
    },
    mapJsonSchema: {
      zod: z.toJSONSchema,
    },
  })
)
