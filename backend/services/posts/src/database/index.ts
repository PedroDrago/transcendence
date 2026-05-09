import { drizzle } from 'drizzle-orm/node-postgres'
import { env } from '@/env'
import { schemas } from './schemas'

export const db = drizzle(env.DATABASE_URL, {
  schema: schemas,
  casing: 'snake_case',
})
