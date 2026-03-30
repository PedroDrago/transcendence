import { treaty } from '@elysiajs/eden'
import { Elysia } from 'elysia'
import { middlewares } from './middlewares'
import { plugins } from './plugins'
import { health } from './routes/health'
import { media } from './routes/media'
import { posts } from './routes/posts'

export const app = new Elysia()
  .use(plugins)
  .use(middlewares)
  .use(health)
  .use(media)
  .use(posts)

export const api = treaty(app)
