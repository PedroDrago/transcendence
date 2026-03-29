import { cors } from '@elysiajs/cors'
import { Elysia } from 'elysia'
import { env } from '@/env'

export const corsPlugin = new Elysia().use(
  cors({
    origin: env.ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
)
