import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DashboardShellClient } from './DashboardShellClient';

/**
 * Dashboard Layout (Server Component)
 *
 * Server-side auth protection - runs BEFORE sending any HTML to client.
 * Completely eliminates flash of protected content for unauthenticated users.
 *
 * Flow:
 * 1. getCurrentUser() checks session server-side
 * 2. If no user -> redirect to /login (happens before render)
 * 3. If authenticated -> fetch user data and pass to client shell
 * 4. Client shell handles UI interactivity only (no auth)
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth check - runs BEFORE any HTML is sent
  const user = await getCurrentUser();

  if (!user) {
    // Not authenticated - redirect to login
    // Middleware already set callbackUrl via cookie check
    redirect('/login');
  }

  // Fetch subscription data to determine plan status
  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: {
      status: true,
      isActive: true,
    },
  });

  const planStatus: 'FREE' | 'PAID' = subscription?.isActive ? 'PAID' : 'FREE';

  // Pass user + planStatus to client component for UI rendering
  return (
    <DashboardShellClient user={user} planStatus={planStatus}>
      {children}
    </DashboardShellClient>
  );
}
