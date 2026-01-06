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
 * In-memory fallback rate limiter for when Redis is unavailable
 * Uses a simple sliding window approach with automatic cleanup
 */
class InMemoryRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    
    // Cleanup old entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  async limit(identifier: string): Promise<{ success: boolean; reset?: number }> {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get existing requests for this identifier
    let timestamps = this.requests.get(identifier) || [];
    
    // Filter to only requests within the window
    timestamps = timestamps.filter(ts => ts > windowStart);
    
    if (timestamps.length >= this.maxRequests) {
      const oldestInWindow = Math.min(...timestamps);
      const reset = oldestInWindow + this.windowMs;
      return { success: false, reset };
    }
    
    // Add current request
    timestamps.push(now);
    this.requests.set(identifier, timestamps);
    
    return { success: true };
  }

  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    for (const [key, timestamps] of this.requests.entries()) {
      const valid = timestamps.filter(ts => ts > windowStart);
      if (valid.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, valid);
      }
    }
  }
}

// Fallback in-memory limiters (used when Redis unavailable)
const inMemoryAuthLimit = new InMemoryRateLimiter(10, 60 * 1000); // 10 per minute
const inMemoryApiLimit = new InMemoryRateLimiter(60, 60 * 1000);  // 60 per minute
const inMemoryWriteLimit = new InMemoryRateLimiter(30, 60 * 1000); // 30 per minute
const inMemoryCronLimit = new InMemoryRateLimiter(1, 60 * 1000);   // 1 per minute

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
 * Falls back to in-memory rate limiting when Redis is unavailable
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string,
  fallbackType: 'auth' | 'api' | 'write' | 'cron' = 'api'
): Promise<{ success: boolean; error?: string; reset?: number }> {
  // Use Redis limiter if available
  if (limiter) {
    const { success, reset } = await limiter.limit(identifier);
    if (!success) {
      return {
        success: false,
        error: 'Too many requests. Please try again later.',
        reset,
      };
    }
    return { success: true };
  }

  // Fallback to in-memory limiter
  const fallbackLimiter = {
    auth: inMemoryAuthLimit,
    api: inMemoryApiLimit,
    write: inMemoryWriteLimit,
    cron: inMemoryCronLimit,
  }[fallbackType];

  const { success, reset } = await fallbackLimiter.limit(identifier);
  
  if (!success) {
    console.log(`[RateLimit] In-memory fallback blocked request for ${identifier} (type: ${fallbackType})`);
    return {
      success: false,
      error: 'Too many requests. Please try again later.',
      reset,
    };
  }

  return { success: true };
}
