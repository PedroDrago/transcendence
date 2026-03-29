import { Elysia } from 'elysia'
import { createPost } from './create-post'
import { getPost } from './get-post'

export const posts = new Elysia().use(createPost).use(getPost)
