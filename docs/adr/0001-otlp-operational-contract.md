# ADR 0001 — Contrato operacional `@andes/log` ↔ Alloy / Loki / Tempo

## Estado

Propuesto (PR sobre `CORE-129`)

## Contexto

El stack Andes de observabilidad (repo `andes/observabilidad`) recibe telemetría en Grafana Alloy
y la persiste en Loki (logs), Tempo (trazas) y Prometheus (métricas).

`@andes/log` v4 introduce Pino + OpenTelemetry. Hay que fijar:

1. Un solo path de ingesta operacional (evitar duplicados en Loki).
2. Convención de campos/labels.
3. Dónde samplear.
4. Coexistencia con logs de dominio en Mongo (“andes logs”).

## Decisiones

### 1. Ingesta operacional: solo OTLP (path B)

| Señal | Destino |
|---|---|
| Logs operacionales | OTLP HTTP `${OTEL_EXPORTER_OTLP_ENDPOINT}/v1/logs` → Alloy → Loki |
| Traces | `/v1/traces` → Alloy → Tempo |
| Metrics | `/v1/metrics` → Alloy → Prometheus |

**No** usar scrape de stdout Docker (`obs.enabled=true`) para servicios con `@andes/log` v4.
Stdout puede quedar para `docker logs` / debug local, pero no como path a Loki.

Motivo: si conviven stdout→Alloy y OTLP logs, Loki duplica líneas y empeora la correlación.

### 2. Dominio / auditoría: Mongo por ahora

Los logs de **dominio** (“andes logs” → Mongo) **siguen** fuera de este path OTLP por ahora.

- v4 = capa **operacional** (Pino + OTel → Alloy).
- Dominio sigue en el canal Mongo existente (v3 / API actual) hasta una migración explícita.
- No mezclar PII/auditoría clínica en Loki vía wide events.

### 3. Convención de campos

**Resource / labels de baja cardinalidad** (OTel → Loki):

- `service.name` → label efectivo `service_name`
- `deployment.environment` → `deployment_environment`
- `level` (string: `info`, `warn`, `error`, …)

**Campos en el cuerpo del log:**

| Campo | Uso |
|---|---|
| `msg` | Mensaje (Pino) |
| `module` | Módulo (`createLogger('pacientes')`) |
| `action` | Acción estable (`paciente.crear`, `http.request`) |
| `trace_id` / `span_id` | Correlación con Tempo |
| Wide event | `request_id`, `method`, `path`, `status_code`, `duration_ms`, `outcome` |

### 4. Bridge Pino → OTel Logs + correlacion

- El SDK OTel debe inicializarse **antes** de la primera carga/uso de `pino` (register temprano o `initObservability` con require diferido).
- Además, mixin vía `@opentelemetry/api` aporta `trace_id`/`span_id` en cada línea.

### 5. Sampling

| Señal | Dónde | Notas |
|---|---|---|
| Wide events (access canónico) | Librería: `LOG_SAMPLE_RATE`, `LOG_SLOW_THRESHOLD_MS` | Errores (≥400) y lentos: siempre |
| Traces | SDK OTel / collector | **No** reutilizar `LOG_SAMPLE_RATE` |
| Logs `logInfo` / negocio | `LOG_LEVEL` + criterio de app | Sin sample aleatorio ciego |
| Access `pino-http` | Off por defecto (`LOG_HTTP_ACCESS=true` para habilitar) | Evitar doble access log con wide events |

### 6. PII

No enriquecer wide events ni logs operacionales con DNI, tokens, bodies clínicos u otra PHI/PII.
La redacción de headers (`authorization`, `cookie`, …) no cubre campos de negocio.

## Consecuencias

- Apps: `OTEL_EXPORTER_OTLP_ENDPOINT` apuntando al Alloy central (`:4318`); sin `obs.enabled` para ingesta.
- Smoke: request → traza en Tempo + log en Loki con el mismo `trace_id`, sin duplicar.
- Observabilidad (PLAN/README) deberá reflejar: operacional = OTLP; dominio = Mongo (transitorio).

## Referencias

- Stack: `andes/observabilidad` — Alloy OTLP `:4317`/`:4318`
- Issue/PR: CORE-129 / `andes/log#11`
