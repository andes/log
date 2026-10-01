export interface Logger {
    logError(error: Error, context?: Record<string, unknown>): void;
    logInfo(message: string, data?: Record<string, unknown>): void;
    logWarn(message: string, data?: Record<string, unknown>): void;
}
