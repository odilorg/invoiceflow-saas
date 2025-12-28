// Simple in-memory rate limiter for login attempts
// For production at scale, use Redis or a proper rate limiting service

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const loginAttempts = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of loginAttempts.entries()) {
    if (now > entry.resetAt) {
      loginAttempts.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number; // Time window in milliseconds
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { maxAttempts: 5, windowMs: 15 * 60 * 1000 } // 5 attempts per 15 minutes
): RateLimitResult {
  const now = Date.now();
  const entry = loginAttempts.get(identifier);

  // No previous attempts or window has expired
  if (!entry || now > entry.resetAt) {
    const resetAt = now + config.windowMs;
    loginAttempts.set(identifier, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
      resetAt,
    };
  }

  // Within the window
  if (entry.count >= config.maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Increment count
  entry.count++;
  loginAttempts.set(identifier, entry);

  return {
    allowed: true,
    remaining: config.maxAttempts - entry.count,
    resetAt: entry.resetAt,
  };
}

export function resetRateLimit(identifier: string): void {
  loginAttempts.delete(identifier);
}
