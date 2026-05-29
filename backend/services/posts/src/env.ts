import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'staging', 'production', 'test'])
    .default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().default(3333),
  ORIGIN: z.url(),
  DATABASE_URL: z.url().startsWith('postgres://'),
  REDIS_URL: z.url().startsWith('redis://'),
  R2_ACCESS_KEY_ID: z.string(),
  R2_SECRET_ACCESS_KEY: z.string(),
  R2_ENDPOINT: z.url(),
  R2_BUCKET: z.string(),
  JWT_SECRET: z.string(),
  SERVICE_NAME: z.string(),
  OTEL_EXPORTER_URL: z.url(),
})

export const env = envSchema.parse(process.env)
