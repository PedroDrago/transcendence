import { SignJWT } from 'jose'
import { env } from '@/env'

export function createTestToken(userId: string): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET)

  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .sign(secret)
}
