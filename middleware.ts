import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

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