import { Elysia } from 'elysia'
import { createPostComment } from './create-post-comment'
import { createReplyComment } from './create-reply-comment'
import { createStoryComment } from './create-story-comment'
import { deleteComment } from './delete-comment'
import { getComment } from './get-comment'
import { listPostComments } from './list-post-comments'
import { listReplyComments } from './list-reply-comments'
import { listStoryComments } from './list-story-comments'
import { updateComment } from './update-comment'

export const comments = new Elysia()
  .use(createPostComment)
  .use(createStoryComment)
  .use(createReplyComment)
  .use(deleteComment)
  .use(getComment)
  .use(listPostComments)
  .use(listReplyComments)
  .use(listStoryComments)
  .use(updateComment)
