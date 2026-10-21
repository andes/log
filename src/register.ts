/**
 * Bootstrap temprano del SDK OTel (antes de cargar `pino`).
 *
 *   node --require @andes/log/register dist/server.js
 *   NODE_OPTIONS='--require @andes/log/register'
 *
 * Luego la app llama `initObservability` / `initLogger` con normalidad
 * (initOtel es idempotente).
 */
import { initOtel } from './otel/otel';

initOtel({
    serviceName: process.env.SERVICE_NAME || 'unknown',
    instanceId: process.env.INSTANCE_ID,
    environment: process.env.DEPLOYMENT_ENVIRONMENT,
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
});
