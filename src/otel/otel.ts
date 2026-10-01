import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

export interface OtelConfig {
    serviceName: string;
    instanceId?: string;
    environment?: string;
    endpoint?: string;
}

export function initOtel(config: OtelConfig): NodeSDK {
    const endpoint = (config.endpoint || process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318').replace(/\/$/, '');

    const sdk = new NodeSDK({
        resource: new Resource({
            'service.name': config.serviceName,
            'service.instance.id': config.instanceId || process.env.INSTANCE_ID || '1',
            'deployment.environment': config.environment || process.env.DEPLOYMENT_ENVIRONMENT || 'local',
        }),
        traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
        metricReader: new PeriodicExportingMetricReader({
            exporter: new OTLPMetricExporter({ url: `${endpoint}/v1/metrics` }),
            exportIntervalMillis: 5000,
        }),
        instrumentations: [
            getNodeAutoInstrumentations({
                '@opentelemetry/instrumentation-fs': { enabled: false },
            }),
        ],
    });

    sdk.start();

    process.on('SIGTERM', () => {
        sdk.shutdown().finally(() => process.exit(0));
    });

    return sdk;
}
