import { treaty } from '@elysiajs/eden'
import { Elysia } from 'elysia'
import { middlewares } from './middlewares'
import { plugins } from './plugins'
import { comments } from './routes/comments'
import { health } from './routes/health'
import { likes } from './routes/likes'
import { media } from './routes/media'
import { posts } from './routes/posts'
import { stories } from './routes/stories'

export const app = new Elysia()
  .use(plugins)
  .use(middlewares)
  .use(health)
  .use(media)
  .use(posts)
  .use(stories)
  .use(comments)
  .use(likes)

export const api = treaty(app)
