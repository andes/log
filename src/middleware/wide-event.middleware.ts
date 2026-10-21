import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { Logger } from '../logger/logger.interface';

interface WideEvent {
    request_id: string;
    timestamp: string;
    method: string;
    path: string;
    'service.instance.id': string;
    'deployment.environment': string;
    version: string;
    status_code?: number;
    outcome?: 'success' | 'error';
    duration_ms?: number;
    error?: Record<string, unknown>;
    [key: string]: unknown;
}

const SAMPLE_RATE = parseFloat(process.env.LOG_SAMPLE_RATE || '0.05');
const SLOW_THRESHOLD_MS = parseInt(process.env.LOG_SLOW_THRESHOLD_MS || '1000', 10);

function shouldSample(wideEvent: WideEvent): boolean {
    if ((wideEvent.status_code as number) >= 400) {
        return true;
    }
    if (wideEvent.error) {
        return true;
    }
    if ((wideEvent.duration_ms as number) > SLOW_THRESHOLD_MS) {
        return true;
    }
    return Math.random() < SAMPLE_RATE;
}

export function wideEventMiddleware(logger: Logger) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const startTime = Date.now();

        const wideEvent: WideEvent = {
            request_id: (req.headers['x-request-id'] as string) || randomUUID(),
            timestamp: new Date().toISOString(),
            method: req.method,
            path: req.path,
            'service.instance.id': process.env.INSTANCE_ID || '1',
            'deployment.environment': process.env.DEPLOYMENT_ENVIRONMENT || 'local',
            version: process.env.npm_package_version || 'unknown',
        };

        req.request_id = wideEvent.request_id;
        res.locals.wideEvent = wideEvent;
        res.setHeader('X-Request-Id', wideEvent.request_id);

        res.on('finish', () => {
            wideEvent.status_code = res.statusCode;
            wideEvent.outcome = res.statusCode >= 400 ? 'error' : 'success';
            wideEvent.duration_ms = Date.now() - startTime;

            if (shouldSample(wideEvent)) {
                const data = wideEvent as unknown as Record<string, unknown>;
                if ((wideEvent.status_code as number) >= 500) {
                    logger.logError(
                        new Error(`HTTP ${wideEvent.status_code} ${wideEvent.path}`),
                        data,
                    );
                } else if ((wideEvent.status_code as number) >= 400) {
                    logger.logWarn(`HTTP ${wideEvent.status_code} ${wideEvent.path}`, data);
                } else {
                    logger.logInfo('canonical_log_line', data);
                }
            }
        });

        next();
    };
}
