import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // LIGHTWEIGHT AUTH CHECK: Cookie presence only (no DB query)
  // Protected routes requiring authentication
  if (path.startsWith('/dashboard')) {
    const sessionToken = request.cookies.get('session_token')?.value;

    if (!sessionToken) {
      // No session cookie - immediate redirect (faster than waiting for server layout)
      // Preserve full path including query parameters
      const fullPath = request.nextUrl.pathname + request.nextUrl.search;
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', fullPath);
      return NextResponse.redirect(loginUrl);
    }
    // Cookie exists - let server layout validate session in DB
  }

  // Only process API and dashboard routes - skip everything else for performance
  if (!path.startsWith('/api/') && !path.startsWith('/dashboard')) {
    // For public pages (home, login, register), allow normal caching
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // API routes - strict no-cache
  if (path.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  // Dashboard pages - private, no cache for authenticated content
  else if (path.startsWith('/dashboard')) {
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('X-Frame-Options', 'DENY'); // Security: prevent clickjacking
    response.headers.set('X-Content-Type-Options', 'nosniff'); // Security: prevent MIME sniffing
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};