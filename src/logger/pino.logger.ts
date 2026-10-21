import type { Logger as PinoLoggerType } from 'pino';
import { context, trace } from '@opentelemetry/api';
import { Logger } from './logger.interface';
import { initOtel } from '../otel/otel';

let baseLogger: PinoLoggerType | null = null;

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

/** Carga diferida: el SDK OTel debe start() antes del primer require('pino'). */
function loadPino(): typeof import('pino') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('pino');
}

function loadPinoHttp(): typeof import('pino-http') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('pino-http');
}

function traceMixin(): Record<string, string> {
    const span = trace.getSpan(context.active());
    if (!span) {
        return {};
    }
    const { traceId, spanId } = span.spanContext();
    if (!traceId || traceId === '00000000000000000000000000000000') {
        return {};
    }
    return { trace_id: traceId, span_id: spanId };
}

function buildPinoOptions(config: {
    serviceName: string;
    level?: string;
    instanceId?: string;
    environment?: string;
}) {
    return {
        name: config.serviceName,
        level: config.level || process.env.LOG_LEVEL || 'info',
        base: {
            'service.name': config.serviceName,
            'service.instance.id': config.instanceId || process.env.INSTANCE_ID || '1',
            'deployment.environment': config.environment || process.env.DEPLOYMENT_ENVIRONMENT || 'local',
            host: process.env.HOSTNAME || 'unknown',
        },
        mixin: traceMixin,
        formatters: {
            level: (label: string) => ({ level: label }),
        },
        redact: {
            paths: REDACT_PATHS,
            censor: '[REDACTED]',
        },
    };
}

export function setBaseLogger(logger: PinoLoggerType): void {
    baseLogger = logger;
}

/**
 * Inicializa OTel (OTLP → Alloy) y luego Pino.
 * Preferible: `node --require @andes/log/register` para instrumentar antes
 * de cualquier otro import de la app.
 */
export function initObservability(config: ObservabilityConfig): PinoLoggerType {
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

export function initLogger(config: LoggerConfig): PinoLoggerType {
    const pino = loadPino();
    const logger = pino(buildPinoOptions(config));
    setBaseLogger(logger);
    return logger;
}

/**
 * Access log vía pino-http. Por defecto **no** loguea cada request
 * (`autoLogging` off) para no duplicar el wide event.
 * Activar con `LOG_HTTP_ACCESS=true` o `autoLogging: true` en options.
 */
export function httpMiddleware(options: Record<string, unknown> = {}) {
    const mod = loadPinoHttp() as unknown as { default?: typeof import('pino-http'); };
    const pinoHttp = (mod.default || mod) as typeof import('pino-http');
    const accessOn = process.env.LOG_HTTP_ACCESS === 'true' || process.env.LOG_HTTP_ACCESS === '1';
    return (pinoHttp as unknown as (opts: Record<string, unknown>) => unknown)({
        logger: getBaseLogger(),
        autoLogging: accessOn,
        ...options,
    });
}

function getBaseLogger(): PinoLoggerType {
    if (baseLogger) {
        return baseLogger;
    }
    const pino = loadPino();
    return pino(
        buildPinoOptions({
            serviceName: process.env.SERVICE_NAME || 'unknown',
        })
    );
}

export function createLogger(module: string): Logger {
    const pinoInstance = getBaseLogger().child({ module });
    return new PinoLogger(pinoInstance);
}

export class PinoLogger implements Logger {
    private logger: PinoLoggerType;

    constructor(logger: PinoLoggerType) {
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
