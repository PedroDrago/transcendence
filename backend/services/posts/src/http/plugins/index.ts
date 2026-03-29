import { Elysia } from 'elysia'
import { corsPlugin } from './cors'
import { openapiPlugin } from './openapi'
import { openTelemetryPlugin } from './opentelemetry'

export const plugins = new Elysia()
  .use(corsPlugin)
  .use(openapiPlugin)
  .use(openTelemetryPlugin)
