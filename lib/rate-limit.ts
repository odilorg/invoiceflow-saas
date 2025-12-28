import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis client (only if credentials are available)
const redis = process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_URL,
      token: process.env.UPSTASH_REDIS_TOKEN,
    })
  : null;

/**
 * Rate limiter for authentication endpoints
 * - 10 requests per minute per identifier (IP + email)
 * - Prevents brute force attacks
 */
export const authRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
      prefix: 'ratelimit:auth',
    })
  : null;

/**
 * Rate limiter for general API endpoints
 * - 60 requests per minute per user
 * - Prevents API abuse
 */
export const apiRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      analytics: true,
      prefix: 'ratelimit:api',
    })
  : null;

/**
 * Rate limiter for write operations
 * - 30 requests per minute per user
 * - Stricter limit for POST/PATCH/DELETE
 */
export const writeRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '1 m'),
      analytics: true,
      prefix: 'ratelimit:write',
    })
  : null;

/**
 * Rate limiter for cron endpoints
 * - 1 request per minute
 * - Prevents spam triggering
 */
export const cronRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1, '1 m'),
      analytics: true,
      prefix: 'ratelimit:cron',
    })
  : null;

/**
 * Helper to check rate limit and return consistent error
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ success: boolean; error?: string; reset?: number }> {
  // If no Redis configured, allow (development mode)
  if (!limiter) {
    return { success: true };
  }

  const { success, limit, reset, remaining } = await limiter.limit(identifier);

  if (!success) {
    return {
      success: false,
      error: 'Too many requests. Please try again later.',
      reset,
    };
  }

  return { success: true };
}
