import { opentelemetry } from '@elysiajs/opentelemetry'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node'
import { env } from '@/env'

export const openTelemetryPlugin = opentelemetry({
  serviceName: env.SERVICE_NAME,
  instrumentations: [new PgInstrumentation()],
  spanProcessors: [
    new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: env.OTEL_EXPORTER_URL,
      })
    ),
  ],
})
