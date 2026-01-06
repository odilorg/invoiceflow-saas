import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Content Security Policy for the application
 * Allows inline scripts/styles for Next.js functionality
 */
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires these
  "style-src 'self' 'unsafe-inline'", // Tailwind inline styles
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.lemonsqueezy.com", // Billing API
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

/**
 * Apply security headers to all API and dashboard responses
 *
 * Security headers:
 * - Content-Security-Policy: Prevent XSS and injection attacks
 * - X-Frame-Options: Prevent clickjacking
 * - X-Content-Type-Options: Prevent MIME sniffing
 * - Referrer-Policy: Control referrer information
 * - Permissions-Policy: Disable unnecessary browser features
 * - Strict-Transport-Security: Enforce HTTPS
 */
function applySecurityHeaders(res: NextResponse) {
  // CSP header
  res.headers.set('Content-Security-Policy', CSP_DIRECTIVES);
  
  // Prevent clickjacking
  res.headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME sniffing
  res.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Control referrer information
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Disable unnecessary browser features
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Enforce HTTPS (only in production)
  if (process.env.NODE_ENV === 'production') {
    res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  return res;
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // LIGHTWEIGHT AUTH CHECK: Cookie presence only (no DB query)
  // Protected routes requiring authentication
  if (path.startsWith('/dashboard')) {
    const sessionToken = request.cookies.get('session_token')?.value;

    // Compute callbackUrl for ALL dashboard requests (not just redirects)
    // This allows server layout to reuse it for expired sessions
    const fullPath = request.nextUrl.pathname + request.nextUrl.search;

    if (!sessionToken) {
      // No session cookie - immediate redirect (faster than waiting for server layout)
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', fullPath);

      const redirectRes = NextResponse.redirect(loginUrl);
      // Apply security headers even to redirect responses
      applySecurityHeaders(redirectRes);
      // Avoid caching redirects
      redirectRes.headers.set('Cache-Control', 'no-store');
      return redirectRes;
    }

    // Cookie exists - forward callbackUrl to server layout via custom header
    // (in case session is expired and server layout needs to redirect)
    const response = NextResponse.next();
    response.headers.set('x-callback-url', fullPath);
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    applySecurityHeaders(response);
    return response;
  }

  // API routes - strict no-cache + security headers
  if (path.startsWith('/api/')) {
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    applySecurityHeaders(response);
    return response;
  }

  // Public routes - add security headers
  const response = NextResponse.next();
  applySecurityHeaders(response);
  return response;
}

export const config = {
  // Run middleware on API, dashboard, and public routes
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
