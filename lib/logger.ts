/**
 * Logger utility for consistent logging across the application
 * 
 * In development: Logs to console
 * In production: Suppresses debug logs, could be extended to send to external service
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  prefix?: string;
  data?: unknown;
}

const isDev = process.env.NODE_ENV !== 'production';

function formatMessage(level: LogLevel, message: string, options?: LoggerOptions): string {
  const timestamp = new Date().toISOString();
  const prefix = options?.prefix ? `[${options.prefix}]` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${prefix} ${message}`;
}

export const logger = {
  /**
   * Debug logs - only shown in development
   */
  debug: (message: string, options?: LoggerOptions): void => {
    if (isDev) {
      console.log(formatMessage('debug', message, options), options?.data ?? '');
    }
  },

  /**
   * Info logs - shown in all environments for operational visibility
   */
  info: (message: string, options?: LoggerOptions): void => {
    console.info(formatMessage('info', message, options), options?.data ?? '');
  },

  /**
   * Warning logs - shown in all environments
   */
  warn: (message: string, options?: LoggerOptions): void => {
    console.warn(formatMessage('warn', message, options), options?.data ?? '');
  },

  /**
   * Error logs - shown in all environments
   * In production, could be extended to send to error tracking service (Sentry, etc.)
   */
  error: (message: string, error?: unknown, options?: LoggerOptions): void => {
    const errorDetails = error instanceof Error 
      ? { name: error.name, message: error.message, stack: isDev ? error.stack : undefined }
      : error;
    
    console.error(formatMessage('error', message, options), errorDetails ?? '');
    
    // TODO: In production, send to error tracking service
    // if (!isDev && typeof window !== 'undefined') {
    //   // Sentry.captureException(error);
    // }
  },

  /**
   * Performance timing logs - only in development
   */
  perf: (label: string, durationMs: number, options?: LoggerOptions): void => {
    if (isDev) {
      console.log(`[PERF] ${options?.prefix ? `[${options.prefix}] ` : ''}${label} | ${durationMs.toFixed(2)}ms`);
    }
  },
};

/**
 * Client-side logger (safe to use in browser)
 * Prevents sensitive data from being logged in production
 */
export const clientLogger = {
  debug: (message: string, data?: unknown): void => {
    if (isDev && typeof window !== 'undefined') {
      console.log(`[DEBUG] ${message}`, data ?? '');
    }
  },

  info: (message: string, data?: unknown): void => {
    if (isDev && typeof window !== 'undefined') {
      console.info(`[INFO] ${message}`, data ?? '');
    }
  },

  warn: (message: string, data?: unknown): void => {
    if (typeof window !== 'undefined') {
      console.warn(`[WARN] ${message}`, data ?? '');
    }
  },

  error: (message: string, error?: unknown): void => {
    if (typeof window !== 'undefined') {
      const errorInfo = error instanceof Error ? error.message : error;
      console.error(`[ERROR] ${message}`, isDev ? error : errorInfo);
    }
  },
};

export default logger;
