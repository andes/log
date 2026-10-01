import pino from 'pino';
import pinoHttp from 'pino-http';
import { trace, context } from '@opentelemetry/api';
import { Logger } from './logger.interface';
import { initOtel } from '../otel/otel';

let baseLogger: pino.Logger | null = null;

export interface LoggerConfig {
    serviceName: string;
    level?: string;
    instanceId?: string;
    environment?: string;
}

export interface ObservabilityConfig extends LoggerConfig {
    otlpEndpoint?: string;
    enableOtel?: boolean;
}

const REDACT_PATHS = [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.headers["x-api-key"]',
    'res.headers["set-cookie"]',
];

export function setBaseLogger(logger: pino.Logger): void {
    baseLogger = logger;
}

export function initObservability(config: ObservabilityConfig): pino.Logger {
    if (config.enableOtel !== false) {
        initOtel({
            serviceName: config.serviceName,
            instanceId: config.instanceId,
            environment: config.environment,
            endpoint: config.otlpEndpoint,
        });
    }
    return initLogger(config);
}

export function initLogger(config: LoggerConfig): pino.Logger {
    const logger = pino({
        name: config.serviceName,
        level: config.level || process.env.LOG_LEVEL || 'info',
        base: {
            'service.name': config.serviceName,
            'service.instance.id': config.instanceId || process.env.INSTANCE_ID || '1',
            'deployment.environment': config.environment || process.env.DEPLOYMENT_ENVIRONMENT || 'local',
            host: process.env.HOSTNAME || 'unknown',
        },
        formatters: {
            level: (label) => ({ level: label }),
        },
        redact: {
            paths: REDACT_PATHS,
            censor: '[REDACTED]',
        },
        mixin() {
            const span = trace.getSpan(context.active());
            if (!span) return {};
            const sc = span.spanContext();
            return { trace_id: sc.traceId, span_id: sc.spanId };
        },
    });
    setBaseLogger(logger);
    return logger;
}

export function httpMiddleware() {
    return pinoHttp({ logger: getBaseLogger() });
}

function getBaseLogger(): pino.Logger {
    if (baseLogger) {
        return baseLogger;
    }
    return pino({
        name: 'andes-log',
        level: process.env.LOG_LEVEL || 'info',
        base: {
            'service.name': process.env.SERVICE_NAME || 'unknown',
            'service.instance.id': process.env.INSTANCE_ID || '1',
            'deployment.environment': process.env.DEPLOYMENT_ENVIRONMENT || 'local',
            host: process.env.HOSTNAME || 'unknown',
        },
        formatters: {
            level: (label) => ({ level: label }),
        },
        redact: {
            paths: REDACT_PATHS,
            censor: '[REDACTED]',
        },
        mixin() {
            const span = trace.getSpan(context.active());
            if (!span) return {};
            const sc = span.spanContext();
            return { trace_id: sc.traceId, span_id: sc.spanId };
        },
    });
}

export function createLogger(module: string): Logger {
    const pinoInstance = getBaseLogger().child({ module });
    return new PinoLogger(pinoInstance);
}

export class PinoLogger implements Logger {
    private logger: pino.Logger;

    constructor(logger: pino.Logger) {
        this.logger = logger;
    }

    logError(error: Error, context?: Record<string, unknown>): void {
        this.logger.error({ err: error.message, stack: error.stack, ...context }, error.message);
    }

    logInfo(message: string, data?: Record<string, unknown>): void {
        this.logger.info(data || {}, message);
    }

    logWarn(message: string, data?: Record<string, unknown>): void {
        this.logger.warn(data || {}, message);
    }
}
