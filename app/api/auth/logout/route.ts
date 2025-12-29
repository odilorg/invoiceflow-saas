import { NextRequest, NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth';

/**
 * Logout endpoint - POST only
 *
 * Security considerations:
 * - POST-only (prevents CSRF-style logout via GET links)
 * - Idempotent (safe to call even if already logged out)
 * - No-cache headers (prevents browser/proxy caching)
 * - Calls deleteSession() which:
 *   - Deletes session from database (best-effort)
 *   - Clears session cookie (always)
 *   - Safe even if session doesn't exist
 */
export async function POST(req: NextRequest) {
  // Delete session from DB and clear cookie
  await deleteSession();

  // Return success response with no-cache headers
  const response = NextResponse.json({ success: true });

  // Prevent caching of logout response
  // (ensures logout can't be "undone" by browser back button)
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
}
