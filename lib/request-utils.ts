import { NextRequest } from 'next/server';
import crypto from 'crypto';

/**
 * Extract client IP address from request headers
 * Handles various proxy configurations (nginx, cloudflare, etc.)
 */
export function getClientIp(req: NextRequest): string {
  // Check X-Forwarded-For (common with proxies)
  // Use the LAST entry - it's set by the trusted proxy (nginx).
  // The first entry is client-controlled and can be spoofed.
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    return ips[ips.length - 1];
  }
  
  // Check X-Real-IP (nginx)
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  
  // Check CF-Connecting-IP (Cloudflare)
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp.trim();
  }
  
  return 'unknown';
}

/**
 * Timing-safe comparison for secrets (prevents timing attacks)
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  
  // Ensure both strings have the same length to compare
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  
  if (aBuffer.length !== bBuffer.length) {
    // Still do a comparison to maintain constant time
    crypto.timingSafeEqual(aBuffer, aBuffer);
    return false;
  }
  
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

/**
 * Verify cron authorization header with timing-safe comparison
 */
export function verifyCronAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization') || '';
  const expectedAuth = `Bearer ${process.env.CRON_SECRET || ''}`;
  
  return timingSafeEqual(authHeader, expectedAuth);
}
