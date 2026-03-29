import { Elysia } from 'elysia'
import { env } from '@/env'
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
  .listen({ hostname: env.HOST, port: env.PORT }, ({ hostname, port }) => {
    console.log(`Server are available at http://${hostname}:${port}`)
    console.log(`Docs are available at http://${hostname}:${port}/openapi`)
  })
