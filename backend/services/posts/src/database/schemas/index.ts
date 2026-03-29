import { highlights, highlightsRelations } from './highlights'
import {
  highlightStories,
  highlightStoriesRelations,
} from './highlights-stories'
import { posts } from './posts'
import { postsSchema } from './posts-schema'
import { stories, storiesRelations } from './stories'

export const schemas = {
  postsSchema,
  posts,
  stories,
  highlights,
  highlightStories,
  storiesRelations,
  highlightsRelations,
  highlightStoriesRelations,
}
