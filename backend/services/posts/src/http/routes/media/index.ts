import { Elysia } from 'elysia'
import { presignUrl } from './presign-url'

export const media = new Elysia().use(presignUrl)
