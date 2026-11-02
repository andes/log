import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { Resource } from '@opentelemetry/resources';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';

export interface OtelConfig {
    serviceName: string;
    instanceId?: string;
    environment?: string;
    endpoint?: string;
    /** Ratio de traces raíz a samplear (0-1). Default 1 (todas) o `OTEL_TRACES_SAMPLER_RATIO`. */
    traceSampleRatio?: number;
}

let started: NodeSDK | null = null;
let startedServiceName: string | null = null;

function warn(message: string): void {
    process.emitWarning(`[andes/log] ${message}`, 'AndesLogOtelWarning');
}

function resolveSampleRatio(value?: number): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.min(Math.max(value, 0), 1);
    }
    const fromEnv = parseFloat(process.env.OTEL_TRACES_SAMPLER_RATIO || '');
    if (Number.isFinite(fromEnv)) {
        return Math.min(Math.max(fromEnv, 0), 1);
    }
    return 1;
}

export function initOtel(config: OtelConfig): NodeSDK {
    if (started) {
        if (config.serviceName && startedServiceName && config.serviceName !== startedServiceName) {
            warn(
                `OTel ya inicializado con service.name="${startedServiceName}"; se ignora "${config.serviceName}". ` +
                    'Definir SERVICE_NAME antes del bootstrap para el resource OTLP.'
            );
        }
        return started;
    }

    const endpoint = (config.endpoint || process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318').replace(/\/$/, '');
    const serviceName = config.serviceName || process.env.SERVICE_NAME || 'unknown';

    const resource = new Resource({
        'service.name': serviceName,
        'service.instance.id': config.instanceId || process.env.INSTANCE_ID || '1',
        'deployment.environment': config.environment || process.env.DEPLOYMENT_ENVIRONMENT || 'local',
    });

    const sdk = new NodeSDK({
        resource,
        sampler: new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(resolveSampleRatio(config.traceSampleRatio)) }),
        traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
        metricReader: new PeriodicExportingMetricReader({
            exporter: new OTLPMetricExporter({ url: `${endpoint}/v1/metrics` }),
            exportIntervalMillis: 5000,
        }),
        logRecordProcessors: [
            new BatchLogRecordProcessor(
                new OTLPLogExporter({ url: `${endpoint}/v1/logs` })
            ),
        ],
        instrumentations: [
            getNodeAutoInstrumentations({
                '@opentelemetry/instrumentation-fs': { enabled: false },
            }),
        ],
    });

    sdk.start();
    started = sdk;
    startedServiceName = serviceName;

    return sdk;
}

/**
 * Flush + shutdown del SDK. Llamarlo desde el shutdown ordenado de la app;
 * la librería no se apropia de `SIGTERM` ni fuerza `process.exit()`.
 */
export async function shutdownOtel(): Promise<void> {
    if (!started) {
        return;
    }
    const sdk = started;
    started = null;
    startedServiceName = null;
    try {
        await sdk.shutdown();
    } catch {
        // shutdown best-effort: no interrumpir el cierre de la app
    }
}
