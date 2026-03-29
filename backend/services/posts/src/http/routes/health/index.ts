import { Elysia } from 'elysia'
import { liveness } from './liveness'
import { readiness } from './readiness'

export const health = new Elysia().use(liveness).use(readiness)
