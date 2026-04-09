import { Elysia } from 'elysia'
import { createCommentLike } from './create-comment-like'
import { createPostLike } from './create-post-like'
import { createStoryLike } from './create-story-like'
import { deleteLike } from './delete-like'

export const likes = new Elysia()
  .use(createPostLike)
  .use(createStoryLike)
  .use(createCommentLike)
  .use(deleteLike)
