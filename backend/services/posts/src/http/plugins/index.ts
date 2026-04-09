import { Elysia } from 'elysia'
import { corsPlugin } from './cors'
import { openapiPlugin } from './openapi'
import { openTelemetryPlugin } from './opentelemetry'

export const plugins = new Elysia()
  .use(openTelemetryPlugin)
  .use(corsPlugin)
  .use(openapiPlugin)
