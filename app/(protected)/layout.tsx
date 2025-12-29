import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getCurrentUser } from '@/lib/auth';

/**
 * Server-side authentication guard for protected routes
 *
 * This layout wraps all routes in the (protected) group and enforces
 * authentication BEFORE any HTML is sent to the client.
 *
 * Benefits:
 * - Zero flash of protected content for unauthenticated users
 * - Server-side redirect (works without JavaScript)
 * - No race conditions or client-side auth checks
 *
 * Flow:
 * 1. Middleware checks cookie presence (fast)
 * 2. If no cookie → redirect with callbackUrl
 * 3. If cookie exists → forward callbackUrl via x-callback-url header
 * 4. This layout validates session in DB
 * 5. If invalid → redirect using callbackUrl from header
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth check - runs BEFORE render
  const user = await getCurrentUser();

  if (!user) {
    // Session invalid (expired cookie) - redirect with callbackUrl preservation
    // Read callbackUrl from custom header set by middleware
    const headersList = await headers();
    const callbackUrl = headersList.get('x-callback-url') || '/dashboard';

    // Redirect to login with preserved destination
    const loginUrl = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    redirect(loginUrl);
  }

  // User is authenticated - render protected content
  return <>{children}</>;
}
