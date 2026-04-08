import { Elysia } from 'elysia'
import { createStory } from './create-story'
import { deleteStory } from './delete-stories'
import { getStory } from './get-story'
import { listStories } from './list-stories'

export const stories = new Elysia()
  .use(createStory)
  .use(getStory)
  .use(listStories)
  .use(deleteStory)
