import { redirect } from 'next/navigation';
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
 * NOTE: Middleware handles the initial cookie check and callbackUrl.
 * This layout provides a second layer of validation using DB session check.
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth check - runs BEFORE render
  const user = await getCurrentUser();

  if (!user) {
    // Redirect to login (middleware already set callbackUrl)
    // This catches expired sessions that had valid cookies
    redirect('/login');
  }

  // User is authenticated - render protected content
  return <>{children}</>;
}
