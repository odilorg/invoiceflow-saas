/**
 * Performance measurement utilities for baseline testing
 * TEMPORARY: Remove after optimization is validated
 */

export interface PerformanceLog {
  route: string;
  operation: string;
  durationMs: number;
  recordCount?: number;
  timestamp: string;
}

const performanceLogs: PerformanceLog[] = [];

export function timeQuery<T>(
  route: string,
  operation: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = performance.now();

  return queryFn().then((result) => {
    const end = performance.now();
    const durationMs = Math.round((end - start) * 100) / 100;

    const log: PerformanceLog = {
      route,
      operation,
      durationMs,
      recordCount: Array.isArray(result) ? result.length : undefined,
      timestamp: new Date().toISOString(),
    };

    performanceLogs.push(log);

    // Log to console for easy capture
    console.log(
      `[PERF] ${route} | ${operation} | ${durationMs}ms${
        log.recordCount !== undefined ? ` | ${log.recordCount} records` : ''
      }`
    );

    return result;
  });
}

export function getPerformanceLogs(): PerformanceLog[] {
  return [...performanceLogs];
}

export function clearPerformanceLogs(): void {
  performanceLogs.length = 0;
}
