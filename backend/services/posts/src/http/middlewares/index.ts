import { Elysia } from 'elysia'
import { auth } from './auth'

export const middlewares = new Elysia().use(auth)
