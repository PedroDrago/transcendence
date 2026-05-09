import { S3Client } from 'bun'
import { env } from '@/env'

export const r2 = new S3Client({
  accessKeyId: env.R2_ACCESS_KEY_ID,
  secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  endpoint: env.R2_ENDPOINT,
  bucket: env.R2_BUCKET,
})
