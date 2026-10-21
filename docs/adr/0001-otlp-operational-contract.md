# ADR 0001 — Contrato operacional y de auditoría (`@andes/log` ↔ observabilidad)

## Estado

Propuesto

## Contexto

Definir el contrato entre la librería `@andes/log` (apps Node/Express) y el stack
`andes/observabilidad` (Grafana Alloy → Loki / Tempo / Prometheus): canales
operacional vs auditoría, path de ingesta, convenciones de campos, sampling, PII
y bootstrap OpenTelemetry.

## Decisiones

### 1. Canales

| Canal | Responsabilidad | Destino | Sample |
|---|---|---|---|
| Operacional | Errores, wide events, trazas, métricas, debug | OTLP → Alloy → Loki / Tempo / Prometheus | Según señal (ver §5) |
| Auditoría / dominio | Quién hizo qué sobre qué (cumplimiento, historial) | Mongo (“andes logs”) | Nunca |

- Tratar `@andes/log` v4 como capa **operacional** (Pino + OpenTelemetry).
- Mantener auditoría en Mongo con la API de dominio existente hasta una migración explícita.
- No sustituir un evento de auditoría por un `logInfo` / wide event operacional.
- Correlacionar ambos canales con `request_id` y `trace_id` cuando exista request HTTP; no copiar PHI a Loki.

### 2. Ingesta operacional (único path a Loki)

| Señal | Endpoint OTLP | Target |
|---|---|---|
| Logs | `${OTEL_EXPORTER_OTLP_ENDPOINT}/v1/logs` | Alloy → Loki (`http://loki:3100/otlp`) |
| Traces | `/v1/traces` | Alloy → Tempo (`tempo:4317`) |
| Metrics | `/v1/metrics` | Alloy → Prometheus remote_write |

- Exponer Alloy en el host central en **TCP 4317** (gRPC) y **TCP 4318** (HTTP).
- Apuntar apps a `OTEL_EXPORTER_OTLP_ENDPOINT=http://<host-alloy>:4318` (sin path final).
- Usar **solo OTLP** como path de logs operacionales hacia Loki.
- No habilitar scrape Docker de stdout (`obs.enabled=true`) en servicios que emiten OTLP logs.
- Reservar `obs.enabled=true` + scrape stdout para cargas **sin** export OTLP de logs.
- Permitir stdout local solo para `docker logs` / depuración; no usarlo como ingesta a Loki si ya existe OTLP.

Motivo: la coexistencia de scrape stdout y OTLP logs produce líneas duplicadas en Loki y degrada la correlación.

### 3. Convenciones de campos

#### 3.1 Resource / labels de baja cardinalidad

| Emisión (OTel resource / Pino) | Label Loki | Notas |
|---|---|---|
| `service.name` | `service_name` | Obligatorio |
| `deployment.environment` | `deployment_environment` | Valores: `local` \| `test` \| `prod` (u otros acordados) |
| `level` (string) | `level` | `trace` \| `debug` \| `info` \| `warn` \| `error` \| `fatal` |

- No promover a label atributos de alta cardinalidad (`request_id`, `pacienteId`, `path` con IDs, etc.).
- En el pipeline Docker de Alloy (solo cargas sin OTLP), extraer los mismos nombres de campo hacia labels.

#### 3.2 Cuerpo del log operacional

| Campo | Obligatorio | Convención |
|---|---|---|
| `msg` | sí | Mensaje Pino |
| `module` | sí en loggers de módulo | `createLogger('<modulo>')` |
| `action` | sí en eventos de negocio / HTTP | String estable, `dominio.verbo` o `http.request` (snake/dot, sin PII) |
| `trace_id` | cuando haya span activo | Hex OTel; correlacionar con Tempo |
| `span_id` | cuando haya span activo | Hex OTel |
| `request_id` | en wide events HTTP | UUID o valor de `X-Request-Id` |

#### 3.3 Wide event (access canónico)

Campos fijos además de resource:

- `action` = `http.request`
- `request_id`, `method`, `path`, `status_code`, `duration_ms`, `outcome` (`success` \| `error`)
- `service.instance.id`, `deployment.environment`, `version` (app)

- Usar wide events como access log canónico.
- Enriquecer solo con identificadores no sensibles (p. ej. `paciente.id` interno), nunca DNI u otra PHI.

