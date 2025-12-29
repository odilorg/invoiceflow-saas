import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Apply security headers to all API and dashboard responses
 *
 * Security headers:
 * - X-Frame-Options: Prevent clickjacking
 * - X-Content-Type-Options: Prevent MIME sniffing
 * - Referrer-Policy: Control referrer information
 * - Permissions-Policy: Disable unnecessary browser features
 */
function applySecurityHeaders(res: NextResponse) {
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
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

  // API routes - strict no-cache
  if (path.startsWith('/api/')) {
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    applySecurityHeaders(response);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  // Only run middleware on API and dashboard routes (performance optimization)
  matcher: ['/dashboard/:path*', '/api/:path*'],
};