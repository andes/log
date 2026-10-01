# @andes/log v4

Librería de logging estructurado con Pino + OpenTelemetry + Wide Events para Node.js + Express.

## Instalación

```json
{
  "dependencies": {
    "@andes/log": "file:../log"
  }
}
```

## Uso — Backend (Express)

### 1. Inicializar en server.ts

```typescript
import { initObservability, httpMiddleware, createLogger, wideEventMiddleware } from '@andes/log';

initObservability({ serviceName: 'mi-api' });

// En config():
app.use(httpMiddleware());
app.use(wideEventMiddleware(createLogger('wide-event')));
```

`initObservability` configura:
- Pino con semántica OTel (`service.name`, `service.instance.id`, `deployment.environment`)
- OTel SDK (traces + metrics export vía OTLP)
- Mixin de `trace_id`/`span_id` en cada log
- Redacción de headers sensibles (Authorization, Cookie)

### 2. Usar en servicios/controladores

```typescript
import { createLogger, enrichWideEvent, enrichWideEventUser } from '@andes/log';

const logger = createLogger('pacientes');

// Log simple
logger.logInfo('Paciente creado', { pacienteId: '123' });
logger.logError(new Error('ANDES timeout'), { endpoint: '/mpi' });

// Enriquecer wide event con datos de negocio
enrichWideEventUser(req, res);
enrichWideEvent(req, res, { paciente: { id: '123', dni: '30123456' } });
```

## Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `LOG_LEVEL` | `info` | Nivel: trace, debug, info, warn, error, fatal |
| `LOG_SAMPLE_RATE` | `0.05` | Tasa de sampleo para requests exitosos |
| `LOG_SLOW_THRESHOLD_MS` | `1000` | Umbral para considerar request lento |
| `SERVICE_NAME` | `unknown` | Nombre del servicio → `service.name` |
| `INSTANCE_ID` | `1` | ID de instancia → `service.instance.id` |
| `DEPLOYMENT_ENVIRONMENT` | `local` | Entorno: local, test, prod → `deployment.environment` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | Endpoint OTLP del collector (Alloy) |
