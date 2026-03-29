import { Elysia } from 'elysia'
import { uuidv7 } from 'uuidv7'
import { z } from 'zod'
import { middlewares } from '@/http/middlewares'
import { r2 } from '@/storage'

const EXPIRATION = 600

export const presignUrl = new Elysia().use(middlewares).post(
  '/presign-url',
  ({ userId, body }) => {
    const { context, contentType } = body

    const ext = contentType.split('/')[1]

    const key = `tmp/${context}/${userId}/${uuidv7()}.${ext}`

    const url = r2.presign(key, {
      method: 'PUT',
      expiresIn: EXPIRATION,
      type: contentType,
    })

    return {
      url,
      key,
      expiresIn: EXPIRATION,
    }
  },
  {
    auth: true,
    detail: {
      tags: ['Media'],
      summary: 'Presign a URL for media upload',
      description: 'Presign a URL for media upload to R2',
      operationId: 'presignUrl',
    },
    body: z.object({
      context: z.enum(['post', 'story', 'highlight_cover']),
      contentType: z.enum([
        'image/jpeg',
        'image/png',
        'image/webp',
        'video/mp4',
      ]),
    }),
    response: {
      200: z.object({
        url: z.string(),
        key: z.string(),
        expiresIn: z.number(),
      }),
      401: z.object({
        error: z.string(),
        message: z.string(),
      }),
    },
  }
)
