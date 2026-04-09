import { comments, commentsRelations } from './comments'
import { likes, likesRelations } from './likes'
import { posts, postsRelations } from './posts'
import { postsSchema } from './posts-schema'
import { stories, storiesRelations } from './stories'

export const schemas = {
  postsSchema,
  posts,
  postsRelations,
  stories,
  storiesRelations,
  comments,
  commentsRelations,
  likes,
  likesRelations,
}
