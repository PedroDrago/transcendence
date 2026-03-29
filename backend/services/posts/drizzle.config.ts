import { defineConfig } from 'drizzle-kit'
import { env } from '@/env'

export default defineConfig({
  casing: 'snake_case',
  dialect: 'postgresql',
  out: './src/database/migrations',
  schema: './src/database/schemas/*.ts',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
})
