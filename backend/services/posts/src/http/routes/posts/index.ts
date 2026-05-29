import { Elysia } from 'elysia'
import { createPost } from './create-post'
import { deletePost } from './delete-post'
import { getPost } from './get-post'
import { listPosts } from './list-posts'
import { updatePost } from './update-post'

export const posts = new Elysia()
  .use(createPost)
  .use(getPost)
  .use(listPosts)
  .use(deletePost)
  .use(updatePost)