#### 3.4 Auditoría Mongo (contrato mínimo)

| Campo | Uso |
|---|---|
| `operacion` | Acción de dominio (equivalente semántico a `action`) |
| `fecha` | Timestamp del evento |
| `usuario` / `organizacion` / `app` | Actor y contexto |
| `paciente` **o** `key` | Sujeto |
| `data.anterior` / `data.valor` | Diff de negocio |
| `cliente` / `servidor` | Origen de la petición |
| `error` | Opcional |
| `request_id` / `trace_id` | Correlación con canal operacional (agregar al persistir) |

### 4. Bootstrap y bridge (`@andes/log`)

- Inicializar el SDK OTel **antes** del primer `require`/`import` efectivo de `pino`.
- Usar `node --require @andes/log/register` (o `NODE_OPTIONS`) en el entrypoint.
- Hacer `initOtel` idempotente; permitir `initObservability` después del register.
- Cargar `pino` / `pino-http` de forma diferida tras `sdk.start()`.
- Incluir mixin vía `@opentelemetry/api` para `trace_id` / `span_id` en cada línea.
- Redactar headers sensibles: `authorization`, `cookie`, `x-api-key`, `set-cookie`.

### 5. Sampling

| Señal | Dónde configurar | Regla |
|---|---|---|
| Wide events | Lib: `LOG_SAMPLE_RATE`, `LOG_SLOW_THRESHOLD_MS` | Emitir siempre si `status_code >= 400`, hay `error`, o `duration_ms` supera umbral; si no, samplear con el ratio |
| Traces | SDK OTel y/o collector | No reutilizar `LOG_SAMPLE_RATE` |
| Logs `logInfo` / `logWarn` / `logError` | `LOG_LEVEL` + criterio de aplicación | No aplicar sample aleatorio ciego |
| Access `pino-http` | `LOG_HTTP_ACCESS` (default off) | Mantener off en prod si el access canónico es el wide event |
| Auditoría Mongo | — | No samplear |

### 6. PII / PHI

- No emitir DNI, tokens, bodies clínicos ni otra PII/PHI en logs OTLP ni wide events.
- Tratar la redacción de headers como insuficiente para campos de negocio.
- Persistir datos sensibles de dominio solo en el canal de auditoría Mongo, con retención y ACLs propias.

### 7. Stack `andes/observabilidad`

- Recibir OTLP en Alloy (`4317` / `4318`) y enrutar logs→Loki, traces→Tempo, metrics→Prometheus.
- Documentar en PLAN/README el mismo contrato: operacional = OTLP; auditoría = Mongo.
- Mantener el pipeline `loki.source.docker` + `obs.enabled=true` solo para servicios **sin** OTLP logs.
- Alinear datasources Grafana (Loki↔Tempo) con `trace_id` / `service_name`.
- Exigir `OTEL_EXPORTER_OTLP_ENDPOINT` en apps con `@andes/log` v4; no combinar con `obs.enabled` para ingesta.

### 8. Variables de entorno (`@andes/log`)

| Variable | Default | Rol |
|---|---|---|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | Base OTLP del Alloy |
| `SERVICE_NAME` | `unknown` | `service.name` |
| `INSTANCE_ID` | `1` | `service.instance.id` |
| `DEPLOYMENT_ENVIRONMENT` | `local` | `deployment.environment` |
| `LOG_LEVEL` | `info` | Nivel Pino |
| `LOG_SAMPLE_RATE` | `0.05` | Sample wide events OK |
| `LOG_SLOW_THRESHOLD_MS` | `1000` | Umbral wide event lento |
| `LOG_HTTP_ACCESS` | off | Habilitar access pino-http |

## Consecuencias

- Implementar en `@andes/log`: register temprano, require diferido de Pino, mixin de traza, wide event con `action`, access pino-http off por defecto, README alineado a este ADR.
- Alinear `andes/observabilidad` (PLAN/README) a este contrato.
- Validar: request HTTP → traza en Tempo + log en Loki con el mismo `trace_id`; sin duplicados por scrape Docker.
- Conservar consumidores de auditoría Mongo hasta definir migración o paquete dedicado.

## Referencias

- Stack: `andes/observabilidad` — Alloy OTLP, Loki, Tempo, Prometheus
- Librería: `@andes/log` v4
