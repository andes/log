# @andes/log v4

Logging operacional con **Pino + OpenTelemetry** (OTLP → Alloy / Loki / Tempo / Prometheus)
y *wide events* para Node.js + Express.

Contrato y decisiones: [`docs/adr/0001-otlp-operational-contract.md`](./docs/adr/0001-otlp-operational-contract.md).

## Alcance

| Canal | Destino |
|---|---|
| **Operacional** (esta v4) | OTLP → Alloy → Loki / Tempo / Prometheus |
| **Dominio / auditoría** | Mongo (“andes logs”) — **sigue por ahora** fuera de OTLP |

**Un solo path a Loki: OTLP.** No uses label Docker `obs.enabled=true` para scrapear stdout
de servicios con v4 (evitarías logs duplicados).

## Instalación

```json
{
  "dependencies": {
    "@andes/log": "file:../log"
  }
}
```

## Uso — Backend (Express)

### 1. Bootstrap OTel (recomendado) + init

Para que `instrumentation-pino` parchee antes de cargar `pino`:

```bash
node --require @andes/log/register dist/server.js
# o: NODE_OPTIONS='--require @andes/log/register'
```

En `server.ts` (primeras líneas del entrypoint):

```typescript
import { initObservability, createLogger, wideEventMiddleware, httpMiddleware } from '@andes/log';

initObservability({ serviceName: 'mi-api' });

// Access canónico = wide events (sampleados).
// httpMiddleware deja autoLogging off salvo LOG_HTTP_ACCESS=true.
app.use(httpMiddleware());
app.use(wideEventMiddleware(createLogger('wide-event')));
```

`initObservability` configura:

- SDK OTel → OTLP HTTP (`/v1/traces`, `/v1/metrics`, `/v1/logs`) hacia Alloy `:4318`
- Pino con resource attrs OTel + mixin `trace_id` / `span_id`
- Redacción de headers sensibles

### 2. Logs en servicios

```typescript
import { createLogger, enrichWideEvent, enrichWideEventUser } from '@andes/log';

const logger = createLogger('pacientes');

logger.logInfo('Paciente creado', { action: 'paciente.crear', pacienteId: '123' });
logger.logError(new Error('ANDES timeout'), { action: 'mpi.timeout', endpoint: '/mpi' });

enrichWideEventUser(req, res);
// Sin PII/PHI (no DNI, tokens, bodies clínicos)
enrichWideEvent(req, res, { paciente: { id: '123' } });
```

## Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `LOG_LEVEL` | `info` | Nivel: trace, debug, info, warn, error, fatal |
| `LOG_SAMPLE_RATE` | `0.05` | Sampleo de **wide events** exitosos (no traces) |
| `LOG_SLOW_THRESHOLD_MS` | `1000` | Request lento → siempre se loguea el wide event |
| `LOG_HTTP_ACCESS` | off | `true` = pino-http loguea cada request (además del wide event) |
| `SERVICE_NAME` | `unknown` | → `service.name` |
| `INSTANCE_ID` | `1` | → `service.instance.id` |
| `DEPLOYMENT_ENVIRONMENT` | `local` | → `deployment.environment` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | Alloy central |

## Smoke (dev-monitoreo)

1. `OTEL_EXPORTER_OTLP_ENDPOINT=http://<host-monitoreo>:4318`
2. Un 200 (o forzar sample) y un 500
3. Verificar traza en Tempo + log en Loki con el mismo `trace_id`
4. Confirmar que **no** hay duplicado por scrape Docker
