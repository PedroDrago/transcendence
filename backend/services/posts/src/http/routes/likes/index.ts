import { Elysia } from 'elysia'
import { countCommentLikes } from './count-comment-likes'
import { countPostLikes } from './count-post-likes'
import { countStoryLikes } from './count-story-likes'
import { createCommentLike } from './create-comment-like'
import { createPostLike } from './create-post-like'
import { createStoryLike } from './create-story-like'
import { deleteLike } from './delete-like'
import { listCommentLikes } from './list-comment-likes'
import { listPostLikes } from './list-post-likes'
import { listStoryLikes } from './list-story-likes'

export const likes = new Elysia()
  .use(createPostLike)
  .use(createStoryLike)
  .use(createCommentLike)
  .use(deleteLike)
  .use(countPostLikes)
  .use(countStoryLikes)
  .use(countCommentLikes)
  .use(listPostLikes)
  .use(listStoryLikes)
  .use(listCommentLikes)
