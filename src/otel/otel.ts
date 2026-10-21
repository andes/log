import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { Resource } from '@opentelemetry/resources';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

export interface OtelConfig {
    serviceName: string;
    instanceId?: string;
    environment?: string;
    endpoint?: string;
}

let started: NodeSDK | null = null;

export function initOtel(config: OtelConfig): NodeSDK {
    if (started) {
        return started;
    }

    const endpoint = (config.endpoint || process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318').replace(/\/$/, '');

    const resource = new Resource({
        'service.name': config.serviceName,
        'service.instance.id': config.instanceId || process.env.INSTANCE_ID || '1',
        'deployment.environment': config.environment || process.env.DEPLOYMENT_ENVIRONMENT || 'local',
    });

    const sdk = new NodeSDK({
        resource,
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

    process.on('SIGTERM', () => {
        sdk.shutdown().finally(() => process.exit(0));
    });

    return sdk;
}
