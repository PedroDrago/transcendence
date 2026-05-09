import { env } from '@/env'
import { app } from './app'

app.listen({ hostname: env.HOST, port: env.PORT }, ({ hostname, port }) => {
  console.log(`Server are available at http://${hostname}:${port}`)
  console.log(`Docs are available at http://${hostname}:${port}/openapi`)
})
