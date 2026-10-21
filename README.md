# @andes/log v4

Capa operacional: Pino + OpenTelemetry (OTLP → Alloy → Loki / Tempo / Prometheus)
y wide events para Node.js + Express.

Contrato: [`docs/adr/0001-otlp-operational-contract.md`](./docs/adr/0001-otlp-operational-contract.md).

## Alcance

| Canal | Destino |
|---|---|
| Operacional (v4) | OTLP → Alloy → Loki / Tempo / Prometheus |
| Auditoría / dominio | Mongo (“andes logs”), fuera de OTLP hasta migración explícita |

- Usar **solo OTLP** como path de logs operacionales hacia Loki.
- No habilitar `obs.enabled=true` (scrape stdout) en servicios que ya exportan OTLP logs: la doble ingesta genera líneas duplicadas en Loki.

## Instalación

```json
{
  "dependencies": {
    "@andes/log": "file:../log"
  }
}
```

## Uso — Backend (Express)

### 1. Bootstrap OTel + init

Inicializar el SDK antes de cargar `pino`:

```bash
node --require @andes/log/register dist/server.js
# o: NODE_OPTIONS='--require @andes/log/register'
```

En el entrypoint:

```typescript
import { initObservability, createLogger, wideEventMiddleware, httpMiddleware } from '@andes/log';

initObservability({ serviceName: 'mi-api' });

// Access canónico = wide events.
// pino-http: autoLogging off salvo LOG_HTTP_ACCESS=true.
app.use(httpMiddleware());
app.use(wideEventMiddleware(createLogger('wide-event')));
```

Efectos de `initObservability`:

- Export OTLP HTTP (`/v1/traces`, `/v1/metrics`, `/v1/logs`) hacia Alloy `:4318`
- Pino con resource attrs OTel + mixin `trace_id` / `span_id`
- Redacción de headers sensibles

### 2. Logs en servicios

```typescript
import { createLogger, enrichWideEvent, enrichWideEventUser } from '@andes/log';

const logger = createLogger('pacientes');

logger.logInfo('Paciente creado', { action: 'paciente.crear', pacienteId: '123' });
logger.logError(new Error('ANDES timeout'), { action: 'mpi.timeout', endpoint: '/mpi' });

enrichWideEventUser(req, res);
// Sin PII/PHI en el canal operacional
enrichWideEvent(req, res, { paciente: { id: '123' } });
```

Convenciones: ver ADR §3 (`module`, `action`, labels, wide event, auditoría Mongo).

## Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `LOG_LEVEL` | `info` | Nivel Pino |
| `LOG_SAMPLE_RATE` | `0.05` | Sample de wide events exitosos (no aplica a traces ni a auditoría) |
| `LOG_SLOW_THRESHOLD_MS` | `1000` | Umbral de request lento (wide event siempre emitido) |
| `LOG_HTTP_ACCESS` | off | `true` habilita access log de pino-http |
| `SERVICE_NAME` | `unknown` | → `service.name` |
| `INSTANCE_ID` | `1` | → `service.instance.id` |
| `DEPLOYMENT_ENVIRONMENT` | `local` | → `deployment.environment` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | Base OTLP del Alloy central |

## Validación contra el stack

1. Configurar `OTEL_EXPORTER_OTLP_ENDPOINT=http://<host-alloy>:4318`.
2. Emitir un request 200 (o forzar sample) y un 500.
3. Comprobar traza en Tempo y log en Loki con el mismo `trace_id`.
4. Comprobar que no existan líneas duplicadas por scrape Docker (`obs.enabled`).
